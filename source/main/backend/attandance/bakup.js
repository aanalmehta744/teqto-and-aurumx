const express = require('express');
const router = express.Router();
const db = require('../connection'); // Ensure the path is correct
const cron = require('node-cron');

router.get('/check/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const { date } = req.query;
    console.log(req.params, req.query);
    const [result] = await db.query(
        'SELECT * FROM attendance WHERE employee_id = ? AND date = ? AND check_in IS NOT NULL',
        [employeeId, date]
    );

    if (result.length > 0) {
        return res.json({ hasCheckedIn: true });
    } else {
        return res.json({ hasCheckedIn: false });
    }
});

// Schedule cron job at midnight
cron.schedule('19 10 * * *', async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        console.log(`Cron job started at midnight for date: ${today}`);

        const [employees] = await db.query('SELECT id FROM employees');  // Use .promise()

        if (employees.length === 0) {
            console.log('No employees found.');
        }

        for (const employee of employees) {
            try {
                await db.query( // Use .promise() here too
                    `INSERT INTO attendance (employee_id, date, status) VALUES (?, ?, 'Absent')
                     ON DUPLICATE KEY UPDATE status = 'Absent', check_in = NULL, check_out = NULL, hours = 0.00`,
                    [employee.id, today]
                );
            } catch (error) {
                console.error(`Error processing employee ID ${employee.id}:`, error);
            }
        }

        console.log(`All employees marked as absent for ${today}`);
    } catch (error) {
        console.error('Error initializing attendance:', error);
    }
});

router.get('/employee-attendance', async (req, res) => {
    try {
        const [results] = await db.query('SELECT a.id, a.employee_id, a.date, a.status,a.check_in,a.check_out,a.status,a.hours, e.fullName AS employee_name,a.break, e.email AS employee_email FROM attendance a JOIN employees e ON a.employee_id = e.id ORDER BY a.date DESC;');
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching attendance data', err);
        res.status(500).json({ message: 'Error fetching attendance data', error: err });
    }
});
// When an employee starts the timer, update the start_time and set the status to present
router.put('/start-timer', async (req, res) => {
    const { employee_id } = req.body;
    const check_in = new Date();
    console.log('Employee ID:', employee_id);
    console.log('Start Time:', check_in);

    try {
        await db.execute(
            `UPDATE attendance 
           SET check_in = ?, status = 'Present'
           WHERE employee_id = ? AND date = CURDATE()`,
            [check_in, employee_id]
        );

        res.json({ message: 'Timer started successfully.' });
    } catch (error) {
        console.error('Error executing query:', error);
        res.status(500).json({ error: 'Failed to start timer.' });
    }
});


// Stop timer: update check_out and total hours
router.put('/stop-timer', async (req, res) => {
    const { employee_id, startDate } = req.body;
    const today = new Date(startDate).toISOString().split('T')[0];
    const now = new Date();

    try {
        const [rows] = await db.query(
            `SELECT check_in, elapsed_time, is_paused 
       FROM attendance WHERE employee_id = ? AND date = ?`,
            [employee_id, today]
        );

        if (rows.length === 0) {
            return res.status(404).json({ error: 'No attendance record found.' });
        }

        let totalSeconds = rows[0].elapsed_time || 0;

        if (!rows[0].is_paused && rows[0].check_in) {
            totalSeconds += Math.floor((now - new Date(rows[0].check_in)) / 1000);
        }

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        const workedTimeFormatted = `${hours}.${minutes.toString().padStart(2, '0')}.${seconds.toString().padStart(2, '0')}`;

        await db.query(
            `UPDATE attendance 
       SET check_out = ?, hours = ?, is_paused = 0, elapsed_time = 0
       WHERE employee_id = ? AND date = ?`,
            [now, workedTimeFormatted, employee_id, today]
        );

        res.json({ message: 'Timer stopped successfully.', workedTimeFormatted });
    } catch (error) {
        console.error('Stop timer error:', error);
        res.status(500).json({ error: 'Failed to stop timer.' });
    }
});

// attendance.routes.js or attendances.js
router.get('/:employeeId', async (req, res) => {
    const employeeId = parseInt(req.params.employeeId, 10);

    // Validate employeeId
    if (isNaN(employeeId)) {
        return res.status(400).json({ message: 'Invalid employee ID' });
    }

    try {
        // Query attendance records for the given employee ID
        const [attendanceDetails] = await db.query(
            `SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC`,
            [employeeId]
        );

        if (attendanceDetails.length > 0) {
            //  console.log(attendanceDetails);
            res.status(200).json(attendanceDetails);
        } else {
            return res.status(404).json({
                message: `No attendance records found for employee ID: ${employeeId}`,
            });
        }

    } catch (err) {
        console.error('Error fetching attendance details:', err);
        return res.status(500).json({
            message: 'Error fetching attendance details',
            error: err.message,
        });
    }
});

