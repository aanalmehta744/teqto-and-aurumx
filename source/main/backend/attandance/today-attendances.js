  const express = require('express');
  const router = express.Router();
  const db = require('../connection'); // Ensure the path is correct
  const moment = require('moment');

  // API Endpoint to Fetch Today's Attendance Details
  router.get('/today', async (req, res) => {
    const todayDate = new Date().toISOString().split('T')[0];
    console.log("Today API:", todayDate);

    const query = `
      SELECT 
        a.id, a.employee_id, e.fullName, 
        a.date, a.check_in, a.check_out, 
      a.hours,
a.status,
a.break,
a.pause_start,
e.role,
        CASE 
          -- If employee checked in → always mark Present
          WHEN a.status = 'Present' THEN 'Present'

          -- If leave exists for this date → show Leave
          WHEN EXISTS (
            SELECT 1 FROM leave_requests l
            WHERE l.employee_id = a.employee_id
            AND a.date BETWEEN l.start_date AND l.end_date
            AND l.status = 'Approved'
          ) THEN 'Leave'

          -- If Saturday (7) or Sunday (1) → Paid Holiday
          WHEN DAYOFWEEK(a.date) IN (1, 7) THEN 'Paid Holiday'

          ELSE a.status
        END AS final_status
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      WHERE a.date = ?;
    `;

    try {
      const [rows] = await db.execute(query, [todayDate]);

      if (rows.length === 0) {
        return res.status(404).json({ message: 'No attendance records found for today.' });
      }

      res.status(200).json(rows);

    } catch (error) {
      console.error('Error fetching attendance details:', error);
      res.status(500).json({ message: 'Error fetching attendance details.', error });
    }
  });


  router.put('/addAttendance', (req, res) => {
    const { employee_id, check_in, check_out } = req.body;

    // Ensure all required fields are provided
    if (!employee_id || !check_in || !check_out) {
      return res.status(400).json({ message: 'Employee ID, Check-in, and Check-out times are required.' });
    }

    // Get today's date in YYYY-MM-DD format
    const todayDate = new Date().toISOString().split('T')[0]; // Today's date in YYYY-MM-DD format
    // Convert check_in and check_out to 24-hour format
    const checkIn24 = moment(check_in, 'hh:mm A').format('HH:mm'); // Convert to 24-hour format
    const checkOut24 = moment(check_out, 'hh:mm A').format('HH:mm');
    // Now, parse the converted time into Date objects
    const checkInDate = new Date(`${todayDate}T${checkIn24}:00`);
    const checkOutDate = new Date(`${todayDate}T${checkOut24}:00`);

    // Adjust the times to local time if needed
    const localCheckInDate = new Date(checkInDate.getTime() - (checkInDate.getTimezoneOffset() * 60000));
    const localCheckOutDate = new Date(checkOutDate.getTime() - (checkOutDate.getTimezoneOffset() * 60000));

    // Validate if check_in and check_out are valid dates
    if (isNaN(localCheckInDate.getTime()) || isNaN(localCheckOutDate.getTime())) {
      return res.status(400).json({ message: 'Invalid check-in or check-out time.' });
    }

    // SQL query to check if an attendance record exists for the employee and today
    const checkQuery = `
      SELECT id, check_in, check_out FROM attendances_details 
      WHERE employee_id = ? AND date = ?
    `;

    db.query(checkQuery, [employee_id, todayDate], (checkError, checkResults) => {
      if (checkError) {
        console.error('Error checking attendance:', checkError);
        return res.status(500).json({ message: 'Error checking attendance.', error: checkError });
      }

      if (checkResults.length === 0) {
        return res.status(404).json({ message: 'No attendance record found for the given employee ID and today\'s date.' });
      } else {
        // Calculate total hours worked if both check_in and check_out are available
        let totalHours = null;
        if (localCheckInDate && localCheckOutDate) {
          const totalMilliseconds = localCheckOutDate - localCheckInDate; // Time difference in milliseconds
          let totalSeconds = totalMilliseconds / 1000; // Convert milliseconds to seconds

          const hours = Math.floor(totalSeconds / 3600); // Calculate hours
          totalSeconds %= 3600;
          const minutes = Math.floor(totalSeconds / 60); // Calculate minutes
          const seconds = totalSeconds % 60; // Calculate seconds

          // Format the total time as HH:MM:SS
          totalHours = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }

        // Update the attendance record with new values
        const updateQuery = `
          UPDATE attendances_details 
          SET 
            check_in = ?, 
            check_out = ?, 
            hours = ?, 
            date = ?, 
            status = 'Present' 
          WHERE 
            employee_id = ? 
            AND date = ?
        `;

        db.query(updateQuery, [check_in, check_out, totalHours, todayDate, employee_id, todayDate], (updateError, updateResults) => {
          if (updateError) {
            console.error('Error updating attendance:', updateError);
            return res.status(500).json({ message: 'Error updating attendance.', error: updateError });
          }

          console.log('Attendance updated successfully for Employee ID:', employee_id);
          return res.status(200).json({
            message: 'Attendance updated successfully.',
            totalHours: totalHours || 'Total hours not calculated',
            updateResults
          });
        });
      }
    });
  });

  router.get('/searchlist', async (req, res) => {
    const { fromDate, toDate } = req.query;

    // Validation for date range
    if (!fromDate || !toDate) {
      return res.status(400).json({ message: 'Both fromDate and toDate are required' });
    }

    try {
      // SQL query to fetch attendance records in the given date range
      const query = `
        SELECT a.id,e.role, a.employee_id,a.check_in,a.check_out, a.date, a.status, e.fullName AS employee_name, e.email AS employee_email
        FROM attendance a
        JOIN employees e ON a.employee_id = e.id
        WHERE a.date BETWEEN ? AND ?
        `;

      // Execute the query using async/await with mysql2
      const [results] = await db.query(query, [fromDate, toDate]);

      // Send the results as a response
      return res.status(200).json(results);
    } catch (err) {
      console.error(err);
      return res.status(500).json({ message: 'Error fetching attendance records' });
    }
  });


  module.exports = router;
