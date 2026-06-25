const express = require('express');
const router = express.Router();
const db = require('../connection'); // adjust path to your db connection file
const cron = require('node-cron');
const moment = require('moment');

// This cron job will run on the 1st day of every month at midnight
cron.schedule('0 0 1 * *', async () => {
  const today = new Date();
  let month = today.getMonth(); // 0-11
  let year = today.getFullYear();

  // 👇 Go to previous month
  month -= 1;
  if (month < 0) {
    month = 11;
    year -= 1;
  }

  try {
    // Get salary and unpaid leaves for last month
    const [employees] = await db.query(`
            SELECT e.id AS employee_id, e.salary,
                   IFNULL(SUM(l.no_of_days), 0) AS unpaid_days
            FROM employees e
            LEFT JOIN leave_requests l
                ON e.id = l.employee_id
                AND l.leave_type = 'Unpaid'
                AND MONTH(l.start_date) = ?
                AND YEAR(l.start_date) = ?
            GROUP BY e.id
        `, [month + 1, year]); // SQL months are 1-indexed

    for (const emp of employees) {
      const { employee_id, salary, unpaid_days } = emp;
      const baseSalary = salary || 0;
      const unpaidDays = unpaid_days || 0;
      if (isNaN(baseSalary) || isNaN(unpaidDays)) continue;

      const perDaySalary = baseSalary / 30;
      const finalSalary = baseSalary - (unpaidDays * perDaySalary);
      if (isNaN(finalSalary)) continue;

      await db.query(`
                INSERT INTO salary_slips 
                (employee_id, month, year, base_salary, unpaid_leave_days, final_salary)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [employee_id, month + 1, year, baseSalary, unpaidDays, finalSalary]);
    }

    console.log(`[${new Date().toISOString()}] ✅ Salary slips generated for ${month + 1}/${year}`);
  } catch (err) {
    console.error('❌ Error generating salary slips:', err);
  }
});
// router.get('/payslip/:employeeId', async (req, res) => {
//   const { employeeId } = req.params;
//   const { month, year } = req.query;

//   if (!employeeId || !month || !year) {
//     return res.status(400).json({ error: 'Missing parameters' });
//   }

//   try {
//     const paddedMonth = month.toString().padStart(2, '0');
//     const startOfMonth = moment(`${year}-${paddedMonth}-01`).startOf('month');
//     const endOfMonth = startOfMonth.clone().endOf('month');

//     // ---- Employee details ----
//     const [employeeRows] = await db.query(
//       `SELECT salary, created_at, termination_date FROM employees WHERE id = ?`,
//       [employeeId]
//     );
//     if (!employeeRows.length) return res.status(404).json({ error: 'Employee not found' });

//     const salary = parseFloat(employeeRows[0].salary);
//     const joiningDate = moment(employeeRows[0].created_at);
//     const terminationDate = employeeRows[0].termination_date
//       ? moment(employeeRows[0].termination_date)
//       : null;

//     // ---- Effective start & end ----
//     let startDate = moment.max(startOfMonth, joiningDate);
//     let endDate = endOfMonth.clone();
//     if (terminationDate && terminationDate.isBefore(endDate)) endDate = terminationDate;

//     const today = moment();
//     if (today.isSame(startOfMonth, 'month') && today.isSame(startOfMonth, 'year')) {
//       endDate = moment.min(endDate, today);
//     }

//     if (startDate.isAfter(endOfMonth) || (terminationDate && terminationDate.isBefore(startOfMonth))) {
//       return res.json({}); // No payslip
//     }

//     // ---- Attendance ----
//     const [attendanceRows] = await db.query(
//       `SELECT date, status FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?`,
//       [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );

//     const presentDates = attendanceRows
//       .filter(a => a.status === 'Present')
//       .map(a => moment(a.date).format('YYYY-MM-DD'));
//     const presentDays = presentDates.length;

//     // ---- Leaves (Approved only) ----
//     const [leaveRows] = await db.query(
//       `SELECT start_date, end_date, no_of_days, halfDay, leave_type, status
//        FROM leave_requests
//        WHERE employee_id = ? AND status = 'Approved' AND end_date >= ? AND start_date <= ?`,
//       [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );

//     const getDatesBetween = (start, end) => {
//       const dates = [];
//       for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'day')) {
//         dates.push(m.clone());
//       }
//       return dates;
//     };

//     let paidLeaveDays = 0;
//     let unpaidLeaveDays = 0;

//     leaveRows.forEach(lv => {
//       const start = moment.max(moment(lv.start_date), startDate);
//       const end = moment.min(moment(lv.end_date), endDate);

//       const leaveDates = getDatesBetween(start, end);

//       leaveDates.forEach((d, idx) => {
//         const isHalfDay = lv.halfDay && idx === 0; // first day half if halfDay=1
//         if (lv.leave_type === 'Sick' || lv.leave_type === 'Paid') {
//           paidLeaveDays += isHalfDay ? 0.5 : 1;
//         } else {
//           unpaidLeaveDays += isHalfDay ? 0.5 : 1;
//         }
//       });
//     });

//     // ---- Weekends (Paid Holidays) ----
//     let weekendDays = 0;
//     for (let m = startDate.clone(); m.isSameOrBefore(endDate); m.add(1, 'day')) {
//       if ([0, 6].includes(m.day())) weekendDays++;
//     }

//     // ---- Salary Calculation ----
//     const daysInMonth = endOfMonth.date();
//     const effectiveDays = (paddedMonth === '02') ? 30 : daysInMonth; // Feb treated as 30
//     const dailySalary = salary / effectiveDays;

//     const leaveDeduction = unpaidLeaveDays * dailySalary;
//     const workingDays = presentDays + paidLeaveDays + weekendDays;
//     const grossSalary = dailySalary * workingDays;
//     const netSalary = Math.max(0, grossSalary - leaveDeduction);

//     // ---- Response ----
//     res.json({
//       employeeId,
//       month,
//       year,
//       presentDays,
//       paidLeaveDays,
//       unpaidLeaveDays,
//       weekendDays,
//       workingDays,
//       salary: salary.toFixed(2),
//       dailySalary: dailySalary.toFixed(2),
//       leaveDeduction: leaveDeduction.toFixed(2),
//       netSalary: netSalary.toFixed(2),
//       startDate: startDate.format('YYYY-MM-DD'),
//       endDate: endDate.format('YYYY-MM-DD'),
//       generatedAt: new Date()
//     });

//   } catch (err) {
//     console.error('Error fetching payslip:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });
router.get('/payslip/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.query;

  if (!employeeId || !month || !year) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  try {
    const paddedMonth = month.toString().padStart(2, '0');
    const startOfMonth = moment(`${year}-${paddedMonth}-01`).startOf('month');
    const endOfMonth = startOfMonth.clone().endOf('month');

    // ---- Employee details ----
    const [employeeRows] = await db.query(
      `SELECT salary, created_at, termination_date FROM employees WHERE id = ?`,
      [employeeId]
    );
    if (!employeeRows.length) return res.status(404).json({ error: 'Employee not found' });

    const salary = parseFloat(employeeRows[0].salary);
    const joiningDate = moment(employeeRows[0].created_at);
    const terminationDate = employeeRows[0].termination_date
      ? moment(employeeRows[0].termination_date)
      : null;

    let startDate = moment.max(startOfMonth, joiningDate);
    let endDate = endOfMonth.clone();
    if (terminationDate && terminationDate.isBefore(endDate)) endDate = terminationDate;

    const today = moment();
    if (today.isSame(startOfMonth, 'month') && today.isSame(startOfMonth, 'year')) {
      endDate = moment.min(endDate, today);
    }

    if (startDate.isAfter(endOfMonth) || (terminationDate && terminationDate.isBefore(startOfMonth))) {
      return res.json({});
    }

    // ---- Attendance ----
    // const [attendanceRows] = await db.query(
    //   `SELECT date, status FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?`,
    //   [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    // );

    // const attendanceMap = {};
    // attendanceRows.forEach(a => {
    //   attendanceMap[a.date] = a.status === 'Present' ? 1 : a.status === 'Half Day' ? 0.5 : 0;
    // });

    // ---- Attendance ----
    const [attendanceRows] = await db.query(
      `SELECT date, status, check_out
   FROM attendance 
   WHERE employee_id = ? AND date BETWEEN ? AND ?`,
      [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    const attendanceMap = {};

    attendanceRows.forEach(a => {

      // ❌ Skip Present if no check-out
      if (a.status === 'Present' && !a.check_out) {
        return;
      }

      // ❌ Skip Half-day if no check-out
      if (a.status === 'Half Day' && !a.check_out) {
        return;
      }

      attendanceMap[a.date] =
        a.status === 'Present' ? 1 :
          a.status === 'Half Day' ? 0.5 :
            0;
    });

    // ---- Leaves (Approved only) ----
    const [leaveRows] = await db.query(
      `SELECT start_date, end_date, halfDay, leave_type, status
       FROM leave_requests
       WHERE employee_id = ? AND status = 'Approved' AND end_date >= ? AND start_date <= ?`,
      [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );

    const getDatesBetween = (start, end) => {
      const dates = [];
      for (let m = moment(start); m.isSameOrBefore(end); m.add(1, 'day')) {
        dates.push(m.clone());
      }
      return dates;
    };

    const leaveMap = {};
    leaveRows.forEach(lv => {
      const start = moment.max(moment(lv.start_date), startDate);
      const end = moment.min(moment(lv.end_date), endDate);
      const leaveDates = getDatesBetween(start, end);

      leaveDates.forEach((d, idx) => {
        const dateStr = d.format('YYYY-MM-DD');
        const isHalfDay = lv.halfDay && idx === 0;
        const value = isHalfDay ? 0.5 : 1;
        const type = lv.leave_type === 'Sick' || lv.leave_type === 'Paid' ? 'paid' : 'unpaid';
        leaveMap[dateStr] = { type, value };
      });
    });

    // ---- Weekends ----
    const weekendDates = [];
    for (let m = startDate.clone(); m.isSameOrBefore(endDate); m.add(1, 'day')) {
      if ([0, 6].includes(m.day())) weekendDates.push(m.format('YYYY-MM-DD'));
    }

    // ---- Holidays from DB ----
    const [holidayRows] = await db.query(
      `SELECT date FROM holidays WHERE date BETWEEN ? AND ?`,
      [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
    );
    const holidayDates = holidayRows.map(h => moment(h.date).format('YYYY-MM-DD'));

    // ---- Calculate days ----
    let presentDays = 0;
    let paidLeaveDays = 0;
    let unpaidLeaveDays = 0;
    let weekendDays = 0;
    let holidayDays = 0;
    let halfDays = 0;
    let totalPresentDays = 0;
    let absentDays = 0;

    // Attendance
    Object.keys(attendanceMap).forEach(date => {
      const att = attendanceMap[date];
      const lv = leaveMap[date];

      if (lv) {
        if (lv.value === 0.5 && att === 0.5) {
          presentDays += 0.5;
          halfDays += 1;
        }
        else if (lv.value === 1) {
          if (lv.type === 'paid') paidLeaveDays += 1;
          else unpaidLeaveDays += 1;
        }
        delete leaveMap[date];
      } else {
        if (att === 0.5) {
          presentDays += 0.5;
          halfDays += 1; // ✅ count attendance half-day
        } else {
          presentDays += att;

          if (att === 1) {
            totalPresentDays += 1;
          }
        }
      }
    });

    // Remaining leave
    Object.values(leaveMap).forEach(lv => {
      if (lv.type === 'paid') {
        paidLeaveDays += lv.value;
        if (lv.value === 0.5) halfDays += 1; // ✅ leave half-day
      } else {
        unpaidLeaveDays += lv.value;
        if (lv.value === 0.5) halfDays += 1; // ✅ unpaid half-day
      }
    });

    // Weekends
    weekendDates.forEach(d => {
      if (!attendanceMap[d] && !leaveMap[d] && !holidayDates.includes(d)) weekendDays += 1;
    });

    // Holidays
    holidayDates.forEach(d => {
      if (!attendanceMap[d] && !leaveMap[d]) holidayDays += 1;
    });

    // ---- Salary Calculation ----
    // const daysInMonth = endOfMonth.date();
    // const effectiveDays = paddedMonth === '02' ? 30 : daysInMonth;
    // const dailySalary = salary / effectiveDays;

    // const workingDays = presentDays + paidLeaveDays + weekendDays + holidayDays;
    // const leaveDeduction = unpaidLeaveDays * dailySalary;
    // const netSalary = Math.max(0, workingDays * dailySalary - leaveDeduction);

    // let absentDays = 0;

    // for (let m = startDate.clone(); m.isSameOrBefore(endDate); m.add(1, 'day')) {
    //   const date = m.format('YYYY-MM-DD');

    //   const hasAttendance = attendanceMap.hasOwnProperty(date);
    //   const hasLeave = leaveMap.hasOwnProperty(date);
    //   const isWeekend = weekendDates.includes(date);
    //   const isHoliday = holidayDates.includes(date);

    //   // ✅ ABSENT = no attendance, no leave, not weekend, not holiday
    //   if (!hasAttendance && !hasLeave && !isWeekend && !isHoliday) {
    //     absentDays += 1;
    //   }
    // }

    const daysInMonth = endOfMonth.date();
    const effectiveDays = paddedMonth === '02' ? 30 : daysInMonth;
    const dailySalary = salary / effectiveDays;

    // absentDays = effectiveDays - (totalPresentDays - halfDays - weekendDays - holidayDays - paidLeaveDays - unpaidLeaveDays);

    absentDays =
      effectiveDays
      - weekendDays
      - holidayDays
      - paidLeaveDays
      - unpaidLeaveDays
      - totalPresentDays
      - halfDays;

    const absentDayDeduction = absentDays * dailySalary;

    // Half-day deduction = halfDays * 0.5 * dailySalary
    const halfDayDeduction = halfDays * 0.5 * dailySalary;
    const presentDaySalary = totalPresentDays * dailySalary;

    const paidDaySalary = (weekendDays + holidayDays + paidLeaveDays) * dailySalary;

    const workingDays = presentDays + paidLeaveDays + weekendDays + holidayDays;
    const leaveDeduction = unpaidLeaveDays * dailySalary;

    const salaryDeduction = halfDayDeduction + leaveDeduction + absentDayDeduction;
    // const salaryDeduction = halfDayDeduction + leaveDeduction;
    // const netSalary = Math.max(0, workingDays * dailySalary - salaryDeduction);

    const netSalary = workingDays * dailySalary;

    // ---- Check for Overrides ----
    const [overrideRows] = await db.query(
      `SELECT working_days, paid_leave_days, unpaid_leave_days, net_salary
       FROM salary_payslip 
       WHERE employee_id = ? AND month = ? AND year = ? 
       LIMIT 1`,
      [employeeId, month, year]
    );
    if (overrideRows.length) {
      const o = overrideRows[0];
      // ✅ Ensure conversion to number
      const finalNetSalary = Number(o.net_salary ?? netSalary);
      return res.json({
        employeeId,
        month,
        year,
        totalDays: effectiveDays,
        presentDays,
        totalPresentDays,
        paidLeaveDays: o.paid_leave_days ?? paidLeaveDays,
        unpaidLeaveDays: o.unpaid_leave_days ?? unpaidLeaveDays,
        weekendDays,
        workingDays: o.working_days ?? workingDays,
        halfDays,
        salary: salary.toFixed(2),
        dailySalary: dailySalary.toFixed(2),
        leaveDeduction: ((o.unpaid_leave_days ?? unpaidLeaveDays) * dailySalary).toFixed(2),
        netSalary: isNaN(finalNetSalary) ? 0 : finalNetSalary.toFixed(2),
        startDate: startDate.format('YYYY-MM-DD'),
        endDate: endDate.format('YYYY-MM-DD'),
        generatedAt: new Date(),
        halfDayDeduction: halfDayDeduction.toFixed(2),
        presentDaySalary: presentDaySalary.toFixed(2),
        paidDaySalary: paidDaySalary.toFixed(2),
        salaryDeduction: salaryDeduction.toFixed(2),
        weekendDays,
        holidayDays,
        absentDays,
        absentDayDeduction: absentDayDeduction.toFixed(2),
      });
    }
    // ---- Default response (no override) ----
    res.json({
      employeeId,
      month,
      year,
      totalDays: effectiveDays,
      presentDays,
      totalPresentDays,
      paidLeaveDays,   // approved paid leaves only
      weekendDays,
      holidayDays,
      unpaidLeaveDays,
      workingDays,
      halfDays,
      salary: salary.toFixed(2),
      dailySalary: dailySalary.toFixed(2),
      leaveDeduction: leaveDeduction.toFixed(2),
      halfDayDeduction: halfDayDeduction.toFixed(2),
      presentDaySalary: presentDaySalary.toFixed(2),
      paidDaySalary: paidDaySalary.toFixed(2),
      salaryDeduction: salaryDeduction.toFixed(2),
      netSalary: netSalary.toFixed(2),
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      generatedAt: new Date(),
      absentDays,
      absentDayDeduction: absentDayDeduction.toFixed(2),
    });

  } catch (err) {
    console.error('Error fetching payslip:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const sql = 'SELECT * FROM employees ';
    const [results] = await db.query(sql);
    // console.log(results);
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching employees:', err);
    res.status(500).json({ error: 'An error occurred while fetching employees' });
  }
});

router.get('/all-payslip/:employeeID', async (req, res) => {
  const employeeID = req.params.employeeID;
  try {
    const sql = 'SELECT * FROM salary_slips WHERE employee_id = ? ORDER BY year DESC, month DESC';
    const [results] = await db.query(sql, [employeeID]);
    if (results.length === 0) {
      return res.status(404).json({ message: 'No payslip found for this employee.' });
    }
    res.status(200).json(results);
  } catch (err) {
    console.error('Error fetching salary_slip:', err);
    res.status(500).json({ error: 'An error occurred while fetching salary slip' });
  }
});

// PATCH /payslip/override/:employeeId
router.patch('/override/:employeeId', async (req, res) => {
  const { employeeId } = req.params;
  const { month, year } = req.body;

  // Explicitly parse numbers with decimals
  const workingDays = parseFloat(req.body.workingDays ?? 0);
  const paidLeaveDays = parseFloat(req.body.paidLeaveDays ?? 0);
  const unpaidLeaveDays = parseFloat(req.body.unpaidLeaveDays ?? 0);
  const netSalary = parseFloat(req.body.netSalary ?? 0);

  if (!employeeId || !month || !year) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  try {
    const [rows] = await db.query(
      'SELECT id FROM salary_payslip WHERE employee_id = ? AND month = ? AND year = ?',
      [employeeId, month, year]
    );

    if (rows.length > 0) {
      // Update existing record
      await db.query(
        `UPDATE salary_payslip 
         SET working_days = ?, 
             paid_leave_days = ?, 
             unpaid_leave_days = ?, 
             net_salary = ?, 
             updated_at = NOW()
         WHERE employee_id = ? AND month = ? AND year = ?`,
        [workingDays, paidLeaveDays, unpaidLeaveDays, netSalary, employeeId, month, year]
      );
    } else {
      // Insert new record
      await db.query(
        `INSERT INTO salary_payslip 
         (employee_id, month, year, working_days, paid_leave_days, unpaid_leave_days, net_salary, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
        [employeeId, month, year, workingDays, paidLeaveDays, unpaidLeaveDays, netSalary]
      );
    }

    res.json({ message: 'Payslip override saved successfully' });
  } catch (err) {
    console.error('Error saving override:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;