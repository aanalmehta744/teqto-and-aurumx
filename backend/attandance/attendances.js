const express = require('express');
const router = express.Router();
const db = require('../connection'); // Ensure the path is correct
const cron = require('node-cron');

const AUTO_CHECKOUT_HOUR = 19;
const AUTO_CHECKOUT_MINUTE = 30;

/**
 * Close any open attendance record from a completed calendar day.
 * The 7:30 PM timestamp is only a fallback: an earlier/later manual
 * checkout is never overwritten because we only touch rows with NULL check_out.
 */
async function autoCloseOpenAttendance(targetDate) {
  const [rows] = await db.query(
    `SELECT id, employee_id, date, check_in, break
     FROM attendance
     WHERE date = ?
       AND check_in IS NOT NULL
       AND check_out IS NULL`,
    [targetDate]
  );

  for (const row of rows) {
    const fallbackCheckout = `${targetDate} 19:30:00`;
    const checkInMs = new Date(row.check_in).getTime();
    const checkoutMs = new Date(fallbackCheckout).getTime();
    let breakSeconds = 0;

    if (row.break) {
      const [h, m, sec] = String(row.break).split(':').map(Number);
      breakSeconds = (h || 0) * 3600 + (m || 0) * 60 + (sec || 0);
    }

    const netSeconds = Math.max(0, Math.floor((checkoutMs - checkInMs) / 1000) - breakSeconds);
    const hours = String(Math.floor(netSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((netSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(netSeconds % 60).padStart(2, '0');

    await db.query(
      `UPDATE attendance
       SET check_out = ?, hours = ?, is_paused = 0, elapsed_time = 0, pause_start = NULL
       WHERE id = ? AND check_out IS NULL`,
      [fallbackCheckout, `${hours}:${minutes}:${seconds}`, row.id]
    );
  }

  return rows.length;
}

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

router.get('/pause-status/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const today = new Date().toISOString().split('T')[0];
    const [results] = await db.query(
      'SELECT is_paused FROM attendance WHERE employee_id = ? AND date = ? LIMIT 1',
      [employeeId, today]
    );
    if (results.length === 0) {

      return res.json({ is_paused: 0 });
    }
    res.json({ is_paused: results[0].is_paused });
  } catch (err) {
    console.error('Error fetching pause status:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Attendance initialization + reliable automatic checkout.
// A previous-day open record is closed at 7:30 PM as a fallback once the
// calendar day rolls over. The recovery schedule also handles restarts or
// missed cron ticks, so the browser is never required for auto checkout.
cron.schedule('1 0 * * *', async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];
    const closed = await autoCloseOpenAttendance(targetDate);
    console.log(`Auto punch-out completed for ${targetDate}. Updated ${closed} records.`);
  } catch (error) {
    console.error('Auto punch-out cron error:', error);
  }
});

// Recovery guard: if the server was down at midnight, close any previous-day
// attendance on the next scheduler tick. This never modifies today's rows.
cron.schedule('*/5 * * * *', async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const targetDate = yesterday.toISOString().split('T')[0];
    await autoCloseOpenAttendance(targetDate);
  } catch (error) {
    console.error('Attendance recovery cron error:', error);
  }
});

router.get('/employee-attendance', async (req, res) => {
  try {
    const query = `
      SELECT 
        a.id,
        a.employee_id,
        a.date,
        a.check_in,
        a.check_out,
        a.hours,
        a.break,
        a.status,
        a.is_paused,
        e.role,
        e.termination_date,
        e.fullName AS employee_name,
        e.email AS employee_email,

        -- Determine Leave or Half Day (for yellow label)
        CASE 
          WHEN EXISTS (
            SELECT 1 FROM leave_requests l
            WHERE l.employee_id = a.employee_id
              AND a.date BETWEEN l.start_date AND l.end_date
              AND l.status = 'Approved'
          )
          THEN (
            CASE 
              WHEN EXISTS (
                SELECT 1 FROM leave_requests l2
                WHERE l2.employee_id = a.employee_id
                  AND a.date BETWEEN l2.start_date AND l2.end_date
                  AND l2.leave_type = 'Half Day'
                  AND l2.status = 'Approved'
              )
              THEN 'Half Day'
              ELSE 'Leave'
            END
          )
          ELSE NULL
        END AS leave_status,

        -- Determine final status (for red/blue/green label)
        CASE
          -- Holiday
          WHEN EXISTS (
            SELECT 1 FROM holidays h
            WHERE DATE(a.date) = DATE(h.date)
          ) THEN (
            SELECT h.hName FROM holidays h WHERE DATE(a.date) = DATE(h.date) LIMIT 1
          )

          -- If employee punched in → Present
          WHEN a.status = 'Present' THEN 'Present'

          -- If no punch-in but approved leave → Leave
          WHEN a.status = 'Absent'
            AND EXISTS (
              SELECT 1 FROM leave_requests l3
              WHERE l3.employee_id = a.employee_id
                AND a.date BETWEEN l3.start_date AND l3.end_date
                AND l3.status = 'Approved'
                AND (l3.leave_type != 'Half Day' OR l3.leave_type IS NULL)
            )
          THEN 'Leave'

          -- Saturday/Sunday → Paid Holiday
          WHEN DAYOFWEEK(a.date) IN (1, 7) THEN 'Weekend'

          -- Default → whatever is stored (Absent, etc.)
          ELSE a.status
        END AS final_status

      FROM attendance a
      INNER JOIN employees e ON e.id = a.employee_id
      ORDER BY a.date DESC, e.fullName ASC;
    `;

    const [results] = await db.query(query);
    res.status(200).json(results);

  } catch (err) {
    console.error('Error fetching attendance data', err);
    res.status(500).json({ message: 'Error fetching attendance data', error: err });
  }
});

// PUT /api/attendance/updateTimer/:id
router.put('/updateTimer/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkIn, checkOut, break: breakTime, status, date } = req.body;
    console.log("Request Body:", req.body);
    console.log("Params:", req.params);

    // Ensure date is YYYY-MM-DD
    const formattedDate = new Date(date).toISOString().split('T')[0];

    // Combine date + time for check-in/out (ensure seconds added)
    const checkInDateTime = checkIn ? `${formattedDate} ${checkIn}:00` : null;
    const checkOutDateTime = checkOut ? `${formattedDate} ${checkOut}:00` : null;

    // Calculate hours difference
    let totalHours = "00:00:00";
    if (checkInDateTime && checkOutDateTime) {
      const inTime = new Date(checkInDateTime);
      const outTime = new Date(checkOutDateTime);

      let diffMs = outTime - inTime; // milliseconds
      if (diffMs < 0) diffMs = 0; // safety check

      // subtract break time if provided
      if (breakTime) {
        const [bh, bm, bs] = breakTime.split(":").map(Number);
        const breakMs = ((bh || 0) * 3600 + (bm || 0) * 60 + (bs || 0)) * 1000;
        diffMs -= breakMs;
      }

      if (diffMs < 0) diffMs = 0; // prevent negative

      // convert ms → HH:MM:SS
      const totalSec = Math.floor(diffMs / 1000);
      const hours = String(Math.floor(totalSec / 3600)).padStart(2, "0");
      const minutes = String(Math.floor((totalSec % 3600) / 60)).padStart(2, "0");
      const seconds = String(totalSec % 60).padStart(2, "0");
      totalHours = `${hours}:${minutes}:${seconds}`;
    }

    const sql = `
      UPDATE attendance 
      SET 
        check_in = ?, 
        check_out = ?, 
        break = ?, 
        status = ?,
        hours = ?
      WHERE id = ?
    `;

    db.query(
      sql,
      [checkInDateTime, checkOutDateTime, breakTime, status, totalHours, id],
      (err, result) => {
        if (err) {
          console.error("❌ Error updating attendance:", err);
          return res.status(500).json({ error: "Database error", details: err });
        }
        if (result.affectedRows === 0) {
          console.warn("⚠️ No record updated. Possibly invalid ID.");
          return res.status(404).json({ error: "No matching attendance record found" });
        }

        console.log("✅ Attendance updated successfully:", { id, hours: totalHours });
        res.json({ message: "Attendance updated successfully", hours: totalHours });
      }
    );
  } catch (error) {
    console.error("🔥 Server error:", error);
    res.status(500).json({ error: "Server error", details: error });
  }
});

