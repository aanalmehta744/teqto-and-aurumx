const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../connection');

router.use(express.json());


// =========================================================
// TABLE + DEFAULT SEED
// =========================================================

(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS hr_call_statuses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await db.query('SELECT COUNT(*) AS cnt FROM hr_call_statuses');
    if (rows[0].cnt === 0) {
      for (const name of ['Pending', 'Done', 'No Response']) {
        await db.query('INSERT IGNORE INTO hr_call_statuses (name) VALUES (?)', [name]);
      }
    }
  } catch (err) {
    console.error('hr_call_statuses init failed:', err.message);
  }
})();


// =========================================================
// AUTH: Admin or HR only (from token role/department)
// =========================================================

function requireAdminOrHR(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    const user = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecret');
    const role = String(user?.role || '').trim().toLowerCase();
    const dept = String(user?.department || '').trim().toLowerCase();
    if (role !== 'admin' && dept !== 'hr' && dept !== 'hr coordinator') {
      return res.status(403).json({ message: 'Only Admin and HR can manage HR call options.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}


// =========================================================
// GET ALL (open to any request, like departments)
// =========================================================

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, created_at, updated_at FROM hr_call_statuses ORDER BY name ASC'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch HR call options', error: err.message });
  }
});


// =========================================================
// CREATE
// =========================================================

router.post('/', requireAdminOrHR, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Name is required' });
  if (name.length > 100) return res.status(400).json({ message: 'Name is too long' });
  try {
    const [result] = await db.query('INSERT INTO hr_call_statuses (name) VALUES (?)', [name]);
    const [rows] = await db.query(
      'SELECT id, name, created_at, updated_at FROM hr_call_statuses WHERE id = ?',
      [result.insertId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That option already exists' });
    }
    res.status(500).json({ message: 'Failed to create option', error: err.message });
  }
});


// =========================================================
// UPDATE
// =========================================================

router.put('/:id', requireAdminOrHR, async (req, res) => {
  const id = Number(req.params.id);
  const name = String(req.body.name || '').trim();
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
  if (!name) return res.status(400).json({ message: 'Name is required' });
  try {
    const [existing] = await db.query('SELECT name FROM hr_call_statuses WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Option not found' });

    await db.query('UPDATE hr_call_statuses SET name = ? WHERE id = ?', [name, id]);

    // Keep already-saved interviews in sync with the renamed option.
    await db.query(
      'UPDATE interviews SET hr_call_status = ? WHERE hr_call_status = ?',
      [name, existing[0].name]
    );

    const [rows] = await db.query(
      'SELECT id, name, created_at, updated_at FROM hr_call_statuses WHERE id = ?',
      [id]
    );
    res.json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ message: 'That option already exists' });
    }
    res.status(500).json({ message: 'Failed to update option', error: err.message });
  }
});


// =========================================================
// DELETE
// =========================================================

router.delete('/:id', requireAdminOrHR, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid id' });
  try {
    const [existing] = await db.query('SELECT name FROM hr_call_statuses WHERE id = ?', [id]);
    if (!existing.length) return res.status(404).json({ message: 'Option not found' });

    await db.query('DELETE FROM hr_call_statuses WHERE id = ?', [id]);
    res.json({ message: 'Option deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete option', error: err.message });
  }
});


module.exports = router;
