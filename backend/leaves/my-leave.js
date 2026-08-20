const express = require('express');
const router = express.Router();
const db = require('../connection');
const cron = require('node-cron');

// Helper to format JavaScript Date into MySQL DATETIME
function formatDateForMySQL(date) {
    return date.toISOString().slice(0, 19).replace('T', ' ');
}


cron.schedule('0 0 1 1 *', async () => {
    try {
        console.log('🎉 New Year Leave Balance Reset Started');

        const query = `
            UPDATE employees
            SET leave_balance = 12,
                total_leave = 12,
                updated_at = NOW()
            WHERE status = 1
        `;

        const [result] = await db.query(query);

        console.log(`✅ Leave balance reset for ${result.affectedRows} employees`);
    } catch (error) {
        console.error('❌ Error resetting leave balance:', error);
    }
});

// ✅ 1. Create — Submit Leave Request
router.post('/', async (req, res) => {
    const { employee_id, leave_type, start_date, end_date, status = 'Pending', reason, halfDay } = req.body;
    console.log("Request data", req.body);

    // Check if the necessary fields are present
    if (!employee_id || !leave_type || !start_date || !end_date || !reason) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (isNaN(startDate) || isNaN(endDate)) {
            return res.status(400).json({ error: 'Invalid date format.' });
        }

        const formattedStartDate = formatDateForMySQL(startDate);
        const formattedEndDate = formatDateForMySQL(endDate);
        
        let numberOfDays;

        // Half Day counts as 0.5; Full Day or empty counts actual calendar days
        if (halfDay === 'Half Day') {
            numberOfDays = 0.5;
        } else {
            numberOfDays = Math.floor((endDate - startDate) / (1000 * 3600 * 24)) + 1;
        }

        const query = `
            INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason, no_of_days, status, halfDay) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const [result] = await db.query(query, [
            employee_id,
            leave_type,
            formattedStartDate,
            formattedEndDate,
            reason,
            numberOfDays,
            status,
            halfDay
        ]);

        res.status(201).json({ message: 'Leave request submitted successfully.', requestId: result.insertId });
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Server error while submitting leave request.' });
    }
});

// ✅ 2. Read All — Fetch all Leave Requests (with Employee info)
router.get('/', async (req, res) => {
    const query = `
        SELECT lr.*, e.fullName AS employee_name, e.uploadImg
        FROM leave_requests lr 
        JOIN employees e ON lr.employee_id = e.id 
        ORDER BY lr.created_at DESC
    `;

    try {
        const [results] = await db.query(query);
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching leave requests:', err);
        res.status(500).json({ error: 'Server error while fetching leave requests.' });
    }
});


// ✅ 3. Read by Employee — Fetch leave records by employee ID (must be before /:id)
router.get('/employee/:employeeId', async (req, res) => {
    const { employeeId } = req.params;

    const query = `
        SELECT lr.*, e.fullName AS employee_name, e.uploadImg
        FROM leave_requests lr
        JOIN employees e ON lr.employee_id = e.id
        WHERE lr.employee_id = ?
        ORDER BY lr.start_date DESC
    `;

    try {
        const [results] = await db.query(query, [employeeId]);

        if (results.length === 0) {
            return res.status(404).json({ message: 'No leave records found for this employee.' });
        }

        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching leave records:', err);
        res.status(500).json({ error: 'Server error while fetching leave records.' });
    }
});

// ✅ 4. Read One — Fetch Leave Request by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [rows] = await db.query('SELECT * FROM leave_requests WHERE id = ?', [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Leave request not found.' });
        }

        res.status(200).json(rows[0]);
    } catch (err) {
        console.error('Error fetching leave request:', err);
        res.status(500).json({ error: 'Server error while fetching leave request.' });
    }
});


// ✅ 5. Update — Update a Leave Request by ID
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { leave_type, start_date, end_date, reason, status,halfDay } = req.body;

    if (!leave_type || !start_date || !end_date || !reason || !status) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const startDate = new Date(start_date);
        const endDate = new Date(end_date);

        if (isNaN(startDate) || isNaN(endDate)) {
            return res.status(400).json({ error: 'Invalid date format.' });
        }

        const formattedStartDate = formatDateForMySQL(startDate);
        const formattedEndDate = formatDateForMySQL(endDate);
        const numberOfDays = Math.floor((endDate - startDate) / (1000 * 3600 * 24)) + 1;

        const query = `
            UPDATE leave_requests 
            SET leave_type = ?, start_date = ?, end_date = ?, reason = ?, no_of_days = ?, halfDay = ? 
            WHERE id = ?
        `;

        const [result] = await db.query(query, [
            leave_type,
            formattedStartDate,
            formattedEndDate,
            reason,
            numberOfDays,
            halfDay,
            id
        ]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Leave request not found.' });
        }

        res.status(200).json({ message: 'Leave request updated successfully.' });
    } catch (err) {
        console.error('Error updating leave request:', err);
        res.status(500).json({ error: 'Server error while updating leave request.' });
    }
});

// ✅ 6. Delete — Delete a Leave Request by ID
router.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM leave_requests WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Leave request not found.' });
        }

        res.status(200).json({ message: 'Leave request deleted successfully.' });
    } catch (err) {
        console.error('Error deleting leave request:', err);
        res.status(500).json({ error: 'Server error while deleting leave request.' });
    }
});

module.exports = router;
