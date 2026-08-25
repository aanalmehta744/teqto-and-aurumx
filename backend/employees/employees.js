const express = require('express');
const router = express.Router();
const db = require('../connection'); // Ensure database connection
const bcrypt = require('bcrypt');
const cron = require('node-cron');
const { sendWelcomeEmail } = require('./sendEmail');
const { createUpload } = require('../cloudinary');

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

const upload = createUpload('employees');

// added code below is — ensure incentive column exists in employees table (MySQL 5.7 compatible)
db.query(`
  SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'employees' AND COLUMN_NAME = 'incentive'
`).then(([rows]) => {
  if (rows[0].cnt === 0) {
    return db.query(`ALTER TABLE employees ADD COLUMN incentive DECIMAL(10, 2) DEFAULT 0`);
  }
}).catch(() => { });

// // 🟢 GET all employees
// router.get('/', async (req, res) => {
//   try {
//     const sql = 'SELECT * FROM employees';
//     const [results] = await db.query(sql);
//     // console.log(results);
//     res.status(200).json(results);
//   } catch (err) {
//     console.error('Error fetching employees:', err);
//     res.status(500).json({ error: 'An error occurred while fetching employees' });
//   }
// });

// // 🟢 GET employee by ID
// router.get('/:id', async (req, res) => {
//   const employeeId = req.params.id;

//   try {
//     const sql = `SELECT * FROM employees WHERE id = ?`;

//     const [results] = await db.query(sql, [employeeId]);
//     // console.log(results);
//     if (results.length > 0) {
//       res.status(200).json(results[0]);
//     } else {
//       res.status(404).json({ error: 'Employee not found' });
//     }
//   } catch (err) {
//     console.error('Error fetching employee:', err);
//     res.status(500).json({ error: 'An error occurred while fetching the employee' });
//   }
// });

// // 🟢 POST Add a new employee
// router.post('/', upload.single('uploadImg'), async (req, res) => {
//   console.log("Request Body:", req.body);
//   console.log(
//     "termination_date:",
//     req.body.termination_date,
//     typeof req.body.termination_date
//   );

//   const employeeData = req.body;
//   const uploadedFile = req.file;
//   console.log('Uploaded File:', req.file);
//   try {
//     const hashedPassword = await bcrypt.hash(employeeData.password, 10);
//     // Convert date to 'YYYY-MM-DD' format without timezone issues
//     const formattedJoiningDate = employeeData.joining_date
//       ? new Date(employeeData.joining_date).toLocaleDateString('en-CA')
//       : null;

//     const formattedDobDate = employeeData.dob
//       ? new Date(employeeData.dob).toLocaleDateString('en-CA')
//       : null;

//     // 🟢 Calculate total paid leave
//     const today = new Date();
//     const currentYear = today.getFullYear();

//     const joiningDate = formattedJoiningDate ? new Date(formattedJoiningDate) : new Date();
//     const joiningYear = joiningDate.getFullYear();
//     const joiningMonth = joiningDate.getMonth() + 1; // (0 = Jan, so add 1)

//     let paidLeaves;

//     if (joiningYear === currentYear) {
//       // Joined this year → count from joining month to December
//       const remainingMonths = 12 - joiningMonth + 1; // includes current month
//       paidLeaves = remainingMonths;
//     } else if (joiningYear < currentYear) {
//       // Joined in a previous year → give full 12 leaves
//       paidLeaves = 12;
//     } else {
//       // Future joining date (edge case, if admin enters 2026 etc.)
//       paidLeaves = 0;
//     }


//     const sql = `INSERT INTO employees 
//         (fullName, gender, mobile, password, department, employee_level, address, email, dob, salary, uploadImg, joining_date,role, panCard, aadharCard, total_leave, leave_balance, status, termination_date, employment_type)
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//     // const status = employeeData.status ? 1 : 0;
//     // const employmentType = employeeData.employment_type ? 1 : 0;

//     const employmentType =
//       employeeData.employment_type === 'true' || employeeData.employment_type === true ? 1 : 0;

//     const status =
//       employeeData.status === 'true' || employeeData.status === true ? 1 : 0;

