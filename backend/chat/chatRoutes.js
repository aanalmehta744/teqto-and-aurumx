// const express = require("express");
// const router = express.Router();
// const db = require("../connection");
// const { getIO } = require("../socket");
// const { createUpload } = require("../cloudinary");
// const upload = createUpload("chat_attachments");

// // ---------------------------------------------------------------------
// // Tracks when each employee last read each conversation, so unread
// // counts survive logout/offline instead of only working live via socket.
// // ---------------------------------------------------------------------

// (async () => {
//   try {
//     await db.query(`CREATE TABLE IF NOT EXISTS conversation_reads (
//       conversation_id INT NOT NULL,
//       employee_id INT NOT NULL,
//       last_read_at DATETIME NOT NULL DEFAULT '1970-01-01 00:00:00',
//       PRIMARY KEY (conversation_id, employee_id)
//     )`);
//   } catch (error) {
//     console.error("conversation_reads table create error:", error.message);
//   }
// })();

// router.get("/users", async (req, res) => {
// try {
// const [users] = await db.query(
//   "SELECT id,fullName,role,email FROM employees"
// );


// res.status(200).json(users);


// } catch (error) {
// console.error("Chat Users Error:", error);

// res.status(500).json({
//   message: "Failed to fetch users"
// });


// }
// });

// router.post("/conversation/direct", async (req, res) => {
// try {
// const { user1, user2 } = req.body;


// if (!user1 || !user2) {
//   return res.status(400).json({
//     error: "Both users are required"
//   });
// }

// const [rows] = await db.query(
//   "SELECT c.id " +
//   "FROM conversations c " +
//   "JOIN conversation_members cm1 ON c.id = cm1.conversation_id " +
//   "JOIN conversation_members cm2 ON c.id = cm2.conversation_id " +
//   "WHERE c.type = 'direct' " +
//   "AND ( " +
//   "(cm1.employee_id = ? AND cm2.employee_id = ?) " +
//   "OR " +
//   "(cm1.employee_id = ? AND cm2.employee_id = ?) " +
//   ")",
//   [user1, user2, user2, user1]
// );

// if (rows.length > 0) {
//   return res.status(200).json({
//     conversationId: rows[0].id
//   });
// }

// const [conversation] = await db.query(
//   "INSERT INTO conversations (type, created_by) VALUES ('direct', ?)",
//   [user1]
// );

// const conversationId = conversation.insertId;

// await db.query(
//   "INSERT INTO conversation_members (conversation_id, employee_id) VALUES (?, ?), (?, ?)",
//   [conversationId, user1, conversationId, user2]
// );

// res.status(201).json({
//   conversationId
// });


// } catch (error) {
// console.error("Direct Conversation Error:", error);


// res.status(500).json({
//   error: "Internal server error"
// });


// }
// });

// router.post("/conversation/group", async (req, res) => {
// const connection = await db.getConnection();

// try {
// const { name, created_by, members } = req.body;


// if (!name || !created_by || !Array.isArray(members)) {
//   return res.status(400).json({
//     error: "Missing required fields"
//   });
// }

// await connection.beginTransaction();

// const [groupResult] = await connection.query(
//   "INSERT INTO conversations (name, type, created_by) VALUES (?, 'group', ?)",
//   [name, created_by]
// );

// const conversationId = groupResult.insertId;

// const uniqueMembers = Array.from(
//   new Set([...members, created_by])
// );

// const memberRows = uniqueMembers.map(memberId => [
//   conversationId, memberId
// ]);

// await connection.query(
//   "INSERT INTO conversation_members (conversation_id, employee_id) VALUES ?",
//   [memberRows]
// );

// await connection.commit();

// res.status(201).json({
//   conversationId
// });


// } catch (error) {
// await connection.rollback();


// console.error("Group Conversation Error:", error);

// res.status(500).json({
//   error: "Internal server error"
// });


// } finally {
// connection.release();
// }
// });

// router.post("/message", (req, res, next) => {
//   upload.single("attachment")(req, res, (err) => {
//     if (err) {
//       console.error("Upload Error:", err);
//       return res.status(400).json({ error: err.message || "File upload failed" });
//     }
//     next();
//   });
// }, async (req, res) => {
// try {
// const conversation_id = Number(req.body.conversation_id);
// const sender_id = Number(req.body.sender_id);
// const message = req.body.message;

