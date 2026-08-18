const express = require('express');
const router = express.Router();
const db = require('../connection');
const { createUpload } = require('../cloudinary');

const upload = createUpload('login-settings');

// Ensure heading & description columns exist (migration)
// (async () => {
//   await db.query(`ALTER TABLE login_page_settings ADD COLUMN heading VARCHAR(255) NULL`).catch(() => {});
//   await db.query(`ALTER TABLE login_page_settings ADD COLUMN description TEXT NULL`).catch(() => {});
// })();
(async () => {
  try {
    await db.query(`
      ALTER TABLE login_page_settings
      ADD COLUMN heading VARCHAR(255) NULL
    `);
    console.log('✅ heading column added');
  } catch (err) {
    console.log('heading migration:', err.message);
  }

  try {
    await db.query(`
      ALTER TABLE login_page_settings
      ADD COLUMN description TEXT NULL
    `);
    console.log('✅ description column added');
  } catch (err) {
    console.log('description migration:', err.message);
  }
})();
router.get('/test', async (req, res) => {
  console.log('🔥 LOGIN SETTINGS TEST HIT');

  try {
    const [rows] = await db.query('SELECT 1 AS test');

    console.log('✅ DATABASE TEST:', rows);

    return res.json({
      success: true,
      message: 'Login settings API and database are working',
      database: rows,
    });
  } catch (err) {
    console.error('❌ DATABASE TEST FAILED');
    console.error('Message:', err.message);
    console.error('Code:', err.code);
    console.error('Stack:', err.stack);

    return res.status(500).json({
      success: false,
      error: err.message,
      code: err.code || null,
    });
  }
});

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

// POST update login page settings
// router.post('/', upload.single('image'), async (req, res) => {
//   const { heading, description, updated_by } = req.body;

//   try {
//     const [existing] = await db.query(
//       `SELECT image_path FROM login_page_settings ORDER BY id DESC LIMIT 1`
//     );

//     let imagePath = existing[0]?.image_path || null;

//     if (req.file) {
//       // Cloudinary returns the full URL in req.file.path
//       imagePath = req.file.path;
//     }

//     const [rows] = await db.query(`SELECT id FROM login_page_settings LIMIT 1`);

//     if (rows.length > 0) {
//       await db.query(
//         `UPDATE login_page_settings SET image_path = ?, heading = ?, description = ?, updated_by = ?, updated_at = NOW() WHERE id = ?`,
//         [imagePath, heading || null, description || null, updated_by || null, rows[0].id]
//       );
//     } else {
//       await db.query(
//         `INSERT INTO login_page_settings (image_path, heading, description, updated_by, updated_at) VALUES (?, ?, ?, ?, NOW())`,
//         [imagePath, heading || null, description || null, updated_by || null]
//       );
//     }

//     res.json({ message: 'Login page settings updated', image_path: imagePath, heading, description });
//   } catch (err) {
//     console.error('Error updating login settings:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
// POST update login page settings
router.post('/', (req, res) => {
  upload.single('image')(req, res, async (uploadError) => {

    // Catch Cloudinary / Multer errors
    if (uploadError) {
      console.error('❌ Upload error:', uploadError);
      return res.status(500).json({
        success: false,
        error: uploadError.message || 'Image upload failed',
      });
    }

    try {
      console.log('====================================');
      console.log('LOGIN SETTINGS POST');
      console.log('BODY:', req.body);
      console.log('FILE:', req.file);
      console.log('====================================');

      const {
        heading = null,
        description = null,
        updated_by = null,
      } = req.body || {};

      const [existing] = await db.query(`
        SELECT image_path
        FROM login_page_settings
        ORDER BY id DESC
        LIMIT 1
      `);

      let imagePath = existing[0]?.image_path || null;

      // Only replace image when a new image was uploaded
      if (req.file) {
        imagePath = req.file.path;
      }

      const [rows] = await db.query(`
        SELECT id
        FROM login_page_settings
        ORDER BY id ASC
        LIMIT 1
      `);

      if (rows.length > 0) {

        await db.query(
          `
          UPDATE login_page_settings
          SET
            image_path = ?,
            heading = ?,
            description = ?,
            updated_by = ?,
            updated_at = NOW()
          WHERE id = ?
          `,
          [
            imagePath,
            heading,
            description,
            updated_by,
            rows[0].id,
          ]
        );

      } else {

        await db.query(
          `
          INSERT INTO login_page_settings
          (
            image_path,
            heading,
            description,
            updated_by,
            updated_at
          )
          VALUES (?, ?, ?, ?, NOW())
          `,
          [
            imagePath,
            heading,
            description,
            updated_by,
          ]
        );
      }

      console.log('✅ Login settings updated successfully');

      return res.status(200).json({
        success: true,
        message: 'Login page settings updated successfully',
        image_path: imagePath,
        heading,
        description,
        updated_by,
      });

    } catch (err) {

      console.error('====================================');
      console.error('❌ LOGIN SETTINGS DATABASE ERROR');
      console.error('Message:', err.message);
      console.error('Code:', err.code);
      console.error('SQL State:', err.sqlState);
      console.error('Stack:', err.stack);
      console.error('====================================');

      return res.status(500).json({
        success: false,
        error: err.message,
        code: err.code || null,
      });
    }
  });
});

module.exports = router;