//     const terminationDate =
//       employeeData.termination_date === "null" ||
//         employeeData.termination_date === "" ||
//         employeeData.termination_date == null
//         ? null
//         : employeeData.termination_date;


//     console.log("terminationDate =", terminationDate);
//     console.log("type =", typeof terminationDate);

//     const values = [
//       employeeData.fullName,
//       employeeData.gender,
//       employeeData.mobile,
//       hashedPassword,
//       employeeData.department,
//       ['Senior','Junior','Intern'].includes(employeeData.employee_level) ? employeeData.employee_level : 'Junior',
//       employeeData.address,
//       employeeData.email,
//       formattedDobDate,
//       employeeData.salary,
//       uploadedFile ? (uploadedFile.path || uploadedFile.filename) : null,
//       formattedJoiningDate,
//       employeeData.role,
//       employeeData.panCard,
//       employeeData.aadharCard,
//       paidLeaves,         // total_leave
//       paidLeaves,         // leave_balance (starts equal to total_leave for new employees)
//       status,
//       terminationDate,    // only set if inactive
//       employmentType,
//     ];

//     const [result] = await db.query(sql, values);
//     res.status(201).json({ message: 'Employee added successfully', employeeId: result.insertId });
//     // Send welcome email
//     await sendWelcomeEmail({
//       fullName: employeeData.fullName,
//       email: employeeData.email,
//       joiningDate: formattedJoiningDate
//     });

//   } catch (err) {
//     console.error('Error adding employee:', err);
//     res.status(500).json({ message: err.message, error: err.message });
//   }
// });

// //  PUT Update an employee
// router.put('/:id', async (req, res) => {
//   const employeeId = req.params.id;
//   const employeeData = req.body;
//   console.log("Received Update Request:", req.body);

//   // Convert date to 'YYYY-MM-DD' format without timezone issues
//   const formattedJoiningDate = employeeData.joining_date
//     ? new Date(employeeData.joining_date).toLocaleDateString('en-CA')
//     : null;

//   const formattedDobDate = employeeData.dob
//     ? new Date(employeeData.dob).toLocaleDateString('en-CA')
//     : null;
//   // 🟢 Calculate total paid leave from joining month to December
//   // 🟢 Calculate total paid leave
//   const today = new Date();
//   const currentYear = today.getFullYear();

//   const joiningDate = formattedJoiningDate ? new Date(formattedJoiningDate) : new Date();
//   const joiningYear = joiningDate.getFullYear();
//   const joiningMonth = joiningDate.getMonth() + 1; // (0 = Jan, so add 1)

//   let paidLeaves;

//   if (joiningYear === currentYear) {
//     // Joined this year → count from joining month to December
//     const remainingMonths = 12 - joiningMonth + 1; // includes current month
//     paidLeaves = remainingMonths;
//   } else if (joiningYear < currentYear) {
//     // Joined in a previous year → give full 12 leaves
//     paidLeaves = 12;
//   } else {
//     // Future joining date (edge case, if admin enters 2026 etc.)
//     paidLeaves = 0;
//   }
//   try {
//     const sql = `UPDATE employees SET 
//             fullName = ?, 
//             gender = ?, 
//             mobile = ?, 
//             department = ?, 
//             employee_level = ?,
//             address = ?, 
//             email = ?, 
//             dob = ?, 
//             salary = ?,
//             joining_date = ?,
//             panCard = ?,
//             aadharCard = ?,
//             total_leave = ?,
//             leave_balance = ?,
//             status = ?, 
//             employment_type = ?,
//             termination_date = ?
//             WHERE id = ?`;

//     const values = [
//       employeeData.fullName,
//       employeeData.gender,
//       employeeData.mobile,
//       employeeData.department,
//       ['Senior','Junior','Intern'].includes(employeeData.employee_level) ? employeeData.employee_level : 'Junior',
//       employeeData.address,
//       employeeData.email,
//       formattedDobDate,  // Corrected DOB format
//       employeeData.salary,
//       formattedJoiningDate,  // Corrected Joining Date format
//       employeeData.panCard,
//       employeeData.aadharCard,
//       paidLeaves,
//       paidLeaves,
//       employeeData.status ?? 1, // if not provided, default active
//       employeeData.employment_type,
//       employeeData.status == 0 ? (employeeData.termination_date || new Date().toLocaleDateString('en-CA')) : null,
//       employeeId
//     ];
//     const [result] = await db.query(sql, values);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     res.status(200).json({ message: 'Employee updated successfully', employeeId });

