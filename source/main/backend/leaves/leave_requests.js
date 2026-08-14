const express = require('express');
const router = express.Router();
const db = require('../connection'); // Assume a database connection file
const { sendLeaveNotification } = require('./emailService');

// 1. Submit Leave Request
router.post('/', async (req, res) => {
    const { employee_id, leave_type, start_date, end_date, status = 'Pending', reason, halfDay, sandwich_confirm } = req.body;

    const query = `
        INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, no_of_days, status, halfDay, sandwich_confirm)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;


    try {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (isNaN(startDate) || isNaN(endDate)) {
            return res.status(400).json({ error: 'Invalid date format.' });
        }

        // const formattedStartDate = startDate.toISOString().slice(0, 19).replace('T', ' ');
        // const formattedEndDate = endDate.toISOString().slice(0, 19).replace('T', ' ');
        function formatMySQL(date) {
  const d = new Date(date);

  const pad = (n) => (n < 10 ? '0' + n : n);

  return (
    d.getFullYear() +
    '-' +
    pad(d.getMonth() + 1) +
    '-' +
    pad(d.getDate()) +
    ' ' +
    pad(d.getHours()) +
    ':' +
    pad(d.getMinutes()) +
    ':' +
    pad(d.getSeconds())
  );
}const formattedStartDate = formatMySQL(startDate);
const formattedEndDate = formatMySQL(endDate);

        let numberOfDays;
        // Half Day counts as 0.5; Full Day or empty counts actual calendar days
        if (halfDay === 'Half Day') {
            numberOfDays = 0.5;
        } else {
            numberOfDays = Math.floor((endDate - startDate) / (1000 * 3600 * 24)) + 1;
        }

        const [result] = await db.query(query, [
            employee_id,
            leave_type,
            formattedStartDate,
            formattedEndDate,
            reason,
            numberOfDays,
            status,
            halfDay || '',
            sandwich_confirm
        ]);

        // ✅ If leave is Paid and Approved, reduce employee's leave balance
        if (leave_type === 'Paid' && status === 'Approved') {
            const updateBalanceQuery = `
                UPDATE employees 
                SET leave_balance = leave_balance - ? 
                WHERE id = ?
            `;
            await db.query(updateBalanceQuery, [numberOfDays, employee_id]);
        }
        // ✅ Send notification
        await sendLeaveNotification(employee_id, leave_type, formattedStartDate, formattedEndDate, numberOfDays, reason, status);

        res.status(201).json({ message: 'Leave request submitted', requestId: result.insertId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Leave Requests (Pending & Approved)
router.get('/', async (req, res) => {
    const query = `SELECT lr.*, e.fullName AS employee_name, e.uploadImg, e.role AS employee_role
                   FROM leave_requests lr
                   JOIN employees e ON lr.employee_id = e.id
                   ORDER BY lr.created_at DESC`;

    try {
        const [results] = await db.query(query); // Destructure to get the result rows
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/leave-balance', async (req, res) => {
    const query = `
        SELECT 
            e.id AS employee_id,
            e.fullName,
            e.role,
            e.total_leave AS total,
            e.leave_balance AS used,

            -- Used Paid Leave (current year only)
        IFNULL(SUM(CASE 
            WHEN r.leave_type = 'Paid' 
            AND r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days
            ELSE 0
        END), 0) AS used_balance,

        -- Current Balance = leave_balance + used approved leaves (current year)
        (
        e.leave_balance + IFNULL(SUM(CASE 
            WHEN r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days
            ELSE 0
        END), 0)
        ) AS current_balance,

        -- Remaining Paid Leave (current year only)
        (
        (e.leave_balance + IFNULL(SUM(CASE 
            WHEN r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days
            ELSE 0
        END), 0))
        -
        IFNULL(SUM(CASE 
            WHEN r.leave_type = 'Paid'
            AND r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days
            ELSE 0
        END), 0)
        ) AS remaining_paid_leave

        FROM employees e
        LEFT JOIN leave_requests r ON e.id = r.employee_id
        GROUP BY e.id, e.fullName, e.role, e.total_leave, e.leave_balance
        ORDER BY e.fullName ASC;
    `;

    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

router.get('/leave-balance/:id', async (req, res) => {
    const { id } = req.params;
    const query = `
    SELECT 
      e.id AS employee_id,
      e.fullName,
      12 AS total_paid_leave,    -- Total annual paid leave
    
      -- Used Paid Leave (current year only)
        IFNULL(SUM(CASE 
            WHEN r.leave_type = 'Paid'
            AND r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days 
            ELSE 0 
        END), 0) AS used_paid_leave,

        e.total_leave AS total_paid_leave,

      -- Current Balance = leave_balance + used_paid_leave
        (e.leave_balance + IFNULL(SUM(CASE 
            WHEN r.leave_type = 'Paid' AND r.status = 'Approved' THEN r.no_of_days 
            ELSE 0 
        END), 0)) AS current_balance,

      -- Used Unpaid Leave (yearly)
        IFNULL(SUM(CASE 
            WHEN r.leave_type = 'Unpaid'
            AND r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days 
            ELSE 0 
        END), 0) AS used_unpaid_leave,

      -- Used Sick Leave (monthly: current month only)
      (
        SELECT IFNULL(SUM(r2.no_of_days), 0)
        FROM leave_requests r2
        WHERE r2.employee_id = e.id
          AND r2.leave_type = 'Sick'
          AND r2.status = 'Approved'
          AND MONTH(r2.start_date) = MONTH(CURRENT_DATE())
          AND YEAR(r2.start_date) = YEAR(CURRENT_DATE())
      ) AS used_sick_leave,

      -- Remaining Paid Leave (yearly)
      (12 - IFNULL(SUM(CASE 
          WHEN r.leave_type = 'Paid' AND r.status = 'Approved' THEN r.no_of_days 
          ELSE 0 
      END), 0)) AS remaining_paid_leave,

      -- Remaining Sick Leave (monthly: 1 per month)
      (1 - (
        SELECT IFNULL(SUM(r2.no_of_days), 0)
        FROM leave_requests r2
        WHERE r2.employee_id = e.id
          AND r2.leave_type = 'Sick'
          AND r2.status = 'Approved'
          AND MONTH(r2.start_date) = MONTH(CURRENT_DATE())
          AND YEAR(r2.start_date) = YEAR(CURRENT_DATE())
      )) AS remaining_sick_leave

    FROM employees e
    LEFT JOIN leave_requests r ON e.id = r.employee_id
    WHERE e.id = ?
    GROUP BY e.id, e.fullName, e.total_leave, e.leave_balance;
  `;

    try {
        const [result] = await db.query(query, [id]);
        if (!result.length) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json(result[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// routes/leaves.js
router.get('/check-overlap', async (req, res) => {
    const { employee_id, start_date, end_date, leaveId } = req.query;
    console.log(req.query);

    if (!employee_id || !start_date || !end_date) {
        return res.status(400).json({ message: 'Missing parameters' });
    }

    try {
        let query = `
      SELECT * FROM leave_requests
      WHERE employee_id = ?
      AND (
        (start_date <= ? AND end_date >= ?) OR
        (start_date <= ? AND end_date >= ?) OR
        (start_date >= ? AND end_date <= ?)
      )
    `;

        const params = [employee_id, end_date, start_date, start_date, end_date, start_date, end_date];

        if (leaveId) {
            query += ` AND id != ?`;
            params.push(leaveId);
        }

        const [rows] = await db.query(query, params);

        res.status(200).json({ overlap: rows.length > 0, overlappingLeaves: rows });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});



// 6. Update Leave Request


// router.put('/:id', async (req, res) => {
//     console.log("========== MY NEW PUT ROUTE RUNNING ==========");
//     try {
//         console.log("PUT BODY:", req.body);

//         const { id } = req.params;

//         const {
//             approvedBy,
//             leave_type,
//             start_date,
//             end_date,
//             reason,
//             status,
//             employee_id,
//             halfDay,
//             sandwich_confirm
//         } = req.body;

//         // Check approver
//         if (!approvedBy) {
//             return res.status(400).json({ error: 'approvedBy is required' });
//         }

//         const [user] = await db.query(
//             'SELECT role FROM employees WHERE id = ?',
//             [approvedBy]
//         );

//         if (!user.length) {
//             return res.status(404).json({
//                 error: 'Approver not found. Please log out and log in again.'
//             });
//         }

//         if (!['Admin', 'HR'].includes(user[0].role)) {
//             return res.status(403).json({
//                 error: 'Only Admin or HR can approve/reject leave requests'
//             });
//         }

//         // Format dates for MySQL
//         // const formattedStartDate = start_date
//         //     .replace('T', ' ')
//         //     .replace('Z', '')
//         //     .split('.')[0];

//         // const formattedEndDate = end_date
//         //     .replace('T', ' ')
//         //     .replace('Z', '')
//         //     .split('.')[0];
//         function formatMySQL(date) {
//   const d = new Date(date);
//   const pad = (n) => (n < 10 ? '0' + n : n);

//   return (
//     d.getFullYear() +
//     '-' +
//     pad(d.getMonth() + 1) +
//     '-' +
//     pad(d.getDate()) +
//     ' ' +
//     pad(d.getHours()) +
//     ':' +
//     pad(d.getMinutes()) +
//     ':' +
//     pad(d.getSeconds())
//   );
// }

//         console.log('MYSQL START:', formattedStartDate);
//         console.log('MYSQL END:', formattedEndDate);

//         const startDateObj = new Date(formattedStartDate);
//         const endDateObj = new Date(formattedEndDate);

//         let numberOfDays;

//         if (halfDay === 'Half Day' || halfDay === 1) {
//             numberOfDays = 0.5;
//         } else {
//             numberOfDays =
//                 Math.floor(
//                     (endDateObj - startDateObj) /
//                     (1000 * 60 * 60 * 24)
//                 ) + 1;
//         }

//         const updateQuery = `
//             UPDATE leave_requests
//             SET
//                 leave_type = ?,
//                 start_date = ?,
//                 end_date = ?,
//                 reason = ?,
//                 no_of_days = ?,
//                 status = ?,
//                 halfDay = ?,
//                 sandwich_confirm = ?
//             WHERE id = ?
//         `;

//         const [result] = await db.query(updateQuery, [
//             leave_type,
//             formattedStartDate,
//             formattedEndDate,
//             reason,
//             numberOfDays,
//             status,
//             halfDay || 0,
//             sandwich_confirm || 0,
//             id
//         ]);

//         if (result.affectedRows === 0) {
//             return res.status(404).json({
//                 error: 'Leave request not found'
//             });
//         }

//         // Deduct leave balance only when approved
//         if (
//             leave_type &&
//             leave_type.toLowerCase() === 'paid' &&
//             status &&
//             status.toLowerCase() === 'approved'
//         ) {
//             await db.query(
//                 `
//                 UPDATE employees
//                 SET leave_balance = leave_balance - ?
//                 WHERE id = ?
//                 `,
//                 [numberOfDays, employee_id]
//             );
//         }

//         // Send Email
//         await sendLeaveNotification(
//             employee_id,
//             leave_type,
//             formattedStartDate,
//             formattedEndDate,
//             numberOfDays,
//             reason,
//             status,
//             'update'
//         );

//         res.status(200).json({
//             success: true,
//             message: 'Leave request updated successfully'
//         });

//     } catch (err) {
//         console.error('PUT ERROR:', err);

//         res.status(500).json({
//             success: false,
//             error: err.message
//         });
//     }
// });

router.put('/:id', async (req, res) => {
    console.log("========== UPDATE LEAVE REQUEST ==========");
    console.log("PARAM ID:", req.params.id);
    console.log("BODY:", req.body);

    try {
        const { id } = req.params;

        const {
            approvedBy,
            leave_type,
            start_date,
            end_date,
            reason,
            status,
            employee_id,
            halfDay,
            sandwich_confirm
        } = req.body;

        console.log("approvedBy =", approvedBy);

        // Validate approver
        if (!approvedBy) {
            return res.status(400).json({
                success: false,
                error: "approvedBy is required"
            });
        }

        console.log("Checking approver user...");

        const [user] = await db.query(
            "SELECT role FROM employees WHERE id = ?",
            [approvedBy]
        );

        console.log("USER RESULT:", user);

        if (!user.length) {
            return res.status(404).json({
                success: false,
                error: "Approver not found"
            });
        }

        if (!["Admin", "HR"].includes(user[0].role)) {
            return res.status(403).json({
                success: false,
                error: "Only Admin or HR can approve/reject leave requests"
            });
        }

        // Format date for MySQL
        const formatMySQL = (date) => {
            const d = new Date(date);

            const pad = (n) => (n < 10 ? '0' + n : n);

            return (
                d.getFullYear() +
                '-' +
                pad(d.getMonth() + 1) +
                '-' +
                pad(d.getDate()) +
                ' ' +
                pad(d.getHours()) +
                ':' +
                pad(d.getMinutes()) +
                ':' +
                pad(d.getSeconds())
            );
        };

        const formattedStartDate = formatMySQL(start_date);
        const formattedEndDate = formatMySQL(end_date);

        console.log("MYSQL START:", formattedStartDate);
        console.log("MYSQL END:", formattedEndDate);

        const startObj = new Date(formattedStartDate);
        const endObj = new Date(formattedEndDate);

        let numberOfDays = 1;

        if (
            halfDay === 'Half Day' ||
            halfDay === 'First Half' ||
            halfDay === 'Second Half'
        ) {
            numberOfDays = 0.5;
        } else {
            numberOfDays =
                Math.floor(
                    (endObj.getTime() - startObj.getTime()) /
                    (1000 * 60 * 60 * 24)
                ) + 1;
        }

        const updateQuery = `
            UPDATE leave_requests
            SET
                leave_type = ?,
                start_date = ?,
                end_date = ?,
                reason = ?,
                no_of_days = ?,
                status = ?,
                halfDay = ?,
                sandwich_confirm = ?
            WHERE id = ?
        `;

        const [result] = await db.query(updateQuery, [
            leave_type,
            formattedStartDate,
            formattedEndDate,
            reason,
            numberOfDays,
            status,
            halfDay || '',
            sandwich_confirm ? 1 : 0,
            id
        ]);

        console.log("UPDATE RESULT:", result);

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Leave request not found"
            });
        }

        // Deduct paid leave only when approved
        if (
            leave_type &&
            leave_type.toLowerCase() === "paid" &&
            status &&
            status.toLowerCase() === "approved"
        ) {
            console.log("Updating employee leave balance...");

            await db.query(
                `
                UPDATE employees
                SET leave_balance = leave_balance - ?
                WHERE id = ?
                `,
                [numberOfDays, employee_id]
            );

            console.log("Leave balance updated.");
        }

        console.log("UPDATE SUCCESS");

        return res.status(200).json({
            success: true,
            message: "Leave request updated successfully"
        });

    } catch (err) {
        console.error("PUT ERROR:", err);

        return res.status(500).json({
            success: false,
            error: err.message
        });
    }
});

// 7. Delete Leave Request
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const query = `DELETE FROM leave_requests WHERE id = ?`;

    try {
        const [result] = await db.query(query, [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Leave request not found' });
        }
        res.json({ message: 'Leave request deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 5. Get All Leave Requests by Employee ID
router.get('/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const query = `SELECT lr.*, e.fullName AS employee_name, e.role AS employee_role
                   FROM leave_requests lr
                   JOIN employees e ON lr.employee_id = e.id
                   WHERE lr.employee_id = ?
                   ORDER BY lr.created_at DESC`;

    try {
        const [results] = await db.query(query, [employeeId]);
        res.json(results);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
