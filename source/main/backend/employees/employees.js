const express = require('express');
const router = express.Router();
const db = require('../connection'); // Ensure database connection
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const { sendWelcomeEmail } = require('./sendEmail');

// Middleware to parse JSON bodies
router.use(express.json());

// Schedule bde target the cron job (runs at midnight on the 1st of every month)
cron.schedule('0 0 1 * *', async () => {
  console.log('Running monthly achieved_amount update...');

  const query = `
    UPDATE bde_targets bt
    LEFT JOIN (
      SELECT 
        employee_id, 
        DATE_FORMAT(created_at, '%Y-%m') AS month,
        SUM(prize_amount) AS achieved
      FROM clients
      WHERE client_type = 'Closed'
      GROUP BY employee_id, month
    ) cc
    ON bt.bde_id = cc.employee_id AND DATE_FORMAT(bt.target_month, '%Y-%m') = cc.month
    SET bt.achieved_amount = IFNULL(cc.achieved, 0);
  `;

  try {
    const [result] = await db.query(query);
    console.log('achieved_amount updated successfully.');
  } catch (err) {
    console.error('Error updating achieved_amount:', err.message);
  }
});

// 🟢 Reset total_leave & leave_balance to 12 every year on Jan 1st at midnight
cron.schedule('0 0 1 1 *', async () => {
  console.log('Running yearly leave reset...');

  const query = `
    UPDATE employees 
    SET total_leave = 12, 
        leave_balance = 12
  `;

  try {
    const [result] = await db.query(query);
    console.log(`✅ total_leave & leave_balance reset to 12 for ${result.affectedRows} employees`);
  } catch (err) {
    console.error('❌ Error resetting leaves:', err.message);
  }
});

// Define upload directories
const employeeUploadDir = path.join(__dirname, '../uploads/employees');

// Create the uploads directory if it doesn't exist
if (!fs.existsSync(employeeUploadDir)) {
  fs.mkdirSync(employeeUploadDir, { recursive: true });
}

// Set up Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, employeeUploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({ storage });

// added code below is — ensure incentive column exists in employees table (MySQL 5.7 compatible)
db.query(`
  SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'incentive'
`).then(([rows]) => {
  if (rows[0].cnt === 0) {
    return db.query(`ALTER TABLE employees ADD COLUMN incentive DECIMAL(10, 2) DEFAULT 0`);
  }
}).catch(() => {});

// 🟢 GET all employees
router.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM employees';
    const [results] = await db.query(sql);
    // console.log(results);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'An error occurred while fetching employees' });
  }
});

// 🟢 GET employee by ID
router.get('/:id', async (req, res) => {
  const employeeId = req.params.id;

  try {
    const sql = `SELECT *
                     FROM employees 
                     
                     WHERE id = ?`;

    const [results] = await db.query(sql, [employeeId]);
    // console.log(results);
    if (results.length > 0) {
      res.status(200).json(results[0]);
    } else {
      res.status(404).json({ error: 'Employee not found' });
    }
  } catch (err) {
    console.error('Error fetching employee:', err);
    res.status(500).json({ error: 'An error occurred while fetching the employee' });
  }
});

