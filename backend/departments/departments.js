const express = require('express');
const router = express.Router();
const db = require('../connection');
const jwt = require('jsonwebtoken');

async function requireAdminOrHR(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Authentication required' });
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecret');
    // The login token carries the user id as `id` (only the password-reset
    // token uses `userId`), so read `id` here — otherwise the lookup finds no
    // user and returns 401, which bounces the client back to the login page.
    const userId = decoded.id ?? decoded.userId;
    const [[user]] = await db.query('SELECT role, department FROM employees WHERE id = ?', [userId]);
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (String(user.role).toLowerCase() !== 'admin' && String(user.department).toLowerCase() !== 'hr') {
      return res.status(403).json({ message: 'Only Admin and HR can manage departments' });
    }
    req.currentUser = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired authentication token' });
  }
}

router.use(express.json());

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name, created_at, updated_at FROM departments ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch departments', error: err.message });
  }
});

router.post('/', requireAdminOrHR, async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ message: 'Department name is required' });
  if (name.length > 100) return res.status(400).json({ message: 'Department name is too long' });
  try {
    const [result] = await db.query('INSERT INTO departments (name) VALUES (?)', [name]);
    const [rows] = await db.query('SELECT id, name, created_at, updated_at FROM departments WHERE id = ?', [result.insertId]);
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'Department already exists' });
    res.status(500).json({ message: 'Failed to create department', error: err.message });
  }
});

router.delete('/:id', requireAdminOrHR, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ message: 'Invalid department id' });
  try {
    const [deptRows] = await db.query('SELECT name FROM departments WHERE id = ?', [id]);
    if (!deptRows.length) return res.status(404).json({ message: 'Department not found' });
    const name = deptRows[0].name;
    const [employees] = await db.query('SELECT COUNT(*) AS count FROM employees WHERE LOWER(TRIM(department)) = LOWER(TRIM(?))', [name]);
    if (Number(employees[0].count) > 0) {
      return res.status(409).json({ message: `Cannot delete ${name}. ${employees[0].count} employee(s) are assigned to this department.` });
    }
    await db.query('DELETE FROM departments WHERE id = ?', [id]);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete department', error: err.message });
  }
});

module.exports = router;