//   } catch (err) {
//     console.error('Error updating employee:', err);
//     res.status(500).json({ error: 'An error occurred while updating employee data' });
//   }
// });


// //  DELETE Employee
// router.delete('/:id', async (req, res) => {
//   const employeeId = req.params.id;

//   try {
//     // Delete the employee
//     const sql = 'DELETE FROM employees WHERE id = ?';
//     const [result] = await db.query(sql, [employeeId]);

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     res.status(200).json({ message: 'Employee deleted successfully', employeeId });

//   } catch (err) {
//     console.error('Error deleting employee:', err);
//     res.status(500).json({ error: 'An error occurred while deleting employee' });
//   }
// });





// // POST /api/employees/:id/targets
// router.post('/:id/targets', async (req, res) => {
//   const employeeId = req.params.id;
//   const { amount, target_date } = req.body;

//   if (!amount || !target_date) {
//     return res.status(400).json({ message: 'Amount and target date are required' });
//   }

//   try {
//     const [result] = await db.execute(
//       'INSERT INTO bde_targets (bde_id, target_amount, target_month) VALUES (?, ?, ?)',
//       [employeeId, amount, target_date]
//     );

//     res.status(201).json({
//       id: result.insertId,
//       employeeId,
//       amount,
//       target_date
//     });
//   } catch (error) {
//     console.error('Error saving target:', error);
//     res.status(500).json({ message: 'Failed to save target' });
//   }
// });

// // GET /api/employees/:id/targets
// router.get('/:id/targets', async (req, res) => {
//   const employeeId = req.params.id;

//   try {
//     const [targets] = await db.execute(
//       `SELECT 
//     id, 
//     target_amount AS amount, 
//     target_month, 
//     achieved_amount 
//   FROM 
//     bde_targets 
//   WHERE 
//     bde_id = ?
//   ORDER BY 
//     target_month DESC;`,
//       [employeeId]
//     );


//     res.status(200).json(targets);
//   } catch (error) {
//     console.error('Error fetching targets:', error);
//     res.status(500).json({ message: 'Failed to fetch targets' });
//   }
// });

// // PUT /api/employees/:employeeId/targets/:targetId
// router.put('/:targetId/targets', async (req, res) => {
//   const { targetId } = req.params;
//   const { amount, target_date } = req.body;

//   if (!amount || !target_date) {
//     return res.status(400).json({ message: 'Amount and target date are required' });
//   }

//   try {
//     const [result] = await db.execute(
//       `UPDATE bde_targets 
//          SET target_amount = ?, target_month = ? 
//          WHERE id = ? `,
//       [amount, target_date, targetId]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Target not found or not updated' });
//     }

//     res.status(200).json({ message: 'Target updated successfully' });
//   } catch (error) {
//     console.error('Error updating target:', error);
//     res.status(500).json({ message: 'Failed to update target' });
//   }
// });
// // DELETE /api/employees/:employeeId/targets/:targetId
// router.delete('/:targetId/targets', async (req, res) => {
//   const { targetId } = req.params;
//   console.log(targetId);
//   try {
//     const [result] = await db.execute(
//       'DELETE FROM bde_targets WHERE id = ?',
//       [targetId]
//     );

//     if (result.affectedRows === 0) {
//       return res.status(404).json({ message: 'Target not found or already deleted' });
//     }

//     res.status(200).json({ message: 'Target deleted successfully' });
//   } catch (error) {
//     console.error('Error deleting target:', error);
//     res.status(500).json({ message: 'Failed to delete target' });
//   }
// });

