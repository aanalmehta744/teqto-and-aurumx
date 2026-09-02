const express = require('express');
const router = express.Router();
const db = require('../connection'); // <-- use promise interface
const { getIO } = require('../socket');

async function validateAssignment(assignedBy, employeeId) {
  // if (!assignedBy || !employeeId) return null;
  // const [[assigner]] = await db.query('SELECT role, department, employee_level FROM employees WHERE id = ?', [assignedBy]);
  // const [[assignee]] = await db.query('SELECT role, employee_level FROM employees WHERE id = ?', [employeeId]);
  // if (!assigner || !assignee) return 'Invalid assigning or assigned employee';
  // const isSenior = String(assigner.employee_level || '').toLowerCase() === 'senior' && String(assigner.role || '').toLowerCase() === 'employee';
  // if (isSenior && !['junior', 'intern'].includes(String(assignee.employee_level || '').toLowerCase())) {
  //   return 'Senior employees can assign tasks only to Junior and Intern employees';
  // }
  // return null;
  if (!assignedBy || !employeeId) return null;

  const [[assigner]] = await db.query(
    'SELECT role, department, employee_level FROM employees WHERE id = ?',
    [assignedBy]
  );

  const [[assignee]] = await db.query(
    'SELECT role, department, employee_level FROM employees WHERE id = ?',
    [employeeId]
  );

  if (!assigner || !assignee) return 'Invalid assigning or assigned employee';

  const assignerDept = String(assigner.department || '').toLowerCase().trim();
  const assigneeDept = String(assignee.department || '').toLowerCase().trim();
  const assigneeRole = String(assignee.role || '').toLowerCase().trim();
  const assigneeLevel = String(assignee.employee_level || '').toLowerCase().trim();

  // BDE (identified by department) → may assign to anyone EXCEPT Admin, HR, HR Coordinator.
  if (assignerDept === 'bde') {
    if (assigneeRole === 'admin' || assigneeDept === 'hr' || assigneeDept === 'hr coordinator') {
      return 'BDE cannot assign tasks to Admin, HR or HR Coordinator.';
    }
    return null;
  }

  // HR / HR Coordinator → may assign to anyone EXCEPT Admin.
  if (assignerDept === 'hr' || assignerDept === 'hr coordinator') {
    if (assigneeRole === 'admin') {
      return 'HR cannot assign tasks to Admin.';
    }
    return null;
  }

  // Senior EMPLOYEE (not BDE) → only Junior/Intern, and only within the same department.
  const isSeniorEmployee =
    String(assigner.employee_level || '').toLowerCase().trim() === 'senior' &&
    String(assigner.role || '').toLowerCase().trim() === 'employee';

  if (isSeniorEmployee) {
    if (!['junior', 'intern'].includes(assigneeLevel)) {
      return 'Senior employees can assign tasks only to Junior and Intern employees.';
    }
    if (assignerDept !== assigneeDept) {
      return 'Senior employees can assign tasks only within their own department.';
    }
  }

  return null;
}

