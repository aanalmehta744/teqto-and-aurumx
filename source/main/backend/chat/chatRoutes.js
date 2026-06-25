// const express = require("express");
// const router = express.Router();
// const db = require("../connection"); // adjust path if needed

// // Get all employees for chat list
// router.get("/users", async (req, res) => {
//     try {
//         const [users] = await db.query(`
//       SELECT
//         id,
//         fullName,
//         role,
//         email
//       FROM employees
//     `);

//         res.status(200).json(users);
//     } catch (error) {
//         console.error("Chat Users Error:", error);
//         res.status(500).json({
//             message: "Failed to fetch users"
//         });
//     }
// });

// // What it does: Opens a private 1-on-1 chat. It checks if you already have a chat with that person; 
// // if yes, it returns it, and if no, it creates a new 
// router.post('/conversation/direct', async (req, res) => {
//     try {
//         const { user1, user2 } = req.body;

//         // FIX: Destructure rows directly as an array
//         const [rows] = await db.query(

//             "SELECT c.id" +
//             " FROM conversations c" +
//             " JOIN conversation_members cm1 ON c.id = cm1.conversation_id" +
//             " JOIN conversation_members cm2 ON c.id = cm2.conversation_id" +
//             " WHERE c.type = 'direct'" +
//             "   AND ((cm1.employee_id = ? AND cm2.employee_id = ?)" +
//             "    OR(cm1.employee_id = ? AND cm2.employee_id = ?))"
//             ,
//             [user1, user2, user2, user1]
//         );

//         // FIX: Check if the array has elements
//         if (rows.length > 0) {
//             return res.json({ conversationId: rows[0].id });
//         }

//         const [conversation] = await db.query(
//             "INSERT INTO conversations (type, created_by) VALUES ('direct', ?)",
//             [user1]
//         );

//         const conversationId = conversation.insertId;
//         // Grabs the unique, auto-incremented ID of the newly inserted chat row from the database metadata.

//         await db.query(
//             "INSERT INTO conversation_members (conversation_id, employee_id) VALUES (?, ?), (?, ?)",
//             [conversationId, user1, conversationId, user2]
//         );

//         res.status(201).json({ conversationId });
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ error: "Internal server error" }); // Avoid leaking raw error objects
//     }
// });

// // Creates a brand-new group chat with a name, sets you as the creator, 
// // and adds multiple selected team members to the room.
// router.post("/conversation/group", async (req, res) => {
//     // 1. Start a database connection instance for the transaction
//     const connection = await db.getConnection();

//     try {
//         const { name, created_by, members } = req.body;

//         // 2. Input validation: Ensure we have required data
//         if (!name || !created_by || !Array.isArray(members)) {
//             return res.status(400).json({ error: "Missing required fields or invalid members array" });
//         }

//         // 3. Begin Transaction: If anything fails after this, all changes roll back
//         await connection.beginTransaction();

//         // 4. Create the main group conversation row
//         const [groupResult] = await connection.query(
//             "INSERT INTO conversations (name, type, created_by) VALUES (?, 'group', ?)",
//             [name, created_by]
//         );

//         const conversationId = groupResult.insertId;

//         // 5. Deduplicate and ensure creator is part of the group members
//         const uniqueMembers = Array.from(new Set([...members, created_by]));

//         // 6. Format data for a single bulk INSERT: [[id, member1], [id, member2]...]
//         const memberRows = uniqueMembers.map(memberId => [conversationId, memberId]);

//         // 7. Fast bulk-insert execution: Hits the database only ONCE
//         await connection.query(
//             `INSERT INTO conversation_members (conversation_id, employee_id) VALUES ?;`,
//             [memberRows]
//         );

//         // 8. Commit changes permanently to the database
//         await connection.commit();

//         // 9. Send successful response
//         res.status(201).json({ conversationId });

//     } catch (error) {
//         // 10. Undo all database inserts if any step failed above
//         await connection.rollback();

//         console.error("Group creation failed:", error);
//         res.status(500).json({ error: "Internal server error" });
//     } finally {
//         // 11. Always release the connection pool slot back to the database
//         connection.release();
//     }
// });

// // Saves a new text message into a specific conversation, tagging exactly who sent it and when.
// router.post("/message", async (req, res) => {
//   try {
//     const {conversation_id,sender_id,message} = req.body;

//     if (
//       !conversation_id ||
//       !sender_id ||
//       !message ||
//       !message.trim()
//     ) {
//       return res.status(400).json({
//         error: "Missing required fields"
//       });
//     }