// // PATCH /api/employees/:id/upload-photo — upload or replace profile photo
// router.patch('/:id/upload-photo', upload.single('photo'), async (req, res) => {
//   const { id } = req.params;
//   try {
//     if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
//     const [[employee]] = await db.query('SELECT uploadImg FROM employees WHERE id = ?', [id]);
//     if (!employee) return res.status(404).json({ error: 'Employee not found' });
//     const photoUrl = req.file.path || req.file.filename;
//     await db.query('UPDATE employees SET uploadImg = ? WHERE id = ?', [photoUrl, id]);
//     res.json({ message: 'Photo updated successfully', filename: photoUrl });
//   } catch (err) {
//     console.error('Error uploading photo:', err);
//     res.status(500).json({ error: 'Failed to upload photo' });
//   }
// });

// // added code below is — PATCH /api/employees/:id/incentive — admin updates BDE incentive amount
// router.patch('/:id/incentive', async (req, res) => {
//   const { id } = req.params;
//   const incentive = parseFloat(req.body.incentive ?? 0);
//   if (isNaN(incentive) || incentive < 0) {
//     return res.status(400).json({ error: 'Invalid incentive value' });
//   }
//   try {
//     await db.query('UPDATE employees SET incentive = ? WHERE id = ?', [incentive, id]);
//     res.json({ message: 'Incentive updated successfully', incentive });
//   } catch (err) {
//     console.error('Error updating incentive:', err);
//     res.status(500).json({ error: 'Failed to update incentive' });
//   }
// });

// module.exports = router;

router.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM employees';

    const [results] = await db.query(sql);

    res.status(200).json(results);

  } catch (err) {
    console.error('Error fetching employees:', err);

    res.status(500).json({
      error: 'An error occurred while fetching employees'
    });
  }
});


// ============================================================
// GET LOGGED-IN EMPLOYEE PROFILE
// EMPLOYEE SELF SERVICE
// ============================================================

router.get('/me/profile', async (req, res) => {
  try {

    const employeeId = getLoggedInEmployeeId(req);

    if (!employeeId) {
      return res.status(401).json({
        error: 'Authentication required'
      });
    }

    const sql = `
      SELECT
        id,
        fullName,
        gender,
        mobile,
        email,
        department,
        employee_level,
        address,
        panCard,
        aadharCard,
        uploadImg,
        tenth_marks,
        twelfth_marks,
        dob,
        joining_date,
        role
      FROM employees
      WHERE id = ?
    `;

    const [results] = await db.query(sql, [employeeId]);

    if (results.length === 0) {
      return res.status(404).json({
        error: 'Employee not found'
      });
    }

    res.status(200).json(results[0]);

  } catch (err) {

    console.error(
      'Error fetching own employee profile:',
      err
    );

    res.status(500).json({
      error: 'Failed to fetch profile'
    });
  }
});


// ============================================================
// GET EMPLOYEE BY ID
// HR / ADMIN
// ============================================================

router.get('/:id', async (req, res) => {

  const employeeId = req.params.id;

  try {

    const sql = `
      SELECT *
      FROM employees
      WHERE id = ?
    `;

    const [results] = await db.query(
      sql,
      [employeeId]
    );

    if (results.length > 0) {

      res.status(200).json(results[0]);

    } else {

      res.status(404).json({
        error: 'Employee not found'
      });

    }

  } catch (err) {

    console.error(
      'Error fetching employee:',
      err
    );

    res.status(500).json({
      error: 'An error occurred while fetching the employee'
    });

  }
});


// ============================================================
// POST ADD NEW EMPLOYEE
// HR / ADMIN
//
// Employee personal fields are intentionally NOT taken
// from HR/Admin during creation.
//
// Employee will fill:
// - address
// - PAN
// - Aadhaar
// - 10th marks
// - 12th marks
// - profile image
//
// later from My Profile.
// ============================================================