// const trimmedMessage = (message || "").trim();
// const attachmentUrl = req.file ? (req.file.path || req.file.filename) : null;
// const attachmentType = req.file ? req.file.mimetype : null;

// if (
//   !conversation_id ||
//   !sender_id ||
//   (!trimmedMessage && !attachmentUrl)
// ) {
//   return res.status(400).json({
//     error: "Missing required fields"
//   });
// }

// const [member] = await db.query(
//   "SELECT id FROM conversation_members WHERE conversation_id = ? AND employee_id = ?",
//   [conversation_id, sender_id]
// );

// if (member.length === 0) {
//   return res.status(403).json({
//     error: "You are not a member of this conversation"
//   });
// }

// const [result] = await db.query(
//   "INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type) VALUES (?, ?, ?, ?, ?)",
//   [
//     conversation_id,
//     sender_id,
//     trimmedMessage,
//     attachmentUrl,
//     attachmentType
//   ]
// );

// const createdAt = new Date();

// const io = getIO();

// io.to(`conversation_${conversation_id}`)
//   .emit("receive_message", {
//     id: result.insertId,
//     conversation_id,
//     sender_id,
//     message: trimmedMessage,
//     attachment_url: attachmentUrl,
//     attachment_type: attachmentType,
//     created_at: createdAt
//   });

// res.status(201).json({
//   messageId: result.insertId,
//   attachment_url: attachmentUrl,
//   attachment_type: attachmentType,
//   created_at: createdAt
// });


// } catch (error) {
// console.error("Message Error:", error);


// res.status(500).json({
//   error: "Internal server error"
// });


// }
// });

// router.get("/message/:conversationId", async (req, res) => {
// try {
// const { conversationId } = req.params;


// const [messages] = await db.query(
//   "SELECT " +
//   "m.id, " +
//   "m.message, " +
//   "m.attachment_url, " +
//   "m.attachment_type, " +
//   "m.created_at, " +
//   "m.sender_id, " +
//   "e.fullName AS sender_name " +
//   "FROM messages m " +
//   "JOIN employees e ON e.id = m.sender_id " +
//   "WHERE m.conversation_id = ? " +
//   "ORDER BY m.created_at ASC",
//   [conversationId]
// );

// res.status(200).json(messages);


// } catch (error) {
// console.error("Get Messages Error:", error);


// res.status(500).json({
//   error: "Internal server error"
// });


// }
// });

// // ---------------------------------------------------------------------
// // GET USER CONVERSATIONS
// // Adds other_employee_id for 'direct' conversations so the frontend
// // can map a sidebar contact to its conversation id without having to
// // call /conversation/direct (which auto-creates a row) just to check.
// // Adds unread_count, computed from messages sent by someone else after
// // this employee's last_read_at, so unread badges survive being offline.
// // ---------------------------------------------------------------------

// router.get("/conversations/:employeeId", async (req, res) => {
// try {
// const { employeeId } = req.params;


// const [rows] = await db.query(
//   "SELECT c.*, " +
//   "( " +
//   "  SELECT cm2.employee_id " +
//   "  FROM conversation_members cm2 " +
//   "  WHERE cm2.conversation_id = c.id " +
//   "  AND cm2.employee_id != ? " +
//   "  LIMIT 1 " +
//   ") AS other_employee_id, " +
//   "( " +
//   "  SELECT COUNT(*) " +
//   "  FROM messages m " +
//   "  WHERE m.conversation_id = c.id " +
//   "  AND m.sender_id != ? " +
//   "  AND m.created_at > COALESCE(cr.last_read_at, '1970-01-01 00:00:00') " +
//   ") AS unread_count " +
//   "FROM conversations c " +
//   "JOIN conversation_members cm ON c.id = cm.conversation_id " +
//   "LEFT JOIN conversation_reads cr " +
//   "  ON cr.conversation_id = c.id " +
//   "  AND cr.employee_id = cm.employee_id " +
//   "WHERE cm.employee_id = ? " +
//   "ORDER BY c.created_at DESC",
//   [employeeId, employeeId, employeeId]
// );