//     // Check sender belongs to conversation
//     const [member] = await db.query(
//       "SELECT id FROM conversation_members WHERE conversation_id = ? AND employee_id = ?",
//       [conversation_id, sender_id]
//     );

//     if (member.length === 0) {
//       return res.status(403).json({
//         error: "You are not a member of this conversation"
//       });
//     }

//     const [result] = await db.query(
//       "INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)",
//       [
//         conversation_id,
//         sender_id,
//         message.trim()
//       ]
//     );

//     res.status(201).json({
//       messageId: result.insertId
//     });

//   } catch (error) {
//     console.error("Message insertion failed:", error);

//     res.status(500).json({
//       error: "Internal server error"
//     });
//   }
// });

// router.get("/message/:conversationId", async (req, res) => {
//   try {

//     const { conversationId } = req.params;

//     const [messages] = await db.query(
//       "SELECT " +
//       "m.id, " +
//       "m.message, " +
//       "m.created_at, " +
//       "m.sender_id, " +
//       "e.fullName AS sender_name " +
//       "FROM messages m " +
//       "JOIN employees e ON e.id = m.sender_id " +
//       "WHERE m.conversation_id = ? " +
//       "ORDER BY m.created_at ASC",
//       [conversationId]
//     );

//     res.status(200).json(messages);

//   } catch (error) {
//     console.error(error);

//     res.status(500).json({
//       error: "Internal server error"
//     });
//   }
// });

// router.get("/conversations/:employeeId", async (req, res) => {
//     try {
//         const { employeeId } = req.params;

//         // Validation: Ensure the employee ID parameter is present
//         if (!employeeId) {
//             return res.status(400).json({ error: "Employee ID parameter is required" });
//         }

//         // Multi-line query alternative using an array and .join(" ")
//         const queryText = [
//             "SELECT c.*",
//             "FROM conversations c",
//             "JOIN conversation_members cm ON c.id = cm.conversation_id",
//             "WHERE cm.employee_id = ?",
//             "ORDER BY c.created_at DESC"
//         ].join(" ");

//         // Execute the query
//         const [rows] = await db.query(queryText, [employeeId]);

//         // Send back the user's active conversations list
//         res.json(rows);

//     } catch (error) {
//         console.error("Failed to retrieve conversation list:", error);
//         res.status(500).json({ error: "Internal server error" });
//     }
// });

// module.exports = router;







const express = require("express");
const router = express.Router();

const db = require("../connection");
const { getIO } = require("../socket");

/*                                                                         |
| -------------------------------------------------------------------------- |
| Get All Users                                                              |
| -------------------------------------------------------------------------- |
| */                                                                         

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

 /*                                                                         |
| -------------------------------------------------------------------------- |
| Create / Get Direct Conversation                                           |
| -------------------------------------------------------------------------- |
| */                                                                         

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

 /*                                                                         |
| -------------------------------------------------------------------------- |
| Create Group Conversation                                                  |
| -------------------------------------------------------------------------- |
| */                                                                         

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
// combines the members array with the creator's ID, removes duplicates, 
// and ensures the creator is part of the group.

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

/*                                                                         |
| -------------------------------------------------------------------------- |
| Send Message                                                               |
| -------------------------------------------------------------------------- |
| */                                                                         

router.post("/message", async (req, res) => {
try {
const {
conversation_id,
sender_id,
message
} = req.body;


if (
  !conversation_id ||
  !sender_id ||
  !message ||
  !message.trim()
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
  "INSERT INTO messages (conversation_id, sender_id, message) VALUES (?, ?, ?)",
  [
    conversation_id,
    sender_id,
    message.trim()
  ]
);

const io = getIO();

io.to(`conversation_${conversation_id}`)
  .emit("receive_message", {
    id: result.insertId,
    conversation_id,
    sender_id,
    message: message.trim(),
    created_at: new Date()
  });

res.status(201).json({
  messageId: result.insertId
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

 /*                                                                         |
| -------------------------------------------------------------------------- |
| Get User Conversations                                                     |
| -------------------------------------------------------------------------- |
| */                                                                         

router.get("/conversations/:employeeId", async (req, res) => {
try {
const { employeeId } = req.params;


const [rows] = await db.query(
  "SELECT c.* " +
  "FROM conversations c " +
  "JOIN conversation_members cm ON c.id = cm.conversation_id " +
  "WHERE cm.employee_id = ? " +
  "ORDER BY c.created_at DESC",
  [employeeId]
);

res.status(200).json(rows);


} catch (error) {
console.error("Conversation List Error:", error);


res.status(500).json({
  error: "Internal server error"
});


}
});

module.exports = router;