router.post('/', upload.single('uploadImg'), async (req, res) => {

  console.log('Request Body:', req.body);

  console.log(
    'termination_date:',
    req.body.termination_date,
    typeof req.body.termination_date
  );

  const employeeData = req.body;

  try {

    const hashedPassword = await bcrypt.hash(
      employeeData.password,
      10
    );


    // --------------------------------------------------------
    // JOINING DATE
    // --------------------------------------------------------

    const formattedJoiningDate =
      employeeData.joining_date
        ? new Date(
            employeeData.joining_date
          ).toLocaleDateString('en-CA')
        : null;


    // --------------------------------------------------------
    // DOB
    // --------------------------------------------------------

    const formattedDobDate =
      employeeData.dob
        ? new Date(
            employeeData.dob
          ).toLocaleDateString('en-CA')
        : null;


    // --------------------------------------------------------
    // PAID LEAVE CALCULATION
    // --------------------------------------------------------

    const today = new Date();

    const currentYear =
      today.getFullYear();

    const joiningDate =
      formattedJoiningDate
        ? new Date(formattedJoiningDate)
        : new Date();

    const joiningYear =
      joiningDate.getFullYear();

    const joiningMonth =
      joiningDate.getMonth() + 1;

    let paidLeaves;


    if (joiningYear === currentYear) {

      const remainingMonths =
        12 - joiningMonth + 1;

      paidLeaves =
        remainingMonths;

    } else if (joiningYear < currentYear) {

      paidLeaves = 12;

    } else {

      paidLeaves = 0;

    }


    // --------------------------------------------------------
    // STATUS
    // --------------------------------------------------------

    const employmentType =
      employeeData.employment_type === 'true' ||
      employeeData.employment_type === true
        ? 1
        : 0;


    const status =
      employeeData.status === 'true' ||
      employeeData.status === true
        ? 1
        : 0;


    const terminationDate =
      employeeData.termination_date === 'null' ||
      employeeData.termination_date === '' ||
      employeeData.termination_date == null
        ? null
        : employeeData.termination_date;


    console.log(
      'terminationDate =',
      terminationDate
    );

    console.log(
      'type =',
      typeof terminationDate
    );


    // --------------------------------------------------------
    // IMPORTANT
    //
    // Employee-only fields are intentionally NULL here:
    //
    // address
    // panCard
    // aadharCard
    // uploadImg
    // tenth_marks
    // twelfth_marks
    //
    // Employee will fill these later.
    // --------------------------------------------------------

    const sql = `
      INSERT INTO employees
      (
        fullName,
        gender,
        mobile,
        password,
        department,
        employee_level,
        address,
        email,
        dob,
        salary,
        uploadImg,
        joining_date,
        role,
        panCard,
        aadharCard,
        total_leave,
        leave_balance,
        status,
        termination_date,
        employment_type,
        tenth_marks,
        twelfth_marks
      )
      VALUES
      (
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `;


    const values = [

      employeeData.fullName,

      employeeData.gender,

      employeeData.mobile,

      hashedPassword,

      employeeData.department,

      [
        'Senior',
        'Junior',
        'Intern'
      ].includes(
        employeeData.employee_level
      )
        ? employeeData.employee_level
        : 'Junior',


      // EMPLOYEE ONLY
      null,

      employeeData.email,

      formattedDobDate,

      employeeData.salary,


      // EMPLOYEE ONLY
      null,

      formattedJoiningDate,

      employeeData.role,


      // EMPLOYEE ONLY
      null,

      // EMPLOYEE ONLY
      null,

      paidLeaves,

      paidLeaves,

      status,

      terminationDate,

      employmentType,


      // EMPLOYEE ONLY
      null,

      // EMPLOYEE ONLY
      null
    ];


    const [result] =
      await db.query(
        sql,
        values
      );


    res.status(201).json({
      message:
        'Employee added successfully',

      employeeId:
        result.insertId
    });


    // --------------------------------------------------------
    // SEND WELCOME EMAIL
    // --------------------------------------------------------

    try {

      await sendWelcomeEmail({
        fullName:
          employeeData.fullName,

        email:
          employeeData.email,

        joiningDate:
          formattedJoiningDate
      });

    } catch (emailError) {

      console.error(
        'Welcome email failed:',
        emailError
      );

      // Employee is already created.
      // Do not fail the employee creation because
      // email sending failed.

    }


  } catch (err) {

    console.error(
      'Error adding employee:',
      err
    );

    res.status(500).json({
      message: err.message,
      error: err.message
    });

  }

});


