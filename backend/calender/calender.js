const express = require('express');
const router = express.Router();
const db = require('../connection'); // promise-based (mysql2/promise)

// ✅ Get all events
router.get("/", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM calendar_event");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Add event
router.post("/", async (req, res) => {
  try {
    const { title, category, startDate, endDate, details, employee_id } = req.body;
    console.log(req.body);
    const sql = `
      INSERT INTO calendar_event (title, category, start_date, end_date, details, employee_id) 
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const [result] = await db.query(sql, [title, category, startDate, endDate, details, employee_id]);
    res.json({ id: result.insertId, title, category, startDate, endDate, details, employee_id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Update event
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, startDate, endDate, details, employee_id } = req.body;
    console.log(req.body);
    const sql = `
      UPDATE calendar_event 
      SET title=?, category=?, start_date=?, end_date=?, details=?, employee_id=? 
      WHERE id=?
    `;
    await db.query(sql, [title, category, startDate, endDate, details, employee_id, id]);
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Delete event
router.delete("/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM calendar_event WHERE id=?", [req.params.id]);
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
