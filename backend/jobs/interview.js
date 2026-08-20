const express = require("express");
const router = express.Router();
const db = require("../connection"); // MySQL connection

// ================================
// Get all interviews (with candidate + job details)
// ================================
router.get("/", async (req, res) => {
    try {
        const [rows] = await db.query(`
      SELECT i.*,
       c.full_name AS candidate_name,
       c.id AS candidate_id,
       j.title AS job_name,
       j.id AS job_id,
       e.fullName AS assigned_employee_name,
       e.id AS assigned_employee_id
FROM interviews i
JOIN candidates c ON i.candidate_id = c.id
JOIN jobs j ON i.job_id = j.id
LEFT JOIN employees e ON i.employee_id = e.id
ORDER BY i.interview_date DESC, i.interview_time DESC;
    `);

        res.json(rows);
    } catch (err) {
        console.error("Error fetching interviews:", err);
        res.status(500).json({ error: "Database error" });
    }
});


// ================================
// Get single interview by ID
// ================================
router.get("/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const [rows] = await db.query("SELECT * FROM interviews WHERE id = ?", [id]);
        if (rows.length === 0) {
            return res.status(404).json({ error: "Interview not found" });
        }
        res.json(rows[0]);
    } catch (err) {
        console.error("Error fetching interview:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// ================================
// Create new interview
// ================================
router.post("/", async (req, res) => {
    const {
        candidate_id,
        job_id,
        interview_date,
        interview_time,
        interview_type,
        mode,
        location,
        status,
        remarks,
        assigned_to,
    } = req.body;

    try {
        const [result] = await db.query(
            `INSERT INTO interviews 
       (candidate_id, job_id, interview_date, interview_time, interview_type, mode, location, status, remarks, employee_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                candidate_id,
                job_id,
                interview_date,
                interview_time,
                interview_type,
                mode || "Offline",
                location || null,
                status || "Scheduled",
                remarks || null,
                assigned_to
            ]
        );
        res.json({ message: "Interview created successfully", id: result.insertId });
    } catch (err) {
        console.error("Error creating interview:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// ================================
// Update interview by ID
// ================================
router.put("/:id", async (req, res) => {
    const { id } = req.params;
    const {
        candidate_id,
        job_id,
        interview_date,
        interview_time,
        interview_type,
        mode,
        location,
        status,
        remarks,
        assigned_to
    } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE interviews SET 
        candidate_id = ?, 
        job_id = ?, 
        interview_date = ?, 
        interview_time = ?, 
        interview_type = ?, 
        mode = ?, 
        location = ?, 
        status = ?, 
        remarks = ?,
        employee_id = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
            [
                candidate_id,
                job_id,
                interview_date,
                interview_time,
                interview_type,
                mode,
                location,
                status,
                remarks,
                assigned_to,
                id,
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Interview not found" });
        }

        res.json({ message: "Interview updated successfully" });
    } catch (err) {
        console.error("Error updating interview:", err);
        res.status(500).json({ error: "Database error" });
    }
});

// ================================
// Delete interview by ID
// ================================
router.delete("/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query("DELETE FROM interviews WHERE id = ?", [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Interview not found" });
        }

        res.json({ message: "Interview deleted successfully" });
    } catch (err) {
        console.error("Error deleting interview:", err);
        res.status(500).json({ error: "Database error" });
    }
});

module.exports = router;
