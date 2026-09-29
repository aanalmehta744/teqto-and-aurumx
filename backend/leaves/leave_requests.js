const express = require('express');
const router = express.Router();
const db = require('../connection'); // Assume a database connection file
const { sendLeaveNotification } = require('./emailService');
const { getIO } = require('../socket');
const jwt = require('jsonwebtoken');

const isApprovedPaidLeave = (leave) =>
    String(leave?.leave_type || '').trim().toLowerCase() === 'paid' &&
    String(leave?.status || '').trim().toLowerCase() === 'approved';

const getLeaveDays = (startDate, endDate, halfDay) => {
    if (['Half Day', 'First Half', 'Second Half'].includes(halfDay)) return 0.5;
    const days = Math.floor((endDate.getTime() - startDate.getTime()) / 86400000) + 1;
    return days > 0 ? days : 0;
};

// A deleted/inactive employee must never be able to create or change leave data.
async function getActiveEmployee(employeeId, connection = db) {
    const [employees] = await connection.query(
        'SELECT id, leave_balance FROM employees WHERE id = ? AND status = 1 LIMIT 1',
        [employeeId]
    );
    return employees[0] || null;
}

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

        if (isNaN(startDate) || isNaN(endDate) || endDate < startDate) {
            return res.status(400).json({ error: 'Invalid date format.' });
        }

        if (!await getActiveEmployee(employee_id)) {
            return res.status(404).json({ error: 'Employee not found or is no longer active.' });
        }

        // Employee self-service requests are limited to three calendar days and
        // cannot include weekend dates. Admin/HR requests remain unrestricted.
        const auth = String(req.headers.authorization || '');
        const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
        let requesterIsAdminOrHR = false;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'defaultSecret');
                const requesterId = decoded.id ?? decoded.userId;
                if (requesterId) {
                    const [[requester]] = await db.query('SELECT role, department FROM employees WHERE id = ?', [requesterId]);
                    requesterIsAdminOrHR = String(requester?.role || '').toLowerCase() === 'admin' || String(requester?.department || '').toLowerCase() === 'hr';
                }
            } catch (authError) {
                return res.status(401).json({ error: 'Invalid or expired authentication token.' });
            }
        }
        if (!requesterIsAdminOrHR) {
            const startDay = Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate());
            const endDay = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
            const calendarDays = Math.floor((endDay - startDay) / 86400000) + 1;
            if (calendarDays > 3) return res.status(400).json({ error: 'Leave cannot be requested for more than 3 consecutive days.' });
            for (let day = new Date(startDay); day.getTime() <= endDay; day.setUTCDate(day.getUTCDate() + 1)) {
                if (day.getUTCDay() === 0 || day.getUTCDay() === 6) return res.status(400).json({ error: 'Employees cannot add leave on Saturday or Sunday.' });
            }
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

        const numberOfDays = getLeaveDays(startDate, endDate, halfDay);

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
        if (isApprovedPaidLeave({ leave_type, status })) {
            const updateBalanceQuery = `
                UPDATE employees 
                SET leave_balance = leave_balance - ? 
                WHERE id = ?
            `;
            await db.query(updateBalanceQuery, [numberOfDays, employee_id]);
        }
        // 🔔 Notify HR/Admin (real-time) that a new leave request was submitted.
        try {
            const [empRows] = await db.query('SELECT fullName FROM employees WHERE id = ? LIMIT 1', [employee_id]);
            getIO().emit('leave_request_created', {
                employee_id,
                employee_name: empRows[0]?.fullName || 'An employee',
                leave_type,
                start_date: formattedStartDate,
                end_date: formattedEndDate,
            });
        } catch (e) { console.error('leave_request_created emit failed:', e.message); }

        // Respond immediately — don't make the user wait on the email.
        res.status(201).json({ message: 'Leave request submitted', requestId: result.insertId });

        // ✅ Send the email notification in the background (non-blocking).
        sendLeaveNotification(employee_id, leave_type, formattedStartDate, formattedEndDate, numberOfDays, reason, status)
            .catch((e) => console.error('sendLeaveNotification failed:', e.message));
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
    // Clean, self-consistent model:
    //   total     = total_leave (allotted)
    //   remaining = leave_balance (decrements as leaves are used)
    //   used      = total - remaining
    const query = `
        SELECT
            e.id AS employee_id,
            e.fullName,
            e.role,
            e.total_leave AS total,
            /* Sick leave is displayed as used leave too; only Paid leave
               changes the paid-leave balance. */
            ((e.total_leave - e.leave_balance) + IFNULL((
                SELECT SUM(lr.no_of_days)
                FROM leave_requests lr
                WHERE lr.employee_id = e.id
                  AND lr.leave_type = 'Sick'
                  AND lr.status = 'Approved'
                  AND YEAR(lr.start_date) = YEAR(CURDATE())
            ), 0)) AS used,
            e.leave_balance AS remaining
        FROM employees e
        ORDER BY e.fullName ASC;
    `;

    try {
        const [rows] = await db.query(query);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update an employee's leave balance / total leave (Admin & HR).
router.put('/leave-balance/:id', async (req, res) => {
    const employeeId = parseInt(req.params.id, 10);
    const { leave_balance, total_leave } = req.body;

    if (isNaN(employeeId)) {
        return res.status(400).json({ error: 'Invalid employee id' });
    }

    const fields = [];
    const values = [];
    if (leave_balance !== undefined && leave_balance !== null && leave_balance !== '') {
        fields.push('leave_balance = ?');
        values.push(Number(leave_balance));
    }
    if (total_leave !== undefined && total_leave !== null && total_leave !== '') {
        fields.push('total_leave = ?');
        values.push(Number(total_leave));
    }
    if (!fields.length) {
        return res.status(400).json({ error: 'Nothing to update' });
    }
    values.push(employeeId);

    try {
        const [result] = await db.query(
            `UPDATE employees SET ${fields.join(', ')} WHERE id = ?`,
            values
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }
        res.json({ success: true, message: 'Leave balance updated successfully' });
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
      -- Used Paid Leave (current year only)
        IFNULL(SUM(CASE 
            WHEN r.leave_type = 'Paid'
            AND r.status = 'Approved'
            AND YEAR(r.start_date) = YEAR(CURDATE())
            THEN r.no_of_days 
            ELSE 0 
        END), 0) AS used_paid_leave,

        e.total_leave AS total_paid_leave,

      -- Remaining paid balance is maintained on the employee record.
        e.leave_balance AS current_balance,

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
      e.leave_balance AS remaining_paid_leave,

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
router.put('/:id', async (req, res) => {
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

        if (!approvedBy) {
            return res.status(400).json({
                success: false,
                error: "approvedBy is required"
            });
        }

        const [user] = await db.query(
            "SELECT role, department FROM employees WHERE id = ? AND status = 1",
            [approvedBy]
        );

        if (!user.length) {
            return res.status(404).json({
                success: false,
                error: "Approver not found"
            });
        }

        const approverRole = String(user[0].role || '').trim().toLowerCase();
        const approverDepartment = String(user[0].department || '').trim().toLowerCase();

        // HR users are stored as role=Employee with department=HR.
        // They must have the same leave approval/rejection permission as Admin.
        if (approverRole !== 'admin' && approverDepartment !== 'hr') {
            return res.status(403).json({
                success: false,
                error: "Only Admin or HR can approve/reject leave requests"
            });
        }

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

        const startObj = new Date(formattedStartDate);
        const endObj = new Date(formattedEndDate);
        if (isNaN(startObj) || isNaN(endObj) || endObj < startObj) {
            return res.status(400).json({ success: false, error: 'Invalid leave dates' });
        }
        const numberOfDays = getLeaveDays(startObj, endObj, halfDay);

        // Read the old state first. This prevents a second deduction when an
        // approved leave is edited, re-saved, rejected, or changed in length.
        const [existing] = await db.query(
            'SELECT employee_id, leave_type, status, no_of_days FROM leave_requests WHERE id = ? LIMIT 1',
            [id]
        );
        if (!existing.length) {
            return res.status(404).json({ success: false, error: 'Leave request not found' });
        }
        const leaveEmployeeId = existing[0].employee_id;
        if (Number(employee_id) !== Number(leaveEmployeeId)) {
            return res.status(400).json({ success: false, error: 'Leave employee cannot be changed' });
        }
        if (!await getActiveEmployee(leaveEmployeeId)) {
            return res.status(404).json({ success: false, error: 'Employee not found or is no longer active.' });
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

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                error: "Leave request not found"
            });
        }

        const oldPaidDays = isApprovedPaidLeave(existing[0]) ? Number(existing[0].no_of_days) : 0;
        const newPaidDays = isApprovedPaidLeave({ leave_type, status }) ? numberOfDays : 0;
        const balanceChange = newPaidDays - oldPaidDays;
        if (balanceChange !== 0) {
            await db.query(
                'UPDATE employees SET leave_balance = leave_balance - ? WHERE id = ? AND status = 1',
                [balanceChange, leaveEmployeeId]
            );
        }

        // 🔔 Notify the employee in real-time when their leave is Approved/Rejected.
        try {
            const normalized = String(status || '').trim().toLowerCase();
            if (leaveEmployeeId && (normalized === 'approved' || normalized === 'rejected')) {
                getIO().to(`user_${leaveEmployeeId}`).emit('leave_status_changed', {
                    status,
                    leave_type,
                    start_date,
                    end_date,
                });
            }
        } catch (e) { console.error('leave_status_changed emit failed:', e.message); }

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