// res.status(200).json(rows);


// } catch (error) {
// console.error("Conversation List Error:", error);


// res.status(500).json({
//   error: "Internal server error"
// });


// }
// });

// // ---------------------------------------------------------------------
// // MARK CONVERSATION AS READ
// // Called by the client whenever the employee opens a conversation.
// // ---------------------------------------------------------------------

// router.post("/read", async (req, res) => {
// try {
// const conversation_id = Number(req.body.conversation_id);
// const employee_id = Number(req.body.employee_id);

// if (!conversation_id || !employee_id) {
//   return res.status(400).json({
//     error: "conversation_id and employee_id are required"
//   });
// }

// await db.query(
//   "INSERT INTO conversation_reads (conversation_id, employee_id, last_read_at) " +
//   "VALUES (?, ?, NOW()) " +
//   "ON DUPLICATE KEY UPDATE last_read_at = NOW()",
//   [conversation_id, employee_id]
// );

// // Let the other person's screen update their sent messages to
// // "seen" live, without needing to refresh.
// const io = getIO();

// io.to(`conversation_${conversation_id}`)
//   .emit("conversation_read", {
//     conversation_id,
//     employee_id,
//     last_read_at: new Date()
//   });

// res.status(200).json({ success: true });


// } catch (error) {
// console.error("Mark Read Error:", error);


// res.status(500).json({
//   error: "Internal server error"
// });


// }
// });

// // ---------------------------------------------------------------------
// // READ STATUS
// // Returns when the OTHER member of a direct conversation last read it,
// // used to show single/double tick on your own sent messages.
// // ---------------------------------------------------------------------

// router.get("/read-status/:conversationId/:employeeId", async (req, res) => {
// try {
// const { conversationId, employeeId } = req.params;

// const [rows] = await db.query(
//   "SELECT last_read_at FROM conversation_reads " +
//   "WHERE conversation_id = ? AND employee_id != ? " +
//   "LIMIT 1",
//   [conversationId, employeeId]
// );

// res.status(200).json({
//   last_read_at: rows.length > 0 ? rows[0].last_read_at : null
// });


// } catch (error) {
// console.error("Read Status Error:", error);


// res.status(500).json({
//   error: "Internal server error"
// });


// }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const db = require("../connection");
const { getIO } = require("../socket");
const { createUpload } = require("../cloudinary");
const https = require("https");
const upload = createUpload("chat_attachments");

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