// ============================================================
// EMPLOYEE SELF PROFILE UPDATE
//
// EMPLOYEE CAN UPDATE ONLY:
// - address
// - panCard
// - aadharCard
// - tenth_marks
// - twelfth_marks
//
// They CANNOT send employee ID.
// Employee ID comes from authentication.
// ============================================================

router.put('/me/profile', async (req, res) => {

  try {

    const employeeId =
      getLoggedInEmployeeId(req);


    if (!employeeId) {

      return res.status(401).json({
        error: 'Authentication required'
      });

    }


    const {
      address,
      panCard,
      aadharCard,
      tenth_marks,
      twelfth_marks
    } = req.body;


    const sql = `
      UPDATE employees
      SET
        address = ?,
        panCard = ?,
        aadharCard = ?,
        tenth_marks = ?,
        twelfth_marks = ?
      WHERE id = ?
    `;


    const values = [

      address || null,

      panCard || null,

      aadharCard || null,

      tenth_marks || null,

      twelfth_marks || null,

      employeeId

    ];


    const [result] =
      await db.query(
        sql,
        values
      );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        error: 'Employee not found'
      });

    }


    res.status(200).json({

      success: true,

      message:
        'Profile updated successfully'

    });


  } catch (err) {

    console.error(
      'Error updating employee self profile:',
      err
    );

    res.status(500).json({

      success: false,

      error:
        'Failed to update profile'

    });

  }

});


// ============================================================
// EMPLOYEE SELF PROFILE PHOTO
//
// Employee can upload ONLY their own photo.
// ============================================================

router.patch(
  '/me/upload-photo',
  upload.single('photo'),
  async (req, res) => {

    try {

      const employeeId =
        getLoggedInEmployeeId(req);


      if (!employeeId) {

        return res.status(401).json({
          error: 'Authentication required'
        });

      }


      if (!req.file) {

        return res.status(400).json({
          error: 'No file uploaded'
        });

      }


      const photoUrl =
        req.file.path ||
        req.file.filename;


      // Photo is stored in `uploadImg`; login returns it and the header/sidebar
      // read `user.img || user.uploadImg`, so it persists after logout + login.
      const [result] =
        await db.query(
          `
          UPDATE employees
          SET uploadImg = ?
          WHERE id = ?
          `,
          [
            photoUrl,
            employeeId
          ]
        );


      if (result.affectedRows === 0) {

        return res.status(404).json({
          error: 'Employee not found'
        });

      }


      res.status(200).json({

        success: true,

        message:
          'Profile photo updated successfully',

        filename:
          photoUrl

      });


    } catch (err) {

      console.error(
        'Error uploading own profile photo:',
        err
      );

      res.status(500).json({

        error:
          'Failed to upload profile photo'

      });

    }

  }
);


// ============================================================
// HR / ADMIN UPDATE EMPLOYEE
//
// This is the existing full employee update API.
//
// IMPORTANT:
// Your existing authentication/authorization middleware
// should allow only HR/Admin to use this endpoint.
// ============================================================