router.post('/start-timer', async (req, res) => {
  const { employee_id } = req.body;

  if (!employee_id) {
    return res.status(400).json({ success: false, message: 'Employee ID is required.' });
  }

  const check_in = new Date();

  try {
    // The unique(employee_id, date) index protects the rule at DB level.
    // We additionally reject an existing check-in here so a second request
    // can never overwrite the original punch-in timestamp.
    const [existing] = await db.query(
      `SELECT id, check_in, check_out, status
       FROM attendance
       WHERE employee_id = ? AND date = CURDATE()
       LIMIT 1`,
      [employee_id]
    );

    if (existing.length && existing[0].check_in) {
      return res.status(409).json({
        success: false,
        code: existing[0].check_out ? 'ATTENDANCE_COMPLETED' : 'ALREADY_CHECKED_IN',
        message: existing[0].check_out
          ? 'Attendance has already been completed for today.'
          : 'You have already checked in today.',
        data: existing[0]
      });
    }

    const lateLimit = new Date();
    lateLimit.setHours(10, 16, 0, 0);
    const status = check_in > lateLimit ? 'Half Day' : 'Present';

    if (!existing.length) {
      try {
        await db.query(
          `INSERT INTO attendance (employee_id, date, status, check_in)
           VALUES (?, CURDATE(), ?, ?)`,
          [employee_id, status, check_in]
        );
      } catch (insertError) {
        // A concurrent request can win the unique key between SELECT and INSERT.
        if (insertError.code === 'ER_DUP_ENTRY') {
          return res.status(409).json({
            success: false,
            code: 'ALREADY_CHECKED_IN',
            message: 'You have already checked in today.'
          });
        }
        throw insertError;
      }
    } else {
      await db.query(
        `UPDATE attendance
         SET check_in = ?, status = ?, check_out = NULL
         WHERE id = ? AND check_in IS NULL`,
        [check_in, status, existing[0].id]
      );
    }

    const [updated] = await db.query(
      `SELECT id, employee_id, date, check_in, check_out, status, hours, break, is_paused, elapsed_time, pause_start
       FROM attendance
       WHERE employee_id = ? AND date = CURDATE()`,
      [employee_id]
    );

    return res.json({
      success: true,
      message: 'Timer started successfully.',
      data: updated[0]
    });
  } catch (error) {
    console.error('Error executing start timer:', error);
    return res.status(500).json({ success: false, error: 'Failed to start timer.' });
  }
});

