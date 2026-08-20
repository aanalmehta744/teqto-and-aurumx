const express = require('express');
const router = express.Router();
const db = require('../connection');
const { createUpload } = require('../cloudinary');
const upload = createUpload('resumes');

// Create a new candidate
router.post('/', upload.single('resume'), async (req, res) => {
  try {
    const {
      full_name, mobile, email, linkedin,
      address, gender, experience,
      last_company, last_ctc, job_id, status,remarks } = req.body;
    console.log(req.body);
    const resume = req.file ? (req.file.path || req.file.filename) : '';
    console.log('File received:', req.file);

    const sql = `INSERT INTO candidates
      (full_name, mobile, email, linkedin, address, gender, experience, last_company, last_ctc, resume, job_id, status,remarks)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    const [result] = await db.execute(sql, [
      full_name, mobile, email, linkedin,
      address, gender, experience,
      last_company, last_ctc, resume, job_id, status, remarks
    ]);

    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all candidates
router.get('/', async (req, res) => {
  try {
    const [result] = await db.execute(
      `SELECT
        c.*,
        j.title,
        j.department,
        j.description
    FROM
        candidates c
    INNER JOIN
        jobs j ON c.job_id = j.id`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Get candidate by ID
// Get candidate by ID with job details
router.get('/:id', async (req, res) => {
  try {
    const [result] = await db.execute(
      `SELECT 
        c.*, 
        j.title, 
        j.department, 
        j.description
    FROM 
        candidates c
    INNER JOIN 
        jobs j ON c.job_id = j.id
    WHERE 
        c.id = ?`,
      [req.params.id]
    );

    if (result.length === 0) return res.status(404).json({ message: 'Not found' });
    res.json(result[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update candidate
router.put('/:id', upload.single('resume'), async (req, res) => {
  try {
    const candidateId = req.params.id;
    const {
      full_name, mobile, email, linkedin,
      address, gender, experience,
      last_company, last_ctc, job_id, status,remarks
    } = req.body;
    console.log(req.body);
    const resume = req.file ? (req.file.path || req.file.filename) : null;

    // 1. Get current candidate status
    const [rows] = await db.execute('SELECT status FROM candidates WHERE id = ?', [candidateId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const oldStatus = rows[0].status;

    // 2. Prepare SQL to update, including previous_status
    let sql = `UPDATE candidates SET
      full_name = ?, mobile = ?, email = ?, linkedin = ?, address = ?,
      gender = ?, experience = ?, last_company = ?, last_ctc = ?, job_id = ?, status = ?, previous_status = ?, remarks = ?`;

    const values = [
      full_name, mobile, email, linkedin,
      address, gender, experience, last_company, last_ctc, job_id, status, oldStatus, remarks
    ];

    if (resume) {
      sql += `, resume = ?`;
      values.push(resume);
    }

    sql += ` WHERE id = ?`;
    values.push(candidateId);

    // 3. Execute update
    await db.execute(sql, values);

    res.json({ message: 'Candidate updated successfully' });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Delete candidate
router.delete('/:id', async (req, res) => {
  try {
    await db.execute('DELETE FROM candidates WHERE id = ?', [req.params.id]);
    res.json({ message: 'Candidate deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
