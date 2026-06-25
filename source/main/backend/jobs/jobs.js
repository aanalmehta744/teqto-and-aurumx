const express = require('express');
const router = express.Router();
const db = require('../connection'); // Ensure the path is correct

// Middleware to parse JSON bodies
router.use(express.json());
// Get all jobs
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM jobs ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get job by id
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ error: 'Job not found' });
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create new job
router.post('/', async (req, res) => {
  try {
    const { title, department, jobType, vacancies, closedVacancies, status, description } = req.body;

    if (!title || !department || !jobType || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const [result] = await db.execute(
      'INSERT INTO jobs (title, department, jobType, vacancies, closedVacancies, status, description) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, department, jobType, vacancies || 0, closedVacancies || 0, status, description]
    );

    res.status(201).json({ id: result.insertId, message: 'Job created successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update job by id
router.put('/:id', async (req, res) => {
  try {
    const { title, department, jobType, vacancies, status, description, closedVacancies } = req.body;
    const id = req.params.id;

    const [result] = await db.execute(
      'UPDATE jobs SET title = ?, department = ?, jobType = ?, vacancies = ?, status = ?, description = ?, closedVacancies = ?  WHERE id = ?',
      [title, department, jobType, vacancies || 0, status, description, closedVacancies || 0, id]
    );

    if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });

    res.json({ message: 'Job updated successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete job by id
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await db.execute('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Job not found' });

    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
// Export the router
module.exports = router;
