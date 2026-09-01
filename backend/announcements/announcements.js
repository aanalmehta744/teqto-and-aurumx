const express = require('express');
const router = express.Router();
const db = require('../connection');
const { createUpload } = require('../cloudinary');
const { getIO } = require('../socket');
const upload = createUpload('announcements');

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

  const imagePath = req.file ? (req.file.path || req.file.filename) : null;

  try {
    const [result] = await db.query(
      `INSERT INTO announcements (title, text, image_path, created_by, is_active, created_at)
       VALUES (?, ?, ?, ?, 1, NOW())`,
      [title || null, text, imagePath, created_by || null]
    );
    // 🔔 Broadcast the new announcement to everyone in real-time.
    try {
      getIO().emit('announcement_created', { id: result.insertId, title: title || null, text });
    } catch (e) { console.error('announcement_created emit failed:', e.message); }

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
    // Cloudinary deletion can be added here if needed
    await db.query('DELETE FROM announcements WHERE id = ?', [id]);
    res.json({ message: 'Announcement deleted' });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
