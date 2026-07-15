const express = require('express');
const router = express.Router();
const db = require('../connection');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads/login-settings');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

// Ensure heading & description columns exist (migration)
(async () => {
  await db.query(`ALTER TABLE login_page_settings ADD COLUMN heading VARCHAR(255) NULL`).catch(() => {});
  await db.query(`ALTER TABLE login_page_settings ADD COLUMN description TEXT NULL`).catch(() => {});
})();

// GET current login page settings (public – used by login page)
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT * FROM login_page_settings ORDER BY id DESC LIMIT 1`
    );
    res.json(rows[0] || { image_path: null, heading: null, description: null });
  } catch (err) {
    console.error('Error fetching login settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST update login page settings (Admin / HR only – enforced on frontend)
router.post('/', upload.single('image'), async (req, res) => {
  const { heading, description, updated_by } = req.body;

  try {
    const [existing] = await db.query(
      `SELECT image_path FROM login_page_settings ORDER BY id DESC LIMIT 1`
    );

    let imagePath = existing[0]?.image_path || null;

    if (req.file) {
      if (imagePath) {
        const oldFile = path.join(uploadDir, imagePath);
        if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
      }
      imagePath = req.file.filename;
    }

    const [rows] = await db.query(`SELECT id FROM login_page_settings LIMIT 1`);

    if (rows.length > 0) {
      await db.query(
        `UPDATE login_page_settings SET image_path = ?, heading = ?, description = ?, updated_by = ?, updated_at = NOW() WHERE id = ?`,
        [imagePath, heading || null, description || null, updated_by || null, rows[0].id]
      );
    } else {
      await db.query(
        `INSERT INTO login_page_settings (image_path, heading, description, updated_by, updated_at) VALUES (?, ?, ?, ?, NOW())`,
        [imagePath, heading || null, description || null, updated_by || null]
      );
    }


    
    res.json({ message: 'Login page settings updated', image_path: imagePath, heading, description });
  } catch (err) {
    console.error('Error updating login settings:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