(async () => {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS chat_requests (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,
      status ENUM('pending','accepted','rejected') NOT NULL DEFAULT 'pending',
      conversation_id INT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      responded_at TIMESTAMP NULL,
      UNIQUE KEY unique_pair (sender_id, receiver_id)
    )`);
  } catch (error) {
    console.error("chat_requests table create error:", error.message);
  }
})();

(async () => {
  try {
    await db.query(`ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(255) NULL`);
  } catch (error) {}
})();

router.get("/online-status", async (req, res) => {
  try {
    const io = getIO();
    const [employees] = await db.query("SELECT id FROM employees");
    const status = {};

    employees.forEach((emp) => {
      const room = io.sockets.adapter.rooms.get(`user_${emp.id}`);
      status[emp.id] = !!(room && room.size > 0);
    });

    res.status(200).json(status);

  } 
  catch (error) {console.error("Online Status Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

router.get("/users", async (req, res) => {
  try {
    const [users] = await db.query("SELECT id,fullName,role,email,uploadImg FROM employees");
    res.status(200).json(users);
  }
  catch (error) {
    console.error("Chat Users Error:", error);
    res.status(500).json({message: "Failed to fetch users"});
  }
});

router.get("/search", async (req, res) => {
  try {
    const { q, employeeId } = req.query;

    if (!q || !employeeId) {
      return res.status(400).json({error: "q and employeeId are required"});
    }

    const [rows] = await db.query(
      "SELECT id, fullName, role, email, uploadImg FROM employees " +
      "WHERE fullName LIKE ? AND id != ? " +
      "ORDER BY fullName ASC " +
      "LIMIT 20",
      [`%${q}%`, employeeId]
    );
    res.status(200).json(rows);
  } 
  catch (error) {
    console.error("Search Users Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

router.post("/conversation/direct", async (req, res) => {
  try {
    const { user1, user2 } = req.body;

    if (!user1 || !user2) {
      return res.status(400).json({error: "Both users are required"});
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
      return res.status(200).json({conversationId: rows[0].id});
    }

    return res.status(404).json({
      error: "No conversation exists yet. Send a chat request first.",
      requiresRequest: true
    });
  } 
  catch (error) {
    console.error("Direct Conversation Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

router.post("/request", async (req, res) => {
  try {
    const sender_id = Number(req.body.sender_id);
    const receiver_id = Number(req.body.receiver_id);

    if (!sender_id || !receiver_id || sender_id === receiver_id) {
      return res.status(400).json({error: "Valid sender_id and receiver_id are required"});
    }

    const [existingConvo] = await db.query(
      "SELECT c.id " +
      "FROM conversations c " +
      "JOIN conversation_members cm1 ON c.id = cm1.conversation_id " +
      "JOIN conversation_members cm2 ON c.id = cm2.conversation_id " +
      "WHERE c.type = 'direct' " +
      "AND ((cm1.employee_id = ? AND cm2.employee_id = ?) OR (cm1.employee_id = ? AND cm2.employee_id = ?))",
      [sender_id, receiver_id, receiver_id, sender_id]
    );

    if (existingConvo.length > 0) {
      return res.status(200).json({status: "already_conversation", conversationId: existingConvo[0].id});
    }

    const [existingReq] = await db.query(
      "SELECT * FROM chat_requests WHERE " +
      "(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
      [sender_id, receiver_id, receiver_id, sender_id]
    );

    if (existingReq.length > 0) {
      const existing = existingReq[0];
      if (existing.status === "pending") {
        return res.status(200).json({status: "pending", requestId: existing.id});
      }

      if (existing.status === "accepted" && existing.conversation_id) {
        return res.status(200).json({status: "already_conversation",conversationId: existing.conversation_id});
      }

      await db.query(
        "UPDATE chat_requests SET sender_id = ?, receiver_id = ?, status = 'pending', " +
        "conversation_id = NULL, responded_at = NULL, created_at = NOW() WHERE id = ?",
        [sender_id, receiver_id, existing.id]
      );

      const io = getIO();
      io.to(`user_${receiver_id}`).emit("chat_request_received", {id: existing.id,sender_id,receiver_id});
      return res.status(201).json({status: "pending", requestId: existing.id});
    }

    const [result] = await db.query(
      "INSERT INTO chat_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
      [sender_id, receiver_id]
    );

    const io = getIO();
    io.to(`user_${receiver_id}`).emit("chat_request_received", {id: result.insertId,sender_id,receiver_id});
    res.status(201).json({status: "pending",requestId: result.insertId});

  } 
  catch (error) {
    console.error("Chat Request Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});


router.get("/requests/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const [incoming] = await db.query(
      "SELECT r.id, r.sender_id, r.status, r.created_at, " +
      "e.fullName AS sender_name, e.role AS sender_role " +
      "FROM chat_requests r " +
      "JOIN employees e ON e.id = r.sender_id " +
      "WHERE r.receiver_id = ? AND r.status = 'pending' " +
      "ORDER BY r.created_at DESC",
      [employeeId]
    );

    const [outgoing] = await db.query(
      "SELECT r.id, r.receiver_id, r.status, r.created_at, " +
      "e.fullName AS receiver_name, e.role AS receiver_role " +
      "FROM chat_requests r " +
      "JOIN employees e ON e.id = r.receiver_id " +
      "WHERE r.sender_id = ? AND r.status = 'pending' " +
      "ORDER BY r.created_at DESC",
      [employeeId]
    );

    res.status(200).json({incoming, outgoing});
  } 
  catch (error) {
    console.error("Get Requests Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});


router.post("/request/respond", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const requestId = Number(req.body.request_id);
    const employeeId = Number(req.body.employee_id); 
    const action = req.body.action; 

    if (!requestId || !employeeId || !["accept", "reject"].includes(action)) {
      connection.release();
      return res.status(400).json({
        error: "request_id, employee_id and a valid action are required"
      });
    }

    const [rows] = await connection.query("SELECT * FROM chat_requests WHERE id = ?",[requestId]);

    if (rows.length === 0) {
      connection.release();
      return res.status(404).json({error: "Request not found"});
    }

    const request = rows[0];

    if (request.receiver_id !== employeeId) {
      connection.release();
      return res.status(403).json({error: "Not authorized to respond to this request"});
    }

    if (request.status !== "pending") {
      connection.release();
      return res.status(400).json({error: "Request already handled"});
    }

    if (action === "reject") {
      await connection.query("UPDATE chat_requests SET status = 'rejected', responded_at = NOW() WHERE id = ?",[requestId]);
      connection.release();
      const io = getIO();

      io.to(`user_${request.sender_id}`).emit("chat_request_rejected", {
        request_id: requestId,
        receiver_id: request.receiver_id
      });

      return res.status(200).json({status: "rejected"});
    }

    try {
      await connection.beginTransaction();
      const [conversation] = await connection.query("INSERT INTO conversations (type, created_by) VALUES ('direct', ?)",[request.sender_id]);
      const conversationId = conversation.insertId;

      await connection.query("INSERT INTO conversation_members (conversation_id, employee_id) VALUES (?, ?), (?, ?)",
        [conversationId, request.sender_id, conversationId, request.receiver_id]
      );

      await connection.query("UPDATE chat_requests SET status = 'accepted', conversation_id = ?, responded_at = NOW() WHERE id = ?",[conversationId, requestId]);
      await connection.commit();
      const io = getIO();
      io.in(`user_${request.sender_id}`).socketsJoin(`conversation_${conversationId}`);
      io.in(`user_${request.receiver_id}`).socketsJoin(`conversation_${conversationId}`);
      io.to(`user_${request.sender_id}`).emit("chat_request_accepted", {request_id: requestId,conversationId,by_employee_id: request.receiver_id});
      res.status(200).json({status: "accepted",conversationId});
    } 
    catch (innerError) {
      await connection.rollback();
      throw innerError;
    }
  } 
  catch (error) {
    console.error("Respond Request Error:", error);
    res.status(500).json({error: "Internal server error"});
  } finally {connection.release();}
});

router.post("/conversation/group", async (req, res) => {
  const connection = await db.getConnection();

  try {
    const { name, created_by, members } = req.body;

    if (!name || !created_by || !Array.isArray(members)) {
      return res.status(400).json({error: "Missing required fields"});
    }
    await connection.beginTransaction();

    const [groupResult] = await connection.query(
      "INSERT INTO conversations (name, type, created_by) VALUES (?, 'group', ?)",
      [name, created_by]
    );
    const conversationId = groupResult.insertId;

    const uniqueMembers = Array.from(new Set([...members, created_by]));
    const memberRows = uniqueMembers.map(memberId => [conversationId, memberId]);

    await connection.query(
      "INSERT INTO conversation_members (conversation_id, employee_id) VALUES ?",
      [memberRows]
    );

    await connection.commit();

    res.status(201).json({conversationId});
  } 
  catch (error) {
    await connection.rollback();
    console.error("Group Conversation Error:", error);
    res.status(500).json({error: "Internal server error"});
  } finally {connection.release();}
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
    const attachmentName = req.file ? req.file.originalname : null;

    if (!conversation_id ||!sender_id ||(!trimmedMessage && !attachmentUrl)) {
      return res.status(400).json({error: "Missing required fields"});
    }

    const [member] = await db.query(
      "SELECT id FROM conversation_members WHERE conversation_id = ? AND employee_id = ?",
      [conversation_id, sender_id]
    );

    if (member.length === 0) {
      return res.status(403).json({error: "You are not a member of this conversation"});
    }

    const [result] = await db.query(
      "INSERT INTO messages (conversation_id, sender_id, message, attachment_url, attachment_type, attachment_name) VALUES (?, ?, ?, ?, ?, ?)",
      [conversation_id,sender_id,trimmedMessage,attachmentUrl,attachmentType,attachmentName]
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
      attachment_name: attachmentName,
      created_at: createdAt
    });

    res.status(201).json({
      messageId: result.insertId,
      attachment_url: attachmentUrl,
      attachment_type: attachmentType,
      attachment_name: attachmentName,
      created_at: createdAt
    });
  } 
  catch (error) {
    console.error("Message Error:", error);
    res.status(500).json({error: "Internal server error"});
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
      "m.attachment_name, " +
      "m.created_at, " +
      "m.sender_id, " +
      "e.fullName AS sender_name, " +
      "e.uploadImg AS sender_avatar " +
      "FROM messages m " +
      "JOIN employees e ON e.id = m.sender_id " +
      "WHERE m.conversation_id = ? " +
      "ORDER BY m.created_at ASC",
      [conversationId]
    );

    res.status(200).json(messages);
  } 
  catch (error) {
    console.error("Get Messages Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

router.get("/download/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const [rows] = await db.query(
      "SELECT attachment_url, attachment_name, attachment_type FROM messages WHERE id = ?",
      [messageId]
    );

    if (rows.length === 0 || !rows[0].attachment_url) {
      return res.status(404).json({error: "Attachment not found"});
    }

    const { attachment_url, attachment_name, attachment_type } = rows[0];
    const downloadName = (attachment_name || "download").replace(/"/g, "");

    https.get(attachment_url, (fileRes) => {
      if (fileRes.statusCode !== 200) {
        return res.status(502).json({error: "Failed to fetch attachment"});
      }

      res.setHeader("Content-Disposition",`attachment; filename="${downloadName}"`);
      if (attachment_type) {res.setHeader("Content-Type", attachment_type);}
      fileRes.pipe(res);

    })
    .on("error", (err) => {
      console.error("Download Proxy Error:", err);
      res.status(500).json({error: "Internal server error"});
    });
  } 
  catch (error) {
    onsole.error("Download Route Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

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
      ") AS unread_count, " +
      "( " +
      "  SELECT MAX(m2.created_at) " +
      "  FROM messages m2 " +
      "  WHERE m2.conversation_id = c.id " +
      ") AS last_message_at " +
      "FROM conversations c " +
      "JOIN conversation_members cm ON c.id = cm.conversation_id " +
      "LEFT JOIN conversation_reads cr " +
      "  ON cr.conversation_id = c.id " +
      "  AND cr.employee_id = cm.employee_id " +
      "WHERE cm.employee_id = ? " +
      "ORDER BY COALESCE(last_message_at, c.created_at) DESC",
      [employeeId, employeeId, employeeId]
    );

    res.status(200).json(rows);

  } 
  catch (error) {
    console.error("Conversation List Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

router.post("/read", async (req, res) => {
  try {
    const conversation_id = Number(req.body.conversation_id);
    const employee_id = Number(req.body.employee_id);

    if (!conversation_id || !employee_id) {
      return res.status(400).json({error: "conversation_id and employee_id are required"});
    }

    await db.query(
      "INSERT INTO conversation_reads (conversation_id, employee_id, last_read_at) " +
      "VALUES (?, ?, NOW()) " +
      "ON DUPLICATE KEY UPDATE last_read_at = NOW()",
      [conversation_id, employee_id]
    );

    const io = getIO();
    io.to(`conversation_${conversation_id}`)
    .emit("conversation_read", { conversation_id,employee_id,last_read_at: new Date()});
    res.status(200).json({ success: true });
  } 
  catch (error) {
    console.error("Mark Read Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

router.get("/read-status/:conversationId/:employeeId", async (req, res) => {
  try {
    const { conversationId, employeeId } = req.params;
    const [rows] = await db.query(
      "SELECT last_read_at FROM conversation_reads " +
      "WHERE conversation_id = ? AND employee_id != ? " +
      "LIMIT 1",
      [conversationId, employeeId]
    );

    res.status(200).json({last_read_at: rows.length > 0 ? rows[0].last_read_at : null});
  } 
  catch (error) {
    console.error("Read Status Error:", error);
    res.status(500).json({error: "Internal server error"});
  }
});

module.exports = router;