// Fetch all tasks (scoped for BDE: only tasks that belong to the BDE's own clients' projects)
router.get('/', async (req, res) => {
  try {
    const viewerId = req.query.viewerId;
    const conditions = [];
    const params = [];

    if (viewerId) {
      const [[viewer]] = await db.query(
        'SELECT role, department, employee_level FROM employees WHERE id = ?',
        [viewerId]
      );
      const vRole = String(viewer?.role || '').trim().toLowerCase();
      const vDept = String(viewer?.department || '').trim().toLowerCase();
      const vLevel = String(viewer?.employee_level || '').trim().toLowerCase();

      if (vDept === 'bde') {
        conditions.push(`tasks.project_id IN (
            SELECT p2.id
            FROM projects p2
            JOIN clients c2 ON p2.client = c2.id
            WHERE c2.employee_id = ?
          )`);
        params.push(viewerId);
      } else if (vDept === 'ba' && vLevel === 'intern') {
        // BA Intern → only tasks they created or that are assigned to them.
        conditions.push(`(tasks.assigned_by = ? OR tasks.employee_id = ?)`);
        params.push(viewerId, viewerId);
      } else if (vRole === 'employee' && vLevel === 'senior') {
        // Senior employee → only tasks assigned TO him or assigned BY him
        // (to his juniors/interns). Not tasks HR/admin gave to others.
        conditions.push(`(tasks.employee_id = ? OR tasks.assigned_by = ?)`);
        params.push(viewerId, viewerId);
      }

      // A task assigned by an Admin or HR is private: visible ONLY to the
      // assignee or the assigner. Admin viewers still see everything.
      if (vRole !== 'admin') {
        conditions.push(`(
          NOT (LOWER(TRIM(ab.role)) = 'admin' OR LOWER(TRIM(ab.department)) IN ('hr', 'hr coordinator'))
          OR tasks.employee_id = ?
          OR tasks.assigned_by = ?
        )`);
        params.push(viewerId, viewerId);
      }
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const [rows] = await db.query(`
       SELECT
    tasks.*,
    projects.projectTitle,
    employees.fullName AS employee_name
FROM
    tasks
 LEFT JOIN
    projects ON tasks.project_id = projects.id
JOIN
    employees ON tasks.employee_id = employees.id
 LEFT JOIN
    employees ab ON tasks.assigned_by = ab.id
${where}
ORDER BY
    tasks.id DESC;
`,
      params
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Fetch a specific task by ID
router.get('/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// Fetch a specific task by employee ID
router.get('/mytask/:userId', async (req, res) => {
  console.log("Employee ID", req.params.userId);
  try {
    // Join tasks with projects on project_id to fetch project title
    const [rows] = await db.query(`
        SELECT 
          tasks.*, 
          projects.projectTitle,
          employees.fullName AS employee_name
        FROM 
          tasks
        LEFT JOIN 
          projects ON tasks.project_id = projects.id
        JOIN
          employees ON tasks.employee_id = employees.id
        WHERE 
          tasks.employee_id = ?
        ORDER BY 
        tasks.id DESC`,
      [req.params.userId]
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Task not found' });

    res.json(rows);

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Create a new task
router.post('/', async (req, res) => {
  const { employee_id, project_id, trainer_project_name, employee_type, title, done, note, priority, due_date, assigned_by } = req.body;

  try {
    const assignmentError = await validateAssignment(assigned_by, employee_id);
    if (assignmentError) return res.status(403).json({ error: assignmentError });

    await db.query(
      `INSERT INTO tasks (employee_id, project_id, trainer_project_name, employee_type, title, done, note, priority, due_date, assigned_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        employee_id,
        project_id || null,
        trainer_project_name || null,
        employee_type,
        title,
        done,
        note,
        priority,
        due_date,
        assigned_by || null
      ]
    );

    // Notify the assigned employee
    if (employee_id) {
      const message = `A new task has been assigned to you: "${title}"`;
      await db.query(
        `INSERT INTO notifications (type, message, recipient_id, recipient_role) VALUES (?, ?, ?, ?)`,
        ['task_assigned', message, employee_id, 'Employee']
      ).catch(() => {});

      // Push a live notification to the assigned employee's socket room.
      try {
        getIO().to(`user_${employee_id}`).emit('notification', {
          type: 'task_assigned',
          message
        });
      } catch (e) { /* socket not ready — DB row still persists */ }
    }

    res.json({ message: 'Task created successfully' });
  } catch (err) {
    console.error('Insert error:', err);  // Add logging
    res.status(500).json({ error: err.message });
  }
});



// Update an existing task
router.put('/:id', async (req, res) => {
  const { employee_id, project_id, title, done, note, priority, due_date, assigned_by } = req.body;
  try {
    const assignmentError = await validateAssignment(assigned_by, employee_id);
    if (assignmentError) return res.status(403).json({ error: assignmentError });
    await db.query(
      `UPDATE tasks
       SET employee_id = ?, project_id = ?, title = ?, done = ?, note = ?, priority = ?, due_date = ?, assigned_by = ?
       WHERE id = ?`,
      [employee_id, project_id, title, done, note, priority, due_date, assigned_by || null, req.params.id]
    );
    res.json({ message: 'Task updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;
