const express = require('express');
const router = express.Router();
const db = require('../connection');

// GET all daily updates (no filters)
router.get('/all', async (req, res) => {
    try {
        const [rows] = await db.query(`
        SELECT du.*, e.fullName AS employee_name, e.department, p.projectTitle, t.title AS task_title, t.note AS task_note FROM daily_updates du LEFT JOIN employees e ON du.employee_id = e.id LEFT JOIN projects p ON du.project_id = p.id LEFT JOIN tasks t ON du.task_id = t.id ORDER BY du.update_date DESC;
    `
        );
        res.json(rows);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// GET all daily updates for an employee (optionally filtered by date)
router.get('/', async (req, res) => {
    const employeeId = req.query.employeeId;
    // const date = req.query.date;

    if (!employeeId) {
        return res.status(400).send({ error: "employeeId and date are required" });
    }

    const query = `
        SELECT du.*, 
             p.projectTitle, 
             t.title, 
             t.note
      FROM daily_updates du
      LEFT JOIN projects p ON du.project_id = p.id
      LEFT JOIN tasks t ON du.task_id = t.id
      WHERE du.employee_id = ? ORDER by du.update_date DESC ;
    `;

    try {
        const [rows] = await db.query(query, [employeeId]);  // pass params as array
        res.json(rows);
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});


// POST create a new daily update
router.post('/', async (req, res) => {
    const { employee_id, project_id, task_id, update_date, update_details, status, trainer_project_name } = req.body;
    console.log('Incoming daily update:', req.body);

    // Required fields validation
    if (!employee_id || !update_date || !update_details) {
        return res.status(400).send({ error: 'Missing required fields' });
    }

    // Build query dynamically
    const columns = ['employee_id', 'update_date', 'update_details'];
    const values = [employee_id, update_date, update_details];

    if (project_id) {
        columns.push('project_id');
        values.push(project_id);
    }

    if (task_id) {
        columns.push('task_id');
        values.push(task_id);
    }

    if (status) {
        columns.push('status');
        values.push(status);
    }

    if (trainer_project_name) {   // ✅ add new field if provided
        columns.push('trainer_project_name');
        values.push(trainer_project_name);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO daily_updates (${columns.join(', ')}) VALUES (${placeholders})`;

    try {
        const [result] = await db.query(sql, values);

        // Notify all BDE and BA users about the new daily update
        const [empRow] = await db.query('SELECT fullName FROM employees WHERE id = ?', [employee_id]).catch(() => [[]]);
        const empName = empRow[0]?.fullName || 'An employee';
        const [bdebaUsers] = await db.query("SELECT id, role FROM employees WHERE role IN ('BDE', 'BA')").catch(() => [[]]);
        for (const user of bdebaUsers) {
            await db.query(
                `INSERT INTO notifications (type, message, recipient_id, recipient_role) VALUES (?, ?, ?, ?)`,
                ['daily_update', `${empName} added a daily update`, user.id, user.role]
            ).catch(() => {});
        }

        res.status(201).send({ id: result.insertId, message: "Daily update created" });
    } catch (err) {
        console.error('Insert error:', err.message);
        res.status(500).send({ error: err.message });
    }
});


// PUT update an existing daily update by id
router.put('/:id', async (req, res) => {
    const id = req.params.id;
    const { project_id, update_date, task_id, update_details, status } = req.body;

    try {
        const [result] = await db.query(
            `UPDATE daily_updates SET project_id = ?, update_date = ?, task_id = ?, update_details = ?, status = ? WHERE id = ?`,
            [project_id, update_date, task_id, update_details, status, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send({ error: "Daily update not found" });
        }
        res.send({ message: "Daily update updated" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// DELETE a daily update by id
router.delete('/:id', async (req, res) => {
    const id = req.params.id;
    console.log(id);
    try {
        const [result] = await db.query(
            `DELETE FROM daily_updates WHERE id = ?`,
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send({ error: "Daily update not found" });
        }
        res.send({ message: "Daily update deleted" });
    } catch (err) {
        res.status(500).send({ error: err.message });
    }
});

// PUT: Update project progress by project ID
router.put('/updateProgress/:id', async (req, res) => {
    const projectId = req.params.id;
    const { progress } = req.body;
    console.log(projectId, progress);
    // Validate input
    if (progress === undefined) {
        return res.status(400).send({ error: "Progress must be between 0 and 100" });
    }
    try {
        const [result] = await db.query(
            `UPDATE projects SET progress = ? WHERE id = ?`,
            [progress, projectId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).send({ error: "Project not found" });
        }

        res.send({ message: "Project progress updated successfully" });
    } catch (err) {
        console.error("Error updating project progress:", err.message);
        res.status(500).send({ error: err.message });
    }
});


module.exports = router;
