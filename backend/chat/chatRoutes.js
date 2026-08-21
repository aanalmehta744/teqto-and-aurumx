const express = require("express");
const router = express.Router();
const db = require("../connection");
const { getIO } = require("../socket");
const { createUpload } = require("../cloudinary");
const upload = createUpload("chat_attachments");

// ---------------------------------------------------------------------
// Tracks when each employee last read each conversation, so unread
// counts survive logout/offline instead of only working live via socket.
// ---------------------------------------------------------------------

(async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS conversation_reads (
      conversation_id INT NOT NULL,
      employee_id INT NOT NULL,
      last_read_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',
      PRIMARY KEY (conversation_id, employee_id)
    )`);
  } catch (error) {
    console.error("conversation_reads table create error:", error.message);
  }
})();

router.get("/users", async (req, res) => {
try {
const [users] = await db.query(
  "SELECT id,fullName,role,email FROM employees"
);


res.status(200).json(users);


} catch (error) {
console.error("Chat Users Error:", error);

res.status(500).json({
  message: "Failed to fetch users"
});


}
});

router.post("/conversation/direct", async (req, res) => {
try {
const { user1, user2 } = req.body;


if (!user1 || !user2) {
  return res.status(400).json({
    error: "Both users are required"
  });
}

const [rows] = await db.query(
  "SELECT c.id " +
  "FROM conversations c " +
  "JOIN conversation_members cm1 ON c.id = cm1.conversation_id " +
  "JOIN conversation_members cm2 ON c.id = cm2.conversation_id " +
  "WHERE c.type = 'direct' " +
  "AND ( " +
  "(cm1.employee_id = ? AND cm2.employee_id = ?) " +
  "OR " +
  "(cm1.employee_id = ? AND cm2.employee_id = ?) " +
  ")",
  [user1, user2, user2, user1]
);

if (rows.length > 0) {
  return res.status(200).json({
    conversationId: rows[0].id
  });
}

const [conversation] = await db.query(
  "INSERT INTO conversations (type, created_by) VALUES ('direct', ?)",
  [user1]
);

const conversationId = conversation.insertId;

await db.query(
  "INSERT INTO conversation_members (conversation_id, employee_id) VALUES (?, ?), (?, ?)",
  [conversationId, user1, conversationId, user2]
);

res.status(201).json({
  conversationId
});


} catch (error) {
console.error("Direct Conversation Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

router.post("/conversation/group", async (req, res) => {
const connection = await db.getConnection();

try {
const { name, created_by, members } = req.body;


if (!name || !created_by || !Array.isArray(members)) {
  return res.status(400).json({
    error: "Missing required fields"
  });
}

await connection.beginTransaction();

const [groupResult] = await connection.query(
  "INSERT INTO conversations (name, type, created_by) VALUES (?, 'group', ?)",
  [name, created_by]
);

const conversationId = groupResult.insertId;

const uniqueMembers = Array.from(
  new Set([...members, created_by])
);

const memberRows = uniqueMembers.map(memberId => [
  conversationId, memberId
]);

await connection.query(
  "INSERT INTO conversation_members (conversation_id, employee_id) VALUES ?",
  [memberRows]
);

await connection.commit();

res.status(201).json({
  conversationId
});


} catch (error) {
await connection.rollback();


console.error("Group Conversation Error:", error);

res.status(500).json({
  error: "Internal server error"
});


} finally {
connection.release();
}
});

router.post("/message", (req, res, next) => {
  upload.single("attachment")(req, res, (err) => {
    if (err) {
      console.error("Upload Error:", err);
      return res.status(400).json({ error: err.message || "File upload failed" });
    }
    next();
  });
}, async (req, res) => {
try {
const conversation_id = Number(req.body.conversation_id);
const sender_id = Number(req.body.sender_id);
const message = req.body.message;

const trimmedMessage = (message || "").trim();
const attachmentUrl = req.file ? (req.file.path || req.file.filename) : null;
const attachmentType = req.file ? req.file.mimetype : null;

if (
  !conversation_id ||
  !sender_id ||
  (!trimmedMessage && !attachmentUrl)
) {
  return res.status(400).json({
    error: "Missing required fields"
  });
}

const [member] = await db.query(
  "SELECT id FROM conversation_members WHERE conversation_id = ? AND employee_id = ?",
  [conversation_id, sender_id]
);

if (member.length === 0) {
  return res.status(403).json({
    error: "You are not a member of this conversation"
  });
}

const [result] = await db.query(
  "INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?)",
  [
    conversation_id,
    sender_id,
    trimmedMessage,
    attachmentUrl,
    attachmentType
  ]
);

const createdAt = new Date();

const io = getIO();

io.to(`conversation_${conversation_id}`)
  .emit("receive_message", {
    id: result.insertId,
    conversation_id,
    sender_id,
    message: trimmedMessage,
    attachment_url: attachmentUrl,
    attachment_type: attachmentType,
    created_at: createdAt
  });

res.status(201).json({
  messageId: result.insertId,
  attachment_url: attachmentUrl,
  attachment_type: attachmentType,
  created_at: createdAt
});


} catch (error) {
console.error("Message Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

router.get("/message/:conversationId", async (req, res) => {
try {
const { conversationId } = req.params;


const [messages] = await db.query(
  "SELECT " +
  "m.id, " +
  "m.message, " +
  "m.attachment_url, " +
  "m.attachment_type, " +
  "m.created_at, " +
  "m.sender_id, " +
  "e.fullName AS sender_name " +
  "FROM messages m " +
  "JOIN employees e ON e.id = m.sender_id " +
  "WHERE m.conversation_id = ? " +
  "ORDER BY m.created_at ASC",
  [conversationId]
);

res.status(200).json(messages);


} catch (error) {
console.error("Get Messages Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

// ---------------------------------------------------------------------
// GET USER CONVERSATIONS
// Adds other_employee_id for 'direct' conversations so the frontend
// can map a sidebar contact to its conversation id without having to
// call /conversation/direct (which auto-creates a row) just to check.
// Adds unread_count, computed from messages sent by someone else after
// this employee's last_read_at, so unread badges survive being offline.
// ---------------------------------------------------------------------

router.get("/conversations/:employeeId", async (req, res) => {
try {
const { employeeId } = req.params;


const [rows] = await db.query(
  "SELECT c.*, " +
  "( " +
  "  SELECT cm2.employee_id " +
  "  FROM conversation_members cm2 " +
  "  WHERE cm2.conversation_id = c.id " +
  "  AND cm2.employee_id != ? " +
  "  LIMIT 1 " +
  ") AS other_employee_id, " +
  "( " +
  "  SELECT COUNT(*) " +
  "  FROM messages m " +
  "  WHERE m.conversation_id = c.id " +
  "  AND m.sender_id != ? " +
  "  AND m.created_at > COALESCE(cr.last_read_at, '1970-01-01 00:00:00') " +
  ") AS unread_count " +
  "FROM conversations c " +
  "JOIN conversation_members cm ON c.id = cm.conversation_id " +
  "LEFT JOIN conversation_reads cr " +
  "  ON cr.conversation_id = c.id " +
  "  AND cr.employee_id = cm.employee_id " +
  "WHERE cm.employee_id = ? " +
  "ORDER BY c.created_at DESC",
  [employeeId, employeeId, employeeId]
);

res.status(200).json(rows);


} catch (error) {
console.error("Conversation List Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

// ---------------------------------------------------------------------
// MARK CONVERSATION AS READ
// Called by the client whenever the employee opens a conversation.
// ---------------------------------------------------------------------

router.post("/read", async (req, res) => {
try {
const conversation_id = Number(req.body.conversation_id);
const employee_id = Number(req.body.employee_id);

if (!conversation_id || !employee_id) {
  return res.status(400).json({
    error: "conversation_id and employee_id are required"
  });
}

await db.query(
  "INSERT INTO conversation_reads (conversation_id, employee_id, last_read_at) " +
  "VALUES (?, ?, NOW()) " +
  "ON DUPLICATE KEY UPDATE last_read_at = NOW()",
  [conversation_id, employee_id]
);

// Let the other person's screen update their sent messages to
// "seen" live, without needing to refresh.
const io = getIO();

io.to(`conversation_${conversation_id}`)
  .emit("conversation_read", {
    conversation_id,
    employee_id,
    last_read_at: new Date()
  });

res.status(200).json({ success: true });


} catch (error) {
console.error("Mark Read Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

// ---------------------------------------------------------------------
// READ STATUS
// Returns when the OTHER member of a direct conversation last read it,
// used to show single/double tick on your own sent messages.
// ---------------------------------------------------------------------

router.get("/read-status/:conversationId/:employeeId", async (req, res) => {
try {
const { conversationId, employeeId } = req.params;

const [rows] = await db.query(
  "SELECT last_read_at FROM conversation_reads " +
  "WHERE conversation_id = ? AND employee_id != ? " +
  "LIMIT 1",
  [conversationId, employeeId]
);

res.status(200).json({
  last_read_at: rows.length > 0 ? rows[0].last_read_at : null
});


} catch (error) {
console.error("Read Status Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

module.exports = router;