const express = require('express');
const router = express.Router();
const db = require('../connection'); // <-- use promise interface

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

const isSenior =
  String(assigner.employee_level || '').toLowerCase().trim() === 'senior' &&
  String(assigner.role || '').toLowerCase().trim() === 'employee';

if (isSenior) {
  const assigneeLevel = String(
    assignee.employee_level || ''
  ).toLowerCase().trim();

  const assignerDepartment = String(
    assigner.department || ''
  ).toLowerCase().trim();

  const assigneeDepartment = String(
    assignee.department || ''
  ).toLowerCase().trim();

  // Senior can assign ONLY to Junior or Intern
  if (!['junior', 'intern'].includes(assigneeLevel)) {
    return res.status(403).json({
      message:
        'Senior employees can assign tasks only to Junior and Intern employees.'
    });
  }

  // Senior can assign ONLY within the same department
  if (assignerDepartment !== assigneeDepartment) {
    return res.status(403).json({
      message:
        'Senior employees can assign tasks only within their own department.'
    });
  }
}

return null;
}

// Fetch all tasks
router.get('/', async (req, res) => {
  try {
    // const [rows] = await db.query('SELECT * FROM tasks ORDER BY create_date DESC');
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
ORDER BY 
    tasks.id DESC;
`,
      [req.params.userId]
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
      await db.query(
        `INSERT INTO notifications (type, message, recipient_id, recipient_role) VALUES (?, ?, ?, ?)`,
        ['task_assigned', `A new task has been assigned to you: "${title}"`, employee_id, 'Employee']
      ).catch(() => {});
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