router.put('/:id', async (req, res) => {

  const employeeId =
    req.params.id;

  const employeeData =
    req.body;


  console.log(
    'Received Update Request:',
    req.body
  );


  // --------------------------------------------------------
  // JOINING DATE
  // --------------------------------------------------------

  const formattedJoiningDate =
    employeeData.joining_date
      ? new Date(
          employeeData.joining_date
        ).toLocaleDateString('en-CA')
      : null;


  // --------------------------------------------------------
  // DOB
  // --------------------------------------------------------

  const formattedDobDate =
    employeeData.dob
      ? new Date(
          employeeData.dob
        ).toLocaleDateString('en-CA')
      : null;


  // --------------------------------------------------------
  // LEAVE CALCULATION
  // --------------------------------------------------------

  const today =
    new Date();

  const currentYear =
    today.getFullYear();


  const joiningDate =
    formattedJoiningDate
      ? new Date(formattedJoiningDate)
      : new Date();


  const joiningYear =
    joiningDate.getFullYear();


  const joiningMonth =
    joiningDate.getMonth() + 1;


  let paidLeaves;


  if (joiningYear === currentYear) {

    const remainingMonths =
      12 - joiningMonth + 1;

    paidLeaves =
      remainingMonths;

  } else if (joiningYear < currentYear) {

    paidLeaves = 12;

  } else {

    paidLeaves = 0;

  }


  try {

    const sql = `
      UPDATE employees
      SET
        fullName = ?,
        gender = ?,
        mobile = ?,
        department = ?,
        employee_level = ?,
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
      WHERE id = ?
    `;


    const values = [

      employeeData.fullName,

      employeeData.gender,

      employeeData.mobile,

      employeeData.department,

      [
        'Senior',
        'Junior',
        'Intern'
      ].includes(
        employeeData.employee_level
      )
        ? employeeData.employee_level
        : 'Junior',

      employeeData.address,

      employeeData.email,

      formattedDobDate,

      employeeData.salary,

      formattedJoiningDate,

      employeeData.panCard,

      employeeData.aadharCard,

      paidLeaves,

      paidLeaves,

      employeeData.status ?? 1,

      employeeData.employment_type,

      employeeData.status == 0
        ? (
            employeeData.termination_date ||
            new Date().toLocaleDateString('en-CA')
          )
        : null,

      employeeId

    ];


    const [result] =
      await db.query(
        sql,
        values
      );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        error: 'Employee not found'
      });

    }


    res.status(200).json({

      message:
        'Employee updated successfully',

      employeeId

    });


  } catch (err) {

    console.error(
      'Error updating employee:',
      err
    );

    res.status(500).json({

      error:
        'An error occurred while updating employee data'

    });

  }

});


// ============================================================
// DELETE EMPLOYEE
// HR / ADMIN
// ============================================================

router.delete('/:id', async (req, res) => {

  const employeeId =
    req.params.id;


  try {

    const sql =
      'DELETE FROM employees WHERE id = ?';


    const [result] =
      await db.query(
        sql,
        [employeeId]
      );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        error: 'Employee not found'
      });

    }


    res.status(200).json({

      message:
        'Employee deleted successfully',

      employeeId

    });


  } catch (err) {

    console.error(
      'Error deleting employee:',
      err
    );

    res.status(500).json({

      error:
        'An error occurred while deleting employee'

    });

  }

});


// ============================================================
// BDE TARGETS
// ============================================================

router.post('/:id/targets', async (req, res) => {

  const employeeId =
    req.params.id;

  const {
    amount,
    target_date
  } = req.body;


  if (!amount || !target_date) {

    return res.status(400).json({
      message:
        'Amount and target date are required'
    });

  }


  try {

    // New schema: bde_targets has (bde_id, amount, month, year) with a UNIQUE key
    // on (bde_id, month, year). Derive month/year from the incoming target_date.
    const [result] =
      await db.execute(
        `
        INSERT INTO bde_targets
          (bde_id, amount, month, year)
        VALUES
          (?, ?, MONTH(?), YEAR(?))
        ON DUPLICATE KEY UPDATE
          amount = VALUES(amount)
        `,
        [
          employeeId,
          amount,
          target_date,
          target_date
        ]
      );


    res.status(201).json({

      id:
        result.insertId,

      employeeId,

      amount,

      target_date

    });


  } catch (error) {

    console.error(
      'Error saving target:',
      error
    );

    res.status(500).json({
      message:
        'Failed to save target'
    });

  }

});


// ============================================================
// GET BDE TARGETS
// ============================================================

router.get('/:id/targets', async (req, res) => {

  const employeeId =
    req.params.id;


  try {

    // NOTE: the live `bde_targets` table uses the new schema (amount, month, year).
    // The old columns (target_amount, target_month, achieved_amount) no longer exist,
    // so we read `amount` directly and synthesize `target_month` from year+month.
    // `achieved_amount` isn't stored on this table anymore, so it defaults to 0.
    const [targets] =
      await db.execute(
        `
        SELECT
          id,
          amount,
          STR_TO_DATE(CONCAT(year, '-', LPAD(month, 2, '0'), '-01'), '%Y-%m-%d') AS target_month,
          0 AS achieved_amount
        FROM bde_targets
        WHERE bde_id = ?
        ORDER BY year DESC, month DESC
        `,
        [employeeId]
      );


    res.status(200).json(
      targets
    );


  } catch (error) {

    console.error(
      'Error fetching targets:',
      error
    );

    res.status(500).json({
      message:
        'Failed to fetch targets'
    });

  }

});


