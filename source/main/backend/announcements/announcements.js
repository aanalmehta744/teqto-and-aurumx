const express = require('express');
const router = express.Router();
const db = require('../connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/announcements');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET all active announcements (all logged-in users)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT a.*, e.fullName AS created_by_name
       FROM announcements a
       LEFT JOIN employees e ON e.id = a.created_by
       WHERE a.is_active = 1
       ORDER BY a.created_at DESC`
    );
    res.json(rows);
  } catch (err) {
    console.error('Error fetching announcements:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create announcement (admin / HR only – enforced on frontend)
router.post('/', upload.single('image'), async (req, res) => {
  const { title, text, created_by } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  const imagePath = req.file ? req.file.filename : null;

  try {
    const [result] = await db.query(
      `INSERT INTO announcements (title, text, image_path, created_by, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [title || null, text, imagePath, created_by || null]
    );
    res.status(201).json({ id: result.insertId, message: 'Announcement created' });
  } catch (err) {
    console.error('Error creating announcement:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE announcement (admin / HR only – enforced on frontend)
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const [rows] = await db.query('SELECT image_path FROM announcements WHERE id = ?', [id]);
    if (rows.length && rows[0].image_path) {
      const imgFile = path.join(uploadDir, rows[0].image_path);
      if (fs.existsSync(imgFile)) fs.unlinkSync(imgFile);
    }
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