// 🟢 POST Add a new employee
router.post('/', upload.single('uploadImg'), async (req, res) => {
console.log("Request Body:", req.body);
console.log(
  "termination_date:",
  req.body.termination_date,
  typeof req.body.termination_date
);

  const employeeData = req.body;
  const uploadedFile = req.file;
  console.log('Uploaded File:', req.file);
  try {
    const hashedPassword = await bcrypt.hash(employeeData.password, 10);
    // Convert date to 'YYYY-MM-DD' format without timezone issues
    const formattedJoiningDate = employeeData.joining_date
      ? new Date(employeeData.joining_date).toLocaleDateString('en-CA')
      : null;

    const formattedDobDate = employeeData.dob
      ? new Date(employeeData.dob).toLocaleDateString('en-CA')
      : null;

    // 🟢 Calculate total paid leave
    const today = new Date();
    const currentYear = today.getFullYear();

    const joiningDate = formattedJoiningDate ? new Date(formattedJoiningDate) : new Date();
    const joiningYear = joiningDate.getFullYear();
    const joiningMonth = joiningDate.getMonth() + 1; // (0 = Jan, so add 1)

    let paidLeaves;

    if (joiningYear === currentYear) {
      // Joined this year → count from joining month to December
      const remainingMonths = 12 - joiningMonth + 1; // includes current month
      paidLeaves = remainingMonths;
    } else if (joiningYear < currentYear) {
      // Joined in a previous year → give full 12 leaves
      paidLeaves = 12;
    } else {
      // Future joining date (edge case, if admin enters 2026 etc.)
      paidLeaves = 0;
    }


    const sql = `INSERT INTO employees 
        (fullName, gender, mobile, password, department, address, email, dob, salary, uploadImg, joining_date,role, panCard, aadharCard, total_leave, leave_balance, status, termination_date, employment_type)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

    // const status = employeeData.status ? 1 : 0;
    // const employmentType = employeeData.employment_type ? 1 : 0;

    const employmentType =
      employeeData.employment_type === 'true' || employeeData.employment_type === true ? 1 : 0;

    const status =
      employeeData.status === 'true' || employeeData.status === true ? 1 : 0;

      const terminationDate =
  employeeData.termination_date === "null" ||
  employeeData.termination_date === "" ||
  employeeData.termination_date == null
    ? null
    : employeeData.termination_date;

    
console.log("terminationDate =", terminationDate);
console.log("type =", typeof terminationDate);

    const values = [
      employeeData.fullName,
      employeeData.gender,
      employeeData.mobile,
      hashedPassword,
      employeeData.department,
      employeeData.address,
      employeeData.email,
      formattedDobDate,
      employeeData.salary,
      uploadedFile ? uploadedFile.filename : null,
      formattedJoiningDate,
      employeeData.role,
      employeeData.panCard,
      employeeData.aadharCard,
      paidLeaves,
      paidLeaves,
      status,
      // employeeData.status ?? 1,                 // default active
      terminationDate,    // only set if inactive
      // employeeData.employment_type,
      employmentType,
    ];

    const [result] = await db.query(sql, values);
    res.status(201).json({ message: 'Employee added successfully', employeeId: result.insertId });
    // Send welcome email
    await sendWelcomeEmail({
      fullName: employeeData.fullName,
      email: employeeData.email,
      joiningDate: formattedJoiningDate
    });

  } catch (err) {
    console.error('Error adding employee:', err);
    res.status(500).json({ error: 'An error occurred while adding employee data' });
  }
});

//  PUT Update an employee
router.put('/:id', async (req, res) => {
  const employeeId = req.params.id;
  const employeeData = req.body;
  console.log("Received Update Request:", req.body);

  // Convert date to 'YYYY-MM-DD' format without timezone issues
  const formattedJoiningDate = employeeData.joining_date
    ? new Date(employeeData.joining_date).toLocaleDateString('en-CA')
    : null;

  const formattedDobDate = employeeData.dob
    ? new Date(employeeData.dob).toLocaleDateString('en-CA')
    : null;
  // 🟢 Calculate total paid leave from joining month to December
  // 🟢 Calculate total paid leave
  const today = new Date();
  const currentYear = today.getFullYear();

  const joiningDate = formattedJoiningDate ? new Date(formattedJoiningDate) : new Date();
  const joiningYear = joiningDate.getFullYear();
  const joiningMonth = joiningDate.getMonth() + 1; // (0 = Jan, so add 1)

  let paidLeaves;

  if (joiningYear === currentYear) {
    // Joined this year → count from joining month to December
    const remainingMonths = 12 - joiningMonth + 1; // includes current month
    paidLeaves = remainingMonths;
  } else if (joiningYear < currentYear) {
    // Joined in a previous year → give full 12 leaves
    paidLeaves = 12;
  } else {
    // Future joining date (edge case, if admin enters 2026 etc.)
    paidLeaves = 0;
  }
  try {
    const sql = `UPDATE employees SET 
            fullName = ?, 
            gender = ?, 
            mobile = ?, 
            department = ?, 
            address = ?, 
            email = ?, 
            dob = ?, 
            salary = ?,
            joining_date = ?,
            panCard = ?,
            aadharCard = ?,
            total_leave = ?,
            leave_balance = ?,
            status = ?, 
            employment_type = ?,
            termination_date = ?
            WHERE id = ?`;

    const values = [
      employeeData.fullName,
      employeeData.gender,
      employeeData.mobile,
      employeeData.department,
      employeeData.address,
      employeeData.email,
      formattedDobDate,  // Corrected DOB format
      employeeData.salary,
      formattedJoiningDate,  // Corrected Joining Date format
      employeeData.panCard,
      employeeData.aadharCard,
      paidLeaves,
      paidLeaves,
      employeeData.status ?? 1, // if not provided, default active
      employeeData.employment_type,
      employeeData.status == 0 ? (employeeData.termination_date || new Date().toLocaleDateString('en-CA')) : null,
      employeeId
    ];
    const [result] = await db.query(sql, values);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee updated successfully', employeeId });

  } catch (err) {
    console.error('Error updating employee:', err);
    res.status(500).json({ error: 'An error occurred while updating employee data' });
  }
});


//  DELETE Employee
router.delete('/:id', async (req, res) => {
  const employeeId = req.params.id;

  try {
    // Delete the employee
    const sql = 'DELETE FROM employees WHERE id = ?';
    const [result] = await db.query(sql, [employeeId]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    res.status(200).json({ message: 'Employee deleted successfully', employeeId });

  } catch (err) {
    console.error('Error deleting employee:', err);
    res.status(500).json({ error: 'An error occurred while deleting employee' });
  }
});
// POST /api/employees/:id/targets
router.post('/:id/targets', async (req, res) => {
  const employeeId = req.params.id;
  const { amount, target_date } = req.body;

  if (!amount || !target_date) {
    return res.status(400).json({ message: 'Amount and target date are required' });
  }

  try {
    const [result] = await db.execute(
      'INSERT INTO bde_targets (bde_id, target_amount, target_month) VALUES (?, ?, ?)',
      [employeeId, amount, target_date]
    );

    res.status(201).json({
      id: result.insertId,
      employeeId,
      amount,
      target_date
    });
  } catch (error) {
    console.error('Error saving target:', error);
    res.status(500).json({ message: 'Failed to save target' });
  }
});

// GET /api/employees/:id/targets
router.get('/:id/targets', async (req, res) => {
  const employeeId = req.params.id;

  try {
    const [targets] = await db.execute(
      `SELECT 
    id, 
    target_amount AS amount, 
    target_month, 
    achieved_amount 
  FROM 
    bde_targets 
  WHERE 
    bde_id = ?
  ORDER BY 
    target_month DESC;`,
      [employeeId]
    );


    res.status(200).json(targets);
  } catch (error) {
    console.error('Error fetching targets:', error);
    res.status(500).json({ message: 'Failed to fetch targets' });
  }
});

// PUT /api/employees/:employeeId/targets/:targetId
router.put('/:targetId/targets', async (req, res) => {
  const { targetId } = req.params;
  const { amount, target_date } = req.body;

  if (!amount || !target_date) {
    return res.status(400).json({ message: 'Amount and target date are required' });
  }

  try {
    const [result] = await db.execute(
      `UPDATE bde_targets 
         SET target_amount = ?, target_month = ? 
         WHERE id = ? `,
      [amount, target_date, targetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Target not found or not updated' });
    }

    res.status(200).json({ message: 'Target updated successfully' });
  } catch (error) {
    console.error('Error updating target:', error);
    res.status(500).json({ message: 'Failed to update target' });
  }
});
// DELETE /api/employees/:employeeId/targets/:targetId
router.delete('/:targetId/targets', async (req, res) => {
  const { targetId } = req.params;
  console.log(targetId);
  try {
    const [result] = await db.execute(
      'DELETE FROM bde_targets WHERE id = ?',
      [targetId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Target not found or already deleted' });
    }

    res.status(200).json({ message: 'Target deleted successfully' });
  } catch (error) {
    console.error('Error deleting target:', error);
    res.status(500).json({ message: 'Failed to delete target' });
  }
});

// PATCH /api/employees/:id/upload-photo — upload or replace profile photo
router.patch('/:id/upload-photo', upload.single('photo'), async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const [[employee]] = await db.query('SELECT uploadImg FROM employees WHERE id = ?', [id]);
    if (!employee) return res.status(404).json({ error: 'Employee not found' });
    // Delete old photo file if it exists
    if (employee.uploadImg) {
      fs.unlink(path.join(employeeUploadDir, employee.uploadImg), () => {});
    }
    await db.query('UPDATE employees SET uploadImg = ? WHERE id = ?', [req.file.filename, id]);
    res.json({ message: 'Photo updated successfully', filename: req.file.filename });
  } catch (err) {
    console.error('Error uploading photo:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// added code below is — PATCH /api/employees/:id/incentive — admin updates BDE incentive amount
router.patch('/:id/incentive', async (req, res) => {
  const { id } = req.params;
  const incentive = parseFloat(req.body.incentive ?? 0);
  if (isNaN(incentive) || incentive < 0) {
    return res.status(400).json({ error: 'Invalid incentive value' });
  }
  try {
    await db.query('UPDATE employees SET incentive = ? WHERE id = ?', [incentive, id]);
    res.json({ message: 'Incentive updated successfully', incentive });
  } catch (err) {
    console.error('Error updating incentive:', err);
    res.status(500).json({ error: 'Failed to update incentive' });
  }
});

module.exports = router;