// ============================================================
// UPDATE BDE TARGET
// ============================================================

router.put('/:targetId/targets', async (req, res) => {

  const {
    targetId
  } = req.params;

  const {
    amount,
    target_date
  } = req.body;


  if (!amount || !target_date) {

    return res.status(400).json({
      message:
        'Amount and target date are required'
    });

  }


  try {

    // New schema: update `amount` and derive month/year from target_date.
    const [result] =
      await db.execute(
        `
        UPDATE bde_targets
        SET
          amount = ?,
          month = MONTH(?),
          year = YEAR(?)
        WHERE id = ?
        `,
        [
          amount,
          target_date,
          target_date,
          targetId
        ]
      );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        message:
          'Target not found or not updated'
      });

    }


    res.status(200).json({
      message:
        'Target updated successfully'
    });


  } catch (error) {

    console.error(
      'Error updating target:',
      error
    );

    res.status(500).json({
      message:
        'Failed to update target'
    });

  }

});


// ============================================================
// DELETE BDE TARGET
// ============================================================

router.delete('/:targetId/targets', async (req, res) => {

  const {
    targetId
  } = req.params;


  console.log(
    targetId
  );


  try {

    const [result] =
      await db.execute(
        `
        DELETE FROM bde_targets
        WHERE id = ?
        `,
        [targetId]
      );


    if (result.affectedRows === 0) {

      return res.status(404).json({
        message:
          'Target not found or already deleted'
      });

    }


    res.status(200).json({
      message:
        'Target deleted successfully'
    });


  } catch (error) {

    console.error(
      'Error deleting target:',
      error
    );

    res.status(500).json({
      message:
        'Failed to delete target'
    });

  }

});


// ============================================================
// HR / ADMIN PROFILE PHOTO UPDATE
// EXISTING API
// ============================================================

router.patch(
  '/:id/upload-photo',
  upload.single('photo'),
  async (req, res) => {

    const {
      id
    } = req.params;


    try {

      if (!req.file) {

        return res.status(400).json({
          error:
            'No file uploaded'
        });

      }


      const [[employee]] =
        await db.query(
          `
          SELECT uploadImg
          FROM employees
          WHERE id = ?
          `,
          [id]
        );


      if (!employee) {

        return res.status(404).json({
          error:
            'Employee not found'
        });

      }


      const photoUrl =
        req.file.path ||
        req.file.filename;


      // The employees table stores the photo in `uploadImg`. Login returns this
      // column, and the header/sidebar read `user.img || user.uploadImg`, so the
      // photo persists after logout + login.
      await db.query(
        `
        UPDATE employees
        SET uploadImg = ?
        WHERE id = ?
        `,
        [
          photoUrl,
          id
        ]
      );


      res.json({

        message:
          'Photo updated successfully',

        filename:
          photoUrl

      });


    } catch (err) {

      console.error(
        'Error uploading photo:',
        err
      );

      res.status(500).json({
        error:
          'Failed to upload photo'
      });

    }

  }
);


// ============================================================
// BDE INCENTIVE
// ============================================================

router.patch('/:id/incentive', async (req, res) => {

  const {
    id
  } = req.params;


  const incentive =
    parseFloat(
      req.body.incentive ?? 0
    );


  if (
    isNaN(incentive) ||
    incentive < 0
  ) {

    return res.status(400).json({
      error:
        'Invalid incentive value'
    });

  }


  try {

    await db.query(
      `
      UPDATE employees
      SET incentive = ?
      WHERE id = ?
      `,
      [
        incentive,
        id
      ]
    );


    res.json({

      message:
        'Incentive updated successfully',

      incentive

    });


  } catch (err) {

    console.error(
      'Error updating incentive:',
      err
    );

    res.status(500).json({
      error:
        'Failed to update incentive'
    });

  }

});


module.exports = router;