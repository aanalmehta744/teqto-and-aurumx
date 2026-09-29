const express = require('express');
const router = express.Router();
const db = require('../connection');
const { getIO } = require('../socket');

// GET all daily updates (no filters)
// router.get('/all', async (req, res) => {
//     try {
//         const [rows] = await db.query(`
//         SELECT du.*, e.fullName AS employeeName, e.department, p.projectTitle, t.title, t.note
//         FROM daily_updates du
//         LEFT JOIN employees e ON du.employee_id = e.id
//         LEFT JOIN projects p ON du.project_id = p.id
//         LEFT JOIN tasks t ON du.task_id = t.id
//         ORDER BY du.update_date DESC
//         `);
//         res.json(rows);
//     } catch (err) {
//         res.status(500).send({ error: err.message });
//     }
// });

// GET daily updates based on employee hierarchy
router.get('/', async (req, res) => {
    const employeeId = req.query.employeeId;
    const viewerId = req.query.viewerId;

    // Shared SELECT — aliases match the fields the frontend tables bind to.
    const BASE_SELECT = `
        SELECT
            du.*,
            e.fullName AS employee_name,
            e.department,
            e.role,
            e.employee_level,
            p.projectTitle,
            t.title AS task_title,
            t.note,
            t.assigned_by AS task_assigned_by
        FROM daily_updates du
        LEFT JOIN employees e ON du.employee_id = e.id
        LEFT JOIN projects p ON du.project_id = p.id
        LEFT JOIN tasks t ON du.task_id = t.id
    `;

    // ── Role-scoped "Employee Updates" view (viewerId = the logged-in user) ──
    //   Admin / HR   → all updates
    //   BDE          → updates on projects of clients the BDE owns
    //   Senior BA    → BDE + BA departments + junior/senior employees
    //   Other BA     → BA department only
    if (viewerId) {
        try {
            const [[viewer]] = await db.query(
                `SELECT id, role, department, employee_level FROM employees WHERE id = ?`,
                [viewerId]
            );
            if (!viewer) {
                return res.status(404).send({ error: 'Viewer not found' });
            }

            const vRole = String(viewer.role || '').trim().toLowerCase();
            const vDept = String(viewer.department || '').trim().toLowerCase();
            const vLevel = String(viewer.employee_level || '').trim().toLowerCase();

            let where = '';
            let params = [];

            if (vRole === 'admin' || vDept === 'hr') {
                where = '';
            } else {
                // Employees see their own updates and updates on tasks they assigned.
                where = `WHERE (du.employee_id = ? OR t.assigned_by = ?)`;
                params = [viewerId, viewerId];
            }

            const [rows] = await db.query(
                `${BASE_SELECT} ${where} ORDER BY du.update_date DESC`,
                params
            );
            return res.json(rows);
        } catch (err) {
            console.error('Get scoped daily updates error:', err);
            return res.status(500).send({ error: err.message });
        }
    }

    // No employeeId → return ALL daily updates (Admin view).
    if (!employeeId) {
        try {
            const [rows] = await db.query(`${BASE_SELECT} ORDER BY du.update_date DESC`);
            return res.json(rows);
        } catch (err) {
            console.error('Get all daily updates error:', err);
            return res.status(500).send({ error: err.message });
        }
    }

    try {
        const [[currentEmployee]] = await db.query(
            `SELECT id, role, department, employee_level
             FROM employees
             WHERE id = ?`,
            [employeeId]
        );

        if (!currentEmployee) {
            return res.status(404).send({
                error: "Employee not found"
            });
        }

        const role = String(currentEmployee.role || '')
            .trim()
            .toLowerCase();

        const department = String(currentEmployee.department || '')
            .trim();

        const employeeLevel = String(currentEmployee.employee_level || '')
            .trim()
            .toLowerCase();

        let query;
        let params;

        if (role === 'employee' && employeeLevel === 'senior') {
            query = `
                SELECT
                    du.*,
                    e.fullName AS employeeName,
                    e.department,
                    e.role,
                    e.employee_level,
                    p.projectTitle,
                    t.title,
                    t.note,
                    t.assigned_by AS task_assigned_by
                FROM daily_updates du
                LEFT JOIN employees e
                    ON du.employee_id = e.id
                LEFT JOIN projects p
                    ON du.project_id = p.id
                LEFT JOIN tasks t
                    ON du.task_id = t.id
                WHERE
                    du.employee_id = ? OR t.assigned_by = ?
                ORDER BY du.update_date DESC
            `;

            params = [
                employeeId,
                employeeId
            ];

        } else {

            // JUNIOR / INTERN / OTHER EMPLOYEE
            // Only their own updates
            query = `
                SELECT
                    du.*,
                    e.fullName AS employeeName,
                    e.department,
                    e.role,
                    e.employee_level,
                    p.projectTitle,
                    t.title,
                    t.note,
                    t.assigned_by AS task_assigned_by
                FROM daily_updates du
                LEFT JOIN employees e
                    ON du.employee_id = e.id
                LEFT JOIN projects p
                    ON du.project_id = p.id
                LEFT JOIN tasks t
                    ON du.task_id = t.id
                WHERE du.employee_id = ?
                ORDER BY du.update_date DESC
            `;

            params = [employeeId];
        }

        const [rows] = await db.query(query, params);

        res.json(rows);

    } catch (err) {
        console.error('Get daily updates error:', err);

        res.status(500).send({
            error: err.message
        });
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
      t.note,
      t.assigned_by AS task_assigned_by
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
        let taskAssignerId = null;
        if (task_id) {
            const [[task]] = await db.query(
                'SELECT employee_id, assigned_by FROM tasks WHERE id = ?', [task_id]
            );
            if (!task || Number(task.employee_id) !== Number(employee_id)) {
                return res.status(403).send({ error: 'You can only update a task assigned to you.' });
            }
            taskAssignerId = task.assigned_by;
        }
        const [result] = await db.query(sql, values);

        // Only notify the person who assigned the task.
        if (taskAssignerId) {
            const [[employee]] = await db.query('SELECT fullName FROM employees WHERE id = ?', [employee_id]).catch(() => [[]]);
            const message = `${employee?.fullName || 'An employee'} added a daily update to your task`;
            await db.query(
                `INSERT INTO notifications (type, message, recipient_id, recipient_role) VALUES (?, ?, ?, ?)`,
                ['daily_update', message, taskAssignerId, 'Employee']
            ).catch(() => {});
            try {
                getIO().to(`user_${taskAssignerId}`).emit('notification', { type: 'daily_update', message });
            } catch (e) { /* socket not ready — DB row still persists */ }
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