// Fetch today's complete attendance state. This is the source of truth used
// by the employee UI after refresh, navigation, logout/login, or browser reopen.
router.get('/today/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    const [rows] = await db.query(
      `SELECT id, employee_id, date, status, check_in, check_out, hours, break, is_paused, elapsed_time, pause_start
       FROM attendance
       WHERE employee_id = ? AND date = CURDATE()
       LIMIT 1`,
      [employeeId]
    );

    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    console.error('Error fetching today attendance:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch today attendance.' });
  }
});

router.post('/stop-timer', async (req, res) => {
  const { employee_id, date } = req.body;
  const targetDate = date
    ? new Date(date).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];
  const now = new Date();

  try {
    const [rows] = await db.query(
      `SELECT check_in, check_out, elapsed_time, is_paused, break
       FROM attendance
       WHERE employee_id = ? AND date = ?`,
      [employee_id, targetDate]
    );

    if (rows.length === 0 || !rows[0].check_in) {
      return res.status(404).json({ error: `No attendance record found for ${targetDate}.` });
    }

    if (rows[0].check_out) {
      return res.status(409).json({
        success: false,
        code: 'ALREADY_CHECKED_OUT',
        message: 'You have already checked out for this attendance day.'
      });
    }

    if (Number(rows[0].is_paused) === 1) {
      return res.status(409).json({
        success: false,
        code: 'ATTENDANCE_PAUSED',
        message: 'Resume the timer before checking out.'
      });
    }

    let totalSeconds = rows[0].elapsed_time || 0;
    if (!rows[0].is_paused && rows[0].check_in) {
      totalSeconds += Math.floor((now - new Date(rows[0].check_in)) / 1000);
    }

    let breakSeconds = 0;
    if (rows[0].break) {
      const [bh, bm, bs] = rows[0].break.split(':').map(Number);
      breakSeconds = (bh || 0) * 3600 + (bm || 0) * 60 + (bs || 0);
    }

    let netSeconds = totalSeconds - breakSeconds;
    if (netSeconds < 0) netSeconds = 0;

    const hours = Math.floor(netSeconds / 3600);
    const minutes = Math.floor((netSeconds % 3600) / 60);
    const seconds = netSeconds % 60;
    const workedTimeFormatted = `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`;

    await db.query(
      `UPDATE attendance 
       SET check_out = ?, hours = ?, is_paused = 0, elapsed_time = 0
       WHERE employee_id = ? AND date = ?`,
      [now, workedTimeFormatted, employee_id, targetDate]
    );

    res.json({ message: `Timer stopped for ${targetDate}.`, workedTimeFormatted });
  } catch (error) {
    console.error('Stop timer error:', error);
    res.status(500).json({ error: 'Failed to stop timer.' });
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

// attendance.routes.js or attendances.js
router.get('/:employeeId', async (req, res) => {
  const employeeId = parseInt(req.params.employeeId, 10);

  // Validate employeeId
  if (isNaN(employeeId)) {
    return res.status(400).json({ message: 'Invalid employee ID' });
  }

  try {
    // Query attendance records for the given employee ID
    // const [attendanceDetails] = await db.query(
    //   `SELECT * FROM attendance WHERE employee_id = ? ORDER BY date DESC`,
    //   [employeeId]
    // );

    //   const [attendanceDetails] = await db.query(
    //     `SELECT a.*, 
    //         CASE 
    //           -- If Holidays → mark Holiday Name -> set to Present
    //           WHEN EXISTS (
    //             SELECT 1 FROM holidays h
    //             WHERE DATE(a.date) = DATE(h.date)
    //           ) THEN (
    //             SELECT h.hName FROM holidays h WHERE DATE(a.date) = DATE(h.date) LIMIT 1
    //           )

    //           -- If employee checked in → always mark Present
    //           WHEN a.status = 'Present' THEN 'Present'

    //           -- If leave exists for this date → show Leave
    //           WHEN EXISTS (
    //             SELECT 1 FROM leave_requests l
    //             WHERE l.employee_id = a.employee_id
    //             AND a.date BETWEEN l.start_date AND l.end_date
    //             AND l.status = 'Approved'
    //           ) THEN 'Leave'

    //           -- If Saturday (7) or Sunday (1) → Paid Holiday
    //           WHEN DAYOFWEEK(a.date) IN (1, 7) THEN 'Weekend'

    //           ELSE a.status
    //         END AS final_status
    //  FROM attendance a
    //  WHERE a.employee_id = ?
    //  ORDER BY a.date DESC`,
    //     [employeeId]
    //   );

    const [attendanceDetails] = await db.query(
      `SELECT 
      a.*, 
      -- Check if the employee has an approved leave for this date
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM leave_requests l
          WHERE l.employee_id = a.employee_id
          AND a.date BETWEEN l.start_date AND l.end_date
          AND l.status = 'Approved'
        ) THEN
          CASE 
            WHEN EXISTS (
              SELECT 1 FROM leave_requests l
              WHERE l.employee_id = a.employee_id
              AND a.date BETWEEN l.start_date AND l.end_date
              AND l.leave_type = 'Half Day'
              AND l.status = 'Approved'
            ) THEN 'Half Day'
            ELSE 'Leave'
          END
        ELSE NULL
      END AS leave_status,

      CASE 
        -- If holiday → mark holiday name
        WHEN EXISTS (
          SELECT 1 FROM holidays h
          WHERE DATE(a.date) = DATE(h.date)
        ) THEN (
          SELECT h.hName FROM holidays h WHERE DATE(a.date) = DATE(h.date) LIMIT 1
        )

        -- If employee punched in → Present
        WHEN a.status = 'Present' THEN 'Present'

        -- If Saturday or Sunday → Paid Holiday
        WHEN DAYOFWEEK(a.date) IN (1, 7) THEN 'Weekend'

        ELSE a.status
      END AS final_status
  FROM attendance a
  WHERE a.employee_id = ?
  ORDER BY a.date DESC`,
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

router.post('/add-break', async (req, res) => {
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
// router.post('/pause-timer', async (req, res) => {
//   const { employeeId, pauseStart, is_paused } = req.body;
//   console.log(req.body);

//   // Convert pauseStart to number and get today's date
//   const today = new Date().toISOString().split('T')[0];
//   const pauseStartDateTime = new Date(Number(pauseStart)); // For storing exact timestamp

//   try {
//     const [rows] = await db.query(
//       `SELECT check_in, elapsed_time FROM attendance 
//        WHERE employee_id = ? AND date = ?`,
//       [employeeId, today]
//     );

//     if (rows.length === 0 || !rows[0].check_in) {
//       return res.status(404).json({ message: 'No active timer to pause.' });
//     }

//     await db.query(
//       `UPDATE attendance 
//        SET is_paused = ?, pause_start = ? 
//        WHERE employee_id = ? AND date = ?`,
//       [is_paused, pauseStartDateTime, employeeId, today]
//     );

//     res.json({ message: 'Timer paused successfully.' });
//   } catch (error) {
//     console.error('Pause error:', error);
//     res.status(500).json({ error: 'Failed to pause timer.' });
//   }
// });

// router.post('/pause-timer', async (req, res) => {
//   const { employeeId, is_paused } = req.body;

//   const today = new Date().toISOString().split('T')[0];

//   // Exact server timestamp when Pause button is pressed
//   const pauseStart = new Date();

//   console.log('====================================');
//   console.log('PAUSE BUTTON PRESSED');
//   console.log('Employee ID:', employeeId);
//   console.log('Pause Time:', pauseStart);
//   console.log('====================================');

//   try {
//     const [rows] = await db.query(
//       `SELECT check_in, elapsed_time
//        FROM attendance
//        WHERE employee_id = ? AND date = ?`,
//       [employeeId, today]
//     );

//     if (rows.length === 0 || !rows[0].check_in) {
//       return res.status(404).json({
//         message: 'No active timer to pause.'
//       });
//     }

//    // Get attendance ID
// const [attendanceRows] = await db.query(
//   `SELECT id
//    FROM attendance
//    WHERE employee_id = ? AND date = ?`,
//   [employeeId, today]
// );

// if (attendanceRows.length === 0) {
//   return res.status(404).json({
//     message: 'Attendance record not found.'
//   });
// }

// const attendanceId = attendanceRows[0].id;


// // Save this pause into history
// await db.query(
//   `INSERT INTO attendance_pause_history
//    (attendance_id, employee_id, pause_start)
//    VALUES (?, ?, ?)`,
//   [attendanceId, employeeId, pauseStart]
// );


// // Also keep current pause in attendance table
// await db.query(
//   `UPDATE attendance
//    SET is_paused = ?, pause_start = ?
//    WHERE employee_id = ? AND date = ?`,
//   [
//     is_paused ?? 1,
//     pauseStart,
//     employeeId,
//     today
//   ]
// );

//     res.json({
//       success: true,
//       message: 'Timer paused successfully.',
//       pause_start: pauseStart
//     });

//   } catch (error) {
//     console.error('Pause error:', error);

//     res.status(500).json({
//       error: 'Failed to pause timer.'
//     });
//   }
// });



// router.post('/pause-timer', async (req, res) => {
//   const {
//     employeeId,
//     is_paused,
//     reason
//   } = req.body;

//   const today = new Date().toISOString().split('T')[0];

//   // Exact server timestamp when Pause button is pressed
//   const pauseStart = new Date();

//   console.log('====================================');
//   console.log('PAUSE BUTTON PRESSED');
//   console.log('Employee ID:', employeeId);
//   console.log('Pause Time:', pauseStart);
//   console.log('Reason:', reason);
//   console.log('====================================');

//   try {
//     // --------------------------------------------------
//     // 1. Check today's attendance
//     // --------------------------------------------------
//     const [rows] = await db.query(
//       `SELECT check_in, elapsed_time
//        FROM attendance
//        WHERE employee_id = ? AND date = ?`,
//       [employeeId, today]
//     );

//     if (rows.length === 0 || !rows[0].check_in) {
//       return res.status(404).json({
//         message: 'No active timer to pause.'
//       });
//     }

//     // --------------------------------------------------
//     // 2. Get attendance ID
//     // --------------------------------------------------
//     const [attendanceRows] = await db.query(
//       `SELECT id
//        FROM attendance
//        WHERE employee_id = ? AND date = ?`,
//       [employeeId, today]
//     );

//     if (attendanceRows.length === 0) {
//       return res.status(404).json({
//         message: 'Attendance record not found.'
//       });
//     }

//     const attendanceId = attendanceRows[0].id;

//     // --------------------------------------------------
//     // 3. Determine pause reason
//     // --------------------------------------------------

//     // Current time in server local time
//     const currentHour = pauseStart.getHours();
//     const currentMinute = pauseStart.getMinutes();

//     const currentMinutes =
//       currentHour * 60 + currentMinute;

//     // 1:30 PM = 13:30 = 810 minutes
//     // 1:40 PM = 13:40 = 820 minutes
//     const lunchStart = 13 * 60 + 30;
//     const lunchEnd = 13 * 60 + 40;

//     let pauseReason = reason?.trim() || '';

//     // Automatically set Lunch Break between 1:30 PM and 1:40 PM
//     if (
//       currentMinutes >= lunchStart &&
//       currentMinutes <= lunchEnd
//     ) {
//       pauseReason = 'Lunch Break';
//     }

//     // --------------------------------------------------
//     // 4. Reason is required outside lunch-break window
//     // --------------------------------------------------
//     if (!pauseReason) {
//       return res.status(400).json({
//         success: false,
//         requiresReason: true,
//         message: 'Please provide a reason for the break.'
//       });
//     }

//     // --------------------------------------------------
//     // 5. Save pause history
//     // --------------------------------------------------
//     await db.query(
//       `INSERT INTO attendance_pause_history
//        (
//          attendance_id,
//          employee_id,
//          pause_start,
//          reason
//        )
//        VALUES (?, ?, ?, ?)`,
//       [
//         attendanceId,
//         employeeId,
//         pauseStart,
//         pauseReason
//       ]
//     );

//     // --------------------------------------------------
//     // 6. Update current attendance pause
//     // --------------------------------------------------
//     await db.query(
//       `UPDATE attendance
//        SET is_paused = ?,
//            pause_start = ?
//        WHERE employee_id = ?
//          AND date = ?`,
//       [
//         is_paused ?? 1,
//         pauseStart,
//         employeeId,
//         today
//       ]
//     );

//     // --------------------------------------------------
//     // 7. Response
//     // --------------------------------------------------
//     res.json({
//       success: true,
//       message: 'Timer paused successfully.',
//       pause_start: pauseStart,
//       reason: pauseReason
//     });

//   } catch (error) {

//     console.error('Pause error:', error);

//     res.status(500).json({
//       success: false,
//       error: 'Failed to pause timer.'
//     });
//   }
// });




router.post('/pause-timer', async (req, res) => {
  const {
    employeeId,
    is_paused,
    reason
  } = req.body;

  console.log('====================================');
  console.log('PAUSE BUTTON PRESSED');
  console.log('Request Body:', req.body);
  console.log('Employee ID:', employeeId);
  console.log('Reason Received:', reason);
  console.log('====================================');

  const today = new Date().toISOString().split('T')[0];

  // Exact server timestamp
  const pauseStart = new Date();

  try {

    // ==================================================
    // 1. Validate Employee ID
    // ==================================================

    if (!employeeId) {
      return res.status(400).json({
        success: false,
        message: 'Employee ID is required.'
      });
    }


    // ==================================================
    // 2. Check Today's Attendance
    // ==================================================

    const [attendanceRows] = await db.query(
      `
      SELECT
        id,
        employee_id,
        check_in,
        elapsed_time,
        is_paused,
        pause_start,
        break
      FROM attendance
      WHERE employee_id = ?
        AND date = ?
      LIMIT 1
      `,
      [
        employeeId,
        today
      ]
    );


    if (
      attendanceRows.length === 0 ||
      !attendanceRows[0].check_in
    ) {
      return res.status(404).json({
        success: false,
        message: 'No active timer to pause.'
      });
    }


    // ==================================================
    // 3. Get Attendance ID
    // ==================================================

    const attendanceId = attendanceRows[0].id;


    console.log('Attendance ID:', attendanceId);


    // ==================================================
    // 4. Check if Already Paused
    // ==================================================

    if (Number(attendanceRows[0].is_paused) === 1) {
      return res.status(400).json({
        success: false,
        message: 'Timer is already paused.'
      });
    }


    // ==================================================
    // 5. Determine Pause Reason
    // ==================================================

    const currentHour = pauseStart.getHours();
    const currentMinute = pauseStart.getMinutes();

    const currentMinutes =
      currentHour * 60 + currentMinute;


    // 1:30 PM
    const lunchStart =
      13 * 60 + 30;


    // 1:40 PM
    const lunchEnd =
      13 * 60 + 40;


    let pauseReason =
      typeof reason === 'string'
        ? reason.trim()
        : '';


    console.log(
      'Current Time:',
      `${currentHour}:${String(currentMinute).padStart(2, '0')}`
    );

    console.log(
      'Initial Reason:',
      pauseReason
    );


    // ==================================================
    // 6. Automatic Lunch Break
    // ==================================================

    if (
      currentMinutes >= lunchStart &&
      currentMinutes <= lunchEnd
    ) {

      pauseReason = 'Lunch Break';

      console.log(
        'Automatic Lunch Break Applied'
      );
    }


    // ==================================================
    // 7. Reason Required Outside Lunch Time
    // ==================================================

    if (!pauseReason) {

      return res.status(400).json({
        success: false,
        requiresReason: true,
        message: 'Please provide a reason for the break.'
      });
    }


    // ==================================================
    // 8. Debug Before Database Insert
    // ==================================================

    console.log('====================================');
    console.log('BEFORE PAUSE HISTORY INSERT');
    console.log('Attendance ID:', attendanceId);
    console.log('Employee ID:', employeeId);
    console.log('Pause Start:', pauseStart);
    console.log('Pause Reason:', pauseReason);
    console.log('====================================');


    // ==================================================
    // 9. Insert Pause History
    // ==================================================

    const [insertResult] = await db.query(
      `
      INSERT INTO attendance_pause_history
      (
        attendance_id,
        employee_id,
        pause_start,
        reason
      )
      VALUES (?, ?, ?, ?)
      `,
      [
        attendanceId,
        employeeId,
        pauseStart,
        pauseReason
      ]
    );


    console.log('====================================');
    console.log('PAUSE HISTORY INSERTED');
    console.log('Inserted ID:', insertResult.insertId);
    console.log('====================================');


    // ==================================================
    // 10. Update Attendance Table
    // ==================================================

    await db.query(
      `
      UPDATE attendance
      SET
        is_paused = ?,
        pause_start = ?
      WHERE employee_id = ?
        AND date = ?
      `,
      [
        is_paused ?? 1,
        pauseStart,
        employeeId,
        today
      ]
    );


    // ==================================================
    // 11. Verify Inserted Record
    // ==================================================

    const [verifyRows] = await db.query(
      `
      SELECT
        id,
        attendance_id,
        employee_id,
        pause_start,
        pause_end,
        reason,
        duration
      FROM attendance_pause_history
      WHERE id = ?
      LIMIT 1
      `,
      [
        insertResult.insertId
      ]
    );


    console.log('====================================');
    console.log('DATABASE VERIFICATION');
    console.log(verifyRows[0]);
    console.log('====================================');


    // ==================================================
    // 12. Success Response
    // ==================================================

    return res.json({
      success: true,
      message: 'Timer paused successfully.',
      attendance_id: attendanceId,
      employee_id: employeeId,
      pause_start: pauseStart,
      reason: pauseReason,
      history_id: insertResult.insertId
    });


  } catch (error) {

    console.error('====================================');
    console.error('PAUSE TIMER ERROR');
    console.error(error);
    console.error('====================================');


    return res.status(500).json({
      success: false,
      message: 'Failed to pause timer.',
      error: error.message
    });
  }
});




// router.post('/resume-timer', async (req, res) => {
//   const { employeeId } = req.body;
//   const today = new Date().toISOString().split('T')[0];

//   try {
//     // 1. Get current pause_start
//     const [rows] = await db.query(
//       `SELECT pause_start, break
//        FROM attendance 
//        WHERE employee_id = ? AND date = ?`,
//       [employeeId, today]
//     );

//     if (rows.length === 0 || !rows[0].pause_start) {
//       return res.status(404).json({ message: 'No paused timer found.' });
//     }

//     // 2. Calculate break duration in milliseconds
//     const pauseStartTime = new Date(rows[0].pause_start).getTime();
//     const resumeTime = Date.now();
//     const breakMs = resumeTime - pauseStartTime;

//     // 3. Add to existing break_time
//     const existingBreak = rows[0].break ? timeStringToMs(rows[0].break) : 0;
//     const totalBreakMs = existingBreak + breakMs;
//     const breakFormatted = msToTimeString(totalBreakMs); // HH:mm:ss

//     // 4. Update DB
//     // await db.query(
//     //   `UPDATE attendance 
//     //    SET is_paused = 0, pause_start = NULL, break = ?
//     //    WHERE employee_id = ? AND date = ?`,
//     //   [breakFormatted, employeeId, today]
//     // );
// await db.query(
//   `UPDATE attendance 
//    SET is_paused = 0, break = ?
//    WHERE employee_id = ? AND date = ?`,
//   [breakFormatted, employeeId, today]
// );

//     res.json({ message: 'Timer resumed successfully.', break: breakFormatted });
//   } catch (error) {
//     console.error('Resume error:', error);
//     res.status(500).json({ error: 'Failed to resume timer.' });
//   }
// });





// Helper: Convert HH:mm:ss → ms



// router.post('/resume-timer', async (req, res) => {
//   const { employeeId } = req.body;

//   const today = new Date().toISOString().split('T')[0];

//   try {
//     // 1. Get today's attendance
//     const [rows] = await db.query(
//       `SELECT id, pause_start, break
//        FROM attendance
//        WHERE employee_id = ? AND date = ?`,
//       [employeeId, today]
//     );

//     if (rows.length === 0 || !rows[0].pause_start) {
//       return res.status(404).json({
//         message: 'No paused timer found.'
//       });
//     }

//     const attendanceId = rows[0].id;
//     const pauseStart = rows[0].pause_start;

//     // 2. Resume timestamp
//     const resumeTime = new Date();

//     // 3. Calculate THIS pause duration
//     const pauseStartTime = new Date(pauseStart).getTime();
//     const breakMs = resumeTime.getTime() - pauseStartTime;

//     const pauseDuration = msToTimeString(breakMs);

//     // 4. Get existing total break
//     const existingBreak = rows[0].break
//       ? timeStringToMs(rows[0].break)
//       : 0;

//     const totalBreakMs = existingBreak + breakMs;

//     const totalBreakFormatted = msToTimeString(totalBreakMs);

//     // 5. Close the latest open pause-history record
//     await db.query(
//       `UPDATE attendance_pause_history
//        SET pause_end = ?,
//            duration = ?
//        WHERE attendance_id = ?
//          AND pause_end IS NULL
//        ORDER BY id DESC
//        LIMIT 1`,
//       [
//         resumeTime,
//         pauseDuration,
//         attendanceId
//       ]
//     );

//     // 6. Update attendance
//     // IMPORTANT:
//     // We intentionally DO NOT set pause_start = NULL
//     // so the last pause time remains available.
//     await db.query(
//       `UPDATE attendance
//        SET is_paused = 0,
//            break = ?
//        WHERE employee_id = ?
//        AND date = ?`,
//       [
//         totalBreakFormatted,
//         employeeId,
//         today
//       ]
//     );

//     console.log(
//       `Resume recorded for employee ${employeeId}`
//     );

//     console.log(
//       `Pause duration: ${pauseDuration}`
//     );

//     console.log(
//       `Total break: ${totalBreakFormatted}`
//     );

//     res.json({
//       success: true,
//       message: 'Timer resumed successfully.',
//       pause_start: pauseStart,
//       pause_end: resumeTime,
//       pause_duration: pauseDuration,
//       break: totalBreakFormatted
//     });

//   } catch (error) {
//     console.error('Resume error:', error);

//     res.status(500).json({
//       error: 'Failed to resume timer.'
//     });
//   }
// });


router.post('/resume-timer', async (req, res) => {
  const { employeeId } = req.body;

  const today = new Date().toISOString().split('T')[0];

  try {
    // --------------------------------------------------
    // 1. Get today's attendance
    // --------------------------------------------------
    const [rows] = await db.query(
      `
      SELECT
        id,
        pause_start
      FROM attendance
      WHERE employee_id = ?
        AND date = ?
      `,
      [employeeId, today]
    );

    if (rows.length === 0 || !rows[0].pause_start) {
      return res.status(404).json({
        message: 'No paused timer found.'
      });
    }

    const attendanceId = rows[0].id;
    const pauseStart = rows[0].pause_start;

    // --------------------------------------------------
    // 2. Resume timestamp
    // --------------------------------------------------
    const resumeTime = new Date();

    // --------------------------------------------------
    // 3. Calculate THIS pause duration
    // --------------------------------------------------
    const pauseStartTime = new Date(pauseStart).getTime();
    const resumeTimeMs = resumeTime.getTime();

    const breakMs = resumeTimeMs - pauseStartTime;

    if (breakMs < 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pause duration.'
      });
    }

    const pauseDuration = msToTimeString(breakMs);

    // --------------------------------------------------
    // 4. Close the latest open pause-history record
    // --------------------------------------------------
    const [updateResult] = await db.query(
      `
      UPDATE attendance_pause_history
      SET
        pause_end = ?,
        duration = ?
      WHERE attendance_id = ?
        AND pause_end IS NULL
      ORDER BY id DESC
      LIMIT 1
      `,
      [
        resumeTime,
        pauseDuration,
        attendanceId
      ]
    );

    // --------------------------------------------------
    // 5. Calculate TOTAL BREAK from pause history
    //    DO NOT use attendance.break here.
    // --------------------------------------------------
    const [breakRows] = await db.query(
      `
      SELECT
        COALESCE(
          SUM(TIME_TO_SEC(duration)),
          0
        ) AS totalBreakSeconds
      FROM attendance_pause_history
      WHERE attendance_id = ?
        AND pause_end IS NOT NULL
      `,
      [attendanceId]
    );

    const totalBreakSeconds = Number(
      breakRows[0]?.totalBreakSeconds || 0
    );

    // --------------------------------------------------
    // 6. Convert total seconds → HH:MM:SS
    // --------------------------------------------------
    const totalHours = Math.floor(
      totalBreakSeconds / 3600
    );

    const totalMinutes = Math.floor(
      (totalBreakSeconds % 3600) / 60
    );

    const totalSeconds =
      totalBreakSeconds % 60;

    const totalBreakFormatted =
      `${String(totalHours).padStart(2, '0')}:` +
      `${String(totalMinutes).padStart(2, '0')}:` +
      `${String(totalSeconds).padStart(2, '0')}`;

    // --------------------------------------------------
    // 7. Update attendance
    // --------------------------------------------------
    await db.query(
      `
      UPDATE attendance
      SET
        is_paused = 0,
        break = ?
      WHERE employee_id = ?
        AND date = ?
      `,
      [
        totalBreakFormatted,
        employeeId,
        today
      ]
    );

    // --------------------------------------------------
    // 8. Logs
    // --------------------------------------------------
    console.log('====================================');
    console.log('RESUME TIMER');
    console.log('Employee ID:', employeeId);
    console.log('Attendance ID:', attendanceId);
    console.log('Pause Start:', pauseStart);
    console.log('Pause End:', resumeTime);
    console.log('Current Pause:', pauseDuration);
    console.log('Total Break:', totalBreakFormatted);
    console.log('====================================');

    // --------------------------------------------------
    // 9. Response
    // --------------------------------------------------
    return res.json({
      success: true,
      message: 'Timer resumed successfully.',
      pause_start: pauseStart,
      pause_end: resumeTime,
      pause_duration: pauseDuration,
      break: totalBreakFormatted
    });

  } catch (error) {
    console.error('Resume error:', error);

    return res.status(500).json({
      success: false,
      error: 'Failed to resume timer.'
    });
  }
});

function timeStringToMs(time) {
  const [h, m, s] = time.split(':').map(Number);
  return (h * 3600 + m * 60 + s) * 1000;
}
// Helper: Convert ms → HH:mm:ss
function msToTimeString(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}
module.exports = router;