// Get all attendance records
router.get('/', async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM attendance');
        res.status(200).json(results);
    } catch (err) {
        console.error('Error fetching attendance data', err);
        res.status(500).json({ message: 'Error fetching attendance data', error: err });
    }
});
// Example pseudo-code for Express route
router.get('/active/:employeeId', async (req, res) => {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    console.log(today, employeeId);
    const [attendance] = await db.query(
        `SELECT * FROM attendance 
     WHERE employee_id = ? AND date = ? AND check_out IS NULL`,
        [employeeId, today]
    );

    if (attendance) {
        res.json({ success: true, data: attendance });
    } else {
        res.json({ success: false, message: 'No active attendance found.' });
    }
});

router.put('/add-break', async (req, res) => {
    const { employeeId, breakDuration, startDate } = req.body;
    const today = new Date(startDate).toISOString().split('T')[0];
    console.log(req.body);
    if (!employeeId || !breakDuration) {
        return res.status(400).json({ success: false, message: 'Missing employeeId or breakDuration' });
    }

    try {
        // Fetch existing break time (if any)
        const [rows] = await db.query(
            `SELECT break FROM attendance WHERE employee_id = ? AND date = ?`,
            [employeeId, today]
        );

        let totalBreak = breakDuration; // default to current break
        console.log(rows)
        if (rows.length > 0 && rows[0].break) {
            const existingBreak = rows.length > 0 && rows[0].break ? rows[0].break : '00:00:00';
            console.log(existingBreak);
            totalBreak = addBreakTimes(existingBreak, breakDuration);
        }
        console.log(totalBreak);
        // Update with new total break
        const [result] = await db.query(
            `UPDATE attendance 
       SET break = ?, updated_at = NOW()
       WHERE employee_id = ? AND date = ?`,
            [totalBreak, employeeId, today]
        );

        res.json({ success: true, message: 'Break time added.' });

    } catch (err) {
        console.error('Error updating break time:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// Helper: Add two time strings like "00:10:00" + "00:05:00"
function addBreakTimes(time1, time2) {
    // Split safely
    const [h1, m1, s1] = time1.split(':').map(Number);
    const [h2, m2, s2] = time2.split(':').map(Number);

    // Convert to seconds
    const totalSeconds = (h1 * 3600 + m1 * 60 + s1) + (h2 * 3600 + m2 * 60 + s2);

    // Convert back to HH:MM:SS
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}
router.put('/pause-timer', async (req, res) => {
    const { employee_id, startDate } = req.body;
    const today = new Date(startDate).toISOString().split('T')[0];

    try {
        const [rows] = await db.query(
            `SELECT check_in, elapsed_time FROM attendance 
       WHERE employee_id = ? AND date = ?`,
            [employee_id, today]
        );

        if (rows.length === 0 || !rows[0].check_in) {
            return res.status(404).json({ message: 'No active timer to pause.' });
        }

        const checkInTime = new Date(rows[0].check_in);
        const now = new Date();
        const diffSeconds = Math.floor((now - checkInTime) / 1000);

        const totalElapsed = (rows[0].elapsed_time || 0) + diffSeconds;

        await db.query(
            `UPDATE attendance 
       SET is_paused = 1, elapsed_time = ?, check_in = NULL 
       WHERE employee_id = ? AND date = ?`,
            [totalElapsed, employee_id, today]
        );

        res.json({ message: 'Timer paused successfully.', elapsed_time: totalElapsed });
    } catch (error) {
        console.error('Pause error:', error);
        res.status(500).json({ error: 'Failed to pause timer.' });
    }
});
router.put('/resume-timer', async (req, res) => {
    const { employee_id, startDate } = req.body;
    const today = new Date(startDate).toISOString().split('T')[0];

    try {
        const now = new Date();

        await db.query(
            `UPDATE attendance 
       SET is_paused = 0, check_in = ? 
       WHERE employee_id = ? AND date = ?`,
            [now, employee_id, today]
        );

        res.json({ message: 'Timer resumed successfully.', check_in: now });
    } catch (error) {
        console.error('Resume error:', error);
        res.status(500).json({ error: 'Failed to resume timer.' });
    }
});

module.exports = router;
