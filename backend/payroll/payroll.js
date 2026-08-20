// const express = require('express');
// const router = express.Router();
// const db = require('../connection'); // adjust path to your db connection file
// const cron = require('node-cron');
// const moment = require('moment');

// // Add addon_amount column to salary_payslip if not already present (compatible with MySQL 5.7+)
// db.query(`
//   SELECT COUNT(*) AS cnt
//   FROM INFORMATION_SCHEMA.COLUMNS
//   WHERE TABLE_SCHEMA = DATABASE()
//     AND TABLE_NAME = 'salary_payslip'
//     AND COLUMN_NAME = 'addon_amount'
// `).then(([rows]) => {
//   if (rows[0].cnt === 0) {
//     return db.query(`ALTER TABLE salary_payslip ADD COLUMN addon_amount DECIMAL(10, 2) DEFAULT 0`);
//   }
// }).catch(() => {});

// // This cron job will run on the 1st day of every month at midnight
// cron.schedule('0 0 1 * *', async () => {
//   const today = new Date();
//   let month = today.getMonth(); // 0-11
//   let year = today.getFullYear();

//   // 👇 Go to previous month
//   month -= 1;
//   if (month < 0) {
//     month = 11;
//     year -= 1;
//   }

//   try {
//     // Get salary and unpaid leaves for last month
//     const [employees] = await db.query(`
//             SELECT e.id AS employee_id, e.salary,
//                    IFNULL(SUM(l.no_of_days), 0) AS unpaid_days
//             FROM employees e
//             LEFT JOIN leave_requests l
//                 ON e.id = l.employee_id
//                 AND l.leave_type = 'Unpaid'
//                 AND MONTH(l.start_date) = ?
//                 AND YEAR(l.start_date) = ?
//             GROUP BY e.id
//         `, [month + 1, year]); // SQL months are 1-indexed

//     for (const emp of employees) {
//       const { employee_id, salary, unpaid_days } = emp;
//       const baseSalary = salary || 0;
//       const unpaidDays = unpaid_days || 0;
//       if (isNaN(baseSalary) || isNaN(unpaidDays)) continue;

//       const perDaySalary = baseSalary / 30;
//       const finalSalary = baseSalary - (unpaidDays * perDaySalary);
//       if (isNaN(finalSalary)) continue;

//       await db.query(`
//                 INSERT INTO salary_slips 
//                 (employee_id, month, year, base_salary, unpaid_leave_days, final_salary)
//                 VALUES (?, ?, ?, ?, ?, ?)
//             `, [employee_id, month + 1, year, baseSalary, unpaidDays, finalSalary]);
//     }

//     console.log(`[${new Date().toISOString()}] ✅ Salary slips generated for ${month + 1}/${year}`);
//   } catch (err) {
//     console.error('❌ Error generating salary slips:', err);
//   }
// });

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

//     let startDate = moment.max(startOfMonth, joiningDate);
//     let endDate = endOfMonth.clone();
//     if (terminationDate && terminationDate.isBefore(endDate)) endDate = terminationDate;

//     const today = moment();
//     if (today.isSame(startOfMonth, 'month') && today.isSame(startOfMonth, 'year')) {
//       endDate = moment.min(endDate, today);
//     }

//     if (startDate.isAfter(endOfMonth) || (terminationDate && terminationDate.isBefore(startOfMonth))) {
//       return res.json({});
//     }

//     // ---- Attendance ----
//     // const [attendanceRows] = await db.query(
//     //   `SELECT date, status FROM attendance WHERE employee_id = ? AND date BETWEEN ? AND ?`,
//     //   [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     // );

//     // const attendanceMap = {};
//     // attendanceRows.forEach(a => {
//     //   attendanceMap[a.date] = a.status === 'Present' ? 1 : a.status === 'Half Day' ? 0.5 : 0;
//     // });

//     // ---- Attendance ----
//     const [attendanceRows] = await db.query(
//       `SELECT date, status, check_out
//    FROM attendance 
//    WHERE employee_id = ? AND date BETWEEN ? AND ?`,
//       [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );

//     const attendanceMap = {};

//     attendanceRows.forEach(a => {

//       // ❌ Skip Present if no check-out
//       if (a.status === 'Present' && !a.check_out) {
//         return;
//       }

//       // ❌ Skip Half-day if no check-out
//       if (a.status === 'Half Day' && !a.check_out) {
//         return;
//       }

//       attendanceMap[a.date] =
//         a.status === 'Present' ? 1 :
//           a.status === 'Half Day' ? 0.5 :
//             0;
//     });

//     // ---- Leaves (Approved only) ----
//     const [leaveRows] = await db.query(
//       `SELECT start_date, end_date, halfDay, leave_type, status
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

//     const leaveMap = {};
//     leaveRows.forEach(lv => {
//       const start = moment.max(moment(lv.start_date), startDate);
//       const end = moment.min(moment(lv.end_date), endDate);
//       const leaveDates = getDatesBetween(start, end);

//       leaveDates.forEach((d, idx) => {
//         const dateStr = d.format('YYYY-MM-DD');
//         const isHalfDay = lv.halfDay && idx === 0;
//         const value = isHalfDay ? 0.5 : 1;
//         const type = lv.leave_type === 'Sick' || lv.leave_type === 'Paid' ? 'paid' : 'unpaid';
//         leaveMap[dateStr] = { type, value };
//       });
//     });

//     // ---- Weekends ----
//     const weekendDates = [];
//     for (let m = startDate.clone(); m.isSameOrBefore(endDate); m.add(1, 'day')) {
//       if ([0, 6].includes(m.day())) weekendDates.push(m.format('YYYY-MM-DD'));
//     }

//     // ---- Holidays from DB ----
//     const [holidayRows] = await db.query(
//       `SELECT date FROM holidays WHERE date BETWEEN ? AND ?`,
//       [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );
//     const holidayDates = holidayRows.map(h => moment(h.date).format('YYYY-MM-DD'));

//     // ---- Calculate days ----
//     let presentDays = 0;
//     let paidLeaveDays = 0;
//     let unpaidLeaveDays = 0;
//     let weekendDays = 0;
//     let holidayDays = 0;
//     let halfDays = 0;
//     let totalPresentDays = 0;
//     let absentDays = 0;

//     // Attendance
//     Object.keys(attendanceMap).forEach(date => {
//       const att = attendanceMap[date];
//       const lv = leaveMap[date];

//       if (lv) {
//         if (lv.value === 0.5 && att === 0.5) {
//           presentDays += 0.5;
//           halfDays += 1;
//         }
//         else if (lv.value === 1) {
//           if (lv.type === 'paid') paidLeaveDays += 1;
//           else unpaidLeaveDays += 1;
//         }
//         delete leaveMap[date];
//       } else {
//         if (att === 0.5) {
//           presentDays += 0.5;
//           halfDays += 1; // ✅ count attendance half-day
//         } else {
//           presentDays += att;

//           if (att === 1) {
//             totalPresentDays += 1;
//           }
//         }
//       }
//     });

//     // Remaining leave
//     Object.values(leaveMap).forEach(lv => {
//       if (lv.type === 'paid') {
//         paidLeaveDays += lv.value;
//         if (lv.value === 0.5) halfDays += 1; // ✅ leave half-day
//       } else {
//         unpaidLeaveDays += lv.value;
//         if (lv.value === 0.5) halfDays += 1; // ✅ unpaid half-day
//       }
//     });

//     // Weekends
//     weekendDates.forEach(d => {
//       if (!attendanceMap[d] && !leaveMap[d] && !holidayDates.includes(d)) weekendDays += 1;
//     });

//     // Holidays
//     holidayDates.forEach(d => {
//       if (!attendanceMap[d] && !leaveMap[d]) holidayDays += 1;
//     });

//     // ---- Salary Calculation ----
//     // const daysInMonth = endOfMonth.date();
//     // const effectiveDays = paddedMonth === '02' ? 30 : daysInMonth;
//     // const dailySalary = salary / effectiveDays;

//     // const workingDays = presentDays + paidLeaveDays + weekendDays + holidayDays;
//     // const leaveDeduction = unpaidLeaveDays * dailySalary;
//     // const netSalary = Math.max(0, workingDays * dailySalary - leaveDeduction);

//     // let absentDays = 0;

//     // for (let m = startDate.clone(); m.isSameOrBefore(endDate); m.add(1, 'day')) {
//     //   const date = m.format('YYYY-MM-DD');

//     //   const hasAttendance = attendanceMap.hasOwnProperty(date);
//     //   const hasLeave = leaveMap.hasOwnProperty(date);
//     //   const isWeekend = weekendDates.includes(date);
//     //   const isHoliday = holidayDates.includes(date);

//     //   // ✅ ABSENT = no attendance, no leave, not weekend, not holiday
//     //   if (!hasAttendance && !hasLeave && !isWeekend && !isHoliday) {
//     //     absentDays += 1;
//     //   }
//     // }

//     const daysInMonth = endOfMonth.date();
//     const effectiveDays = paddedMonth === '02' ? 30 : daysInMonth;
//     const dailySalary = salary / effectiveDays;

//     // absentDays = effectiveDays - (totalPresentDays - halfDays - weekendDays - holidayDays - paidLeaveDays - unpaidLeaveDays);

//     absentDays =
//       effectiveDays
//       - weekendDays
//       - holidayDays
//       - paidLeaveDays
//       - unpaidLeaveDays
//       - totalPresentDays
//       - halfDays;

//     const absentDayDeduction = absentDays * dailySalary;

//     // Half-day deduction = halfDays * 0.5 * dailySalary
//     const halfDayDeduction = halfDays * 0.5 * dailySalary;
//     const presentDaySalary = totalPresentDays * dailySalary;

//     const paidDaySalary = (weekendDays + holidayDays + paidLeaveDays) * dailySalary;

//     const workingDays = presentDays + paidLeaveDays + weekendDays + holidayDays;
//     const leaveDeduction = unpaidLeaveDays * dailySalary;

//     const salaryDeduction = halfDayDeduction + leaveDeduction + absentDayDeduction;
//     // const salaryDeduction = halfDayDeduction + leaveDeduction;
//     // const netSalary = Math.max(0, workingDays * dailySalary - salaryDeduction);

//     const netSalary = workingDays * dailySalary;

//     // ---- Check for Overrides ----
//     const [overrideRows] = await db.query(
//       `SELECT working_days, paid_leave_days, unpaid_leave_days, net_salary
//        FROM salary_payslip 
//        WHERE employee_id = ? AND month = ? AND year = ? 
//        LIMIT 1`,
//       [employeeId, month, year]
//     );
//     if (overrideRows.length) {
//       const o = overrideRows[0];
//       // ✅ Ensure conversion to number
//       const finalNetSalary = Number(o.net_salary ?? netSalary);
//       return res.json({
//         employeeId,
//         month,
//         year,
//         totalDays: effectiveDays,
//         presentDays,
//         totalPresentDays,
//         paidLeaveDays: o.paid_leave_days ?? paidLeaveDays,
//         unpaidLeaveDays: o.unpaid_leave_days ?? unpaidLeaveDays,
//         weekendDays,
//         workingDays: o.working_days ?? workingDays,
//         halfDays,
//         salary: salary.toFixed(2),
//         dailySalary: dailySalary.toFixed(2),
//         leaveDeduction: ((o.unpaid_leave_days ?? unpaidLeaveDays) * dailySalary).toFixed(2),
//         netSalary: isNaN(finalNetSalary) ? 0 : finalNetSalary.toFixed(2),
//         startDate: startDate.format('YYYY-MM-DD'),
//         endDate: endDate.format('YYYY-MM-DD'),
//         generatedAt: new Date(),
//         halfDayDeduction: halfDayDeduction.toFixed(2),
//         presentDaySalary: presentDaySalary.toFixed(2),
//         paidDaySalary: paidDaySalary.toFixed(2),
//         salaryDeduction: salaryDeduction.toFixed(2),
//         weekendDays,
//         holidayDays,
//         absentDays,
//         absentDayDeduction: absentDayDeduction.toFixed(2),
//       });
//     }
//     // ---- Default response (no override) ----
//     res.json({
//       employeeId,
//       month,
//       year,
//       totalDays: effectiveDays,
//       presentDays,
//       totalPresentDays,
//       paidLeaveDays,   // approved paid leaves only
//       weekendDays,
//       holidayDays,
//       unpaidLeaveDays,
//       workingDays,
//       halfDays,
//       salary: salary.toFixed(2),
//       dailySalary: dailySalary.toFixed(2),
//       leaveDeduction: leaveDeduction.toFixed(2),
//       halfDayDeduction: halfDayDeduction.toFixed(2),
//       presentDaySalary: presentDaySalary.toFixed(2),
//       paidDaySalary: paidDaySalary.toFixed(2),
//       salaryDeduction: salaryDeduction.toFixed(2),
//       netSalary: netSalary.toFixed(2),
//       startDate: startDate.format('YYYY-MM-DD'),
//       endDate: endDate.format('YYYY-MM-DD'),
//       generatedAt: new Date(),
//       absentDays,
//       absentDayDeduction: absentDayDeduction.toFixed(2),
//     });

//   } catch (err) {
//     console.error('Error fetching payslip:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// /**
//  * HELPERS
//  */
// const getDatesBetween = (start, end) => {
//   const arr = [];
//   let m = moment(start);
//   while (m.isSameOrBefore(end)) {
//     arr.push(m.format('YYYY-MM-DD'));
//     m.add(1, 'day');
//   }
//   return arr;
// };

// /**
//  * SANDWICH LEAVE RULE
//  *
//  * Rules:
//  *  1. Leave adjacent to a holiday → include the holiday AND any weekend days
//  *     immediately bordering that holiday.
//  *  2. Two leave days separated only by weekends/holidays → include all days
//  *     between them (fills the "bridge" gap).
//  *
//  * Returns { allDeductible: string[], sandwichExtraDays: number }
//  */
// const computeDeductibleDays = (rawLeaveDates, holidayDates) => {
//   if (!rawLeaveDates.length) return { allDeductible: [], sandwichExtraDays: 0 };

//   const leaveDateSet = new Set(rawLeaveDates);
//   const holidaySet   = new Set(holidayDates);
//   const deductibleSet = new Set(rawLeaveDates);

//   // Rule 1: leave adjacent to a holiday → include holiday + its bordering weekend
//   rawLeaveDates.forEach(dateStr => {
//     const d = moment(dateStr);
//     for (const offset of [-1, 1]) {
//       const adj    = d.clone().add(offset, 'days');
//       const adjStr = adj.format('YYYY-MM-DD');
//       if (!holidaySet.has(adjStr)) continue;

//       deductibleSet.add(adjStr);

//       // Expand to any weekend days touching this holiday
//       for (const o2 of [-1, 1]) {
//         const w = adj.clone().add(o2, 'days');
//         if (![0, 6].includes(w.day())) continue;
//         deductibleSet.add(w.format('YYYY-MM-DD'));
//         // Include both Saturday and Sunday as a pair
//         const pair = w.day() === 6 ? w.clone().add(1, 'days') : w.clone().subtract(1, 'days');
//         deductibleSet.add(pair.format('YYYY-MM-DD'));
//       }
//     }
//   });

//   // Rule 2: gap between two leave dates filled only by weekends/holidays → fill it
//   const sortedLeaves = [...leaveDateSet].sort();
//   for (let i = 0; i < sortedLeaves.length - 1; i++) {
//     const d1   = moment(sortedLeaves[i]);
//     const d2   = moment(sortedLeaves[i + 1]);
//     const diff = d2.diff(d1, 'days');
//     if (diff <= 1) continue;

//     const gap = [];
//     let allNonWorking = true;
//     for (let j = 1; j < diff; j++) {
//       const between    = d1.clone().add(j, 'days');
//       const betweenStr = between.format('YYYY-MM-DD');
//       gap.push(betweenStr);
//       if (![0, 6].includes(between.day()) && !holidaySet.has(betweenStr)) {
//         allNonWorking = false;
//         break;
//       }
//     }
//     if (allNonWorking) gap.forEach(ds => deductibleSet.add(ds));
//   }

//   const sandwichExtraDays = [...deductibleSet].filter(d => {
//     if (leaveDateSet.has(d)) return false;          // actual leave day, not "extra"
//     const day = moment(d).day();
//     if (day === 0 || day === 6) return false;       // weekends are always paid
//     if (holidaySet.has(d)) return false;            // holidays are always paid
//     return true;
//   }).length;
//   return { allDeductible: [...deductibleSet], sandwichExtraDays };
// };

// /**
//  * MAIN PAYSLIP API
//  */

// // http://localhost:5001/api/payroll/payslip/20?month=6&year=2026
// router.get('/payslip/:employeeId', async (req, res) => {
//   const { employeeId } = req.params;
//   const { month, year } = req.query;

//   if (!employeeId || !month || !year) {
//     return res.status(400).json({ error: 'Missing parameters' });
//   }

//   try {
//     const startOfMonth = moment(`${year}-${month}-01`).startOf('month');
//     const endOfMonth = moment(startOfMonth).endOf('month');

//     /**
//      * EMPLOYEE
//      */
//     const [empRows] = await db.query(
//       // added code below is — also select incentive for BDE salary addition
//       `SELECT salary, incentive, created_at, termination_date
//        FROM employees
//        WHERE id = ?`,
//       [employeeId]
//     );

//     if (!empRows.length) {
//       return res.status(404).json({ error: 'Employee not found' });
//     }

//     const salary = Number(empRows[0].salary);
//     // added code below is — incentive amount to add to BDE net salary
//     const incentiveAmount = Number(empRows[0].incentive || 0);
//     const joiningDate = moment(empRows[0].created_at);
//     const terminationDate = empRows[0].termination_date
//       ? moment(empRows[0].termination_date)
//       : null;

//     let startDate = moment.max(startOfMonth, joiningDate);
//     let endDate = terminationDate
//       ? moment.min(endOfMonth, terminationDate)
//       : endOfMonth;

//     if (startDate.isAfter(endDate)) {
//       return res.json({});
//     }

//     /**
//      * ATTENDANCE
//      */
//     const [attendanceRows] = await db.query(
//       `SELECT date, status, check_out
//        FROM attendance
//        WHERE employee_id = ? AND date BETWEEN ? AND ?`,
//       [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );

//     const attendanceMap = {};

//     attendanceRows.forEach(a => {
//       if ((a.status === 'Present' || a.status === 'Half Day') && !a.check_out) return;

//       attendanceMap[a.date] =
//         a.status === 'Present' ? 1 :
//         a.status === 'Half Day' ? 0.5 : 0;
//     });

//     /**
//      * HOLIDAYS
//      */
//     const [holidayRows] = await db.query(
//       `SELECT date FROM holidays WHERE date BETWEEN ? AND ?`,
//       [startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );

//     const holidayDates = holidayRows.map(h =>
//       moment(h.date).format('YYYY-MM-DD')
//     );

//     /**
//      * LEAVES
//      */
//     const [leaveRows] = await db.query(
//       `SELECT start_date, end_date, halfDay, leave_type
//        FROM leave_requests
//        WHERE employee_id = ?
//        AND status = 'Approved'
//        AND end_date >= ?
//        AND start_date <= ?`,
//       [employeeId, startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD')]
//     );

//     const leaveMap = {};
//     let totalLeaveDays = 0;
//     const rawLeaveDateSet = new Set(); // all leave dates including weekends/holidays

//     leaveRows.forEach(lv => {
//       const start = moment.max(moment(lv.start_date), startDate);
//       const end = moment.min(moment(lv.end_date), endDate);

//       const isHalf = lv.halfDay === 'Half Day';

//       getDatesBetween(start, end).forEach(date => {
//         const d = moment(date);
//         const dateStr = d.format('YYYY-MM-DD');

//         rawLeaveDateSet.add(dateStr); // collect for sandwich detection

//         if ([0, 6].includes(d.day())) return; // weekends ignored in leave calc
//         if (holidayDates.includes(dateStr)) return;

//         const value = isHalf ? 0.5 : 1;

//         leaveMap[dateStr] = value;
//         totalLeaveDays += value;
//       });
//     });

//     /**
//      * WEEKENDS
//      * Count all weekends in the payable window for display.
//      */
//     let weekendDays = 0;
//     for (let d = moment(startDate); d.isSameOrBefore(endOfMonth); d.add(1, 'day')) {
//       if ([0, 6].includes(d.day())) weekendDays++;
//     }

//     /**
//      * DAILY SALARY
//      */
//     const daysInMonth = endOfMonth.date();
//     const dailySalary = salary / daysInMonth;
//     const totalMonthDays = daysInMonth;

//     /**
//      * PRESENT DAYS
//      * Track weekday and weekend attendance separately so we can compute absent
//      * weekdays accurately. Attendance wins over leave on the same day.
//      */
//     let presentWeekdays = 0;
//     let presentWeekends = 0;
//     let halfDays = 0;

//     Object.keys(attendanceMap).forEach(date => {
//       const att = attendanceMap[date];
//       const isWeekend = [0, 6].includes(moment(date).day());

//       // Attendance wins: cancel any leave on this date
//       if (leaveMap[date] !== undefined) {
//         totalLeaveDays = Math.max(0, totalLeaveDays - leaveMap[date]);
//         delete leaveMap[date];
//       }
//       rawLeaveDateSet.delete(date); // attendance overrides leave for sandwich detection too

//       if (att === 0.5) {
//         halfDays++;
//         if (isWeekend) presentWeekends += 0.5;
//         else presentWeekdays += 0.5;
//       } else if (att === 1) {
//         if (isWeekend) presentWeekends++;
//         else presentWeekdays++;
//       }
//     });

//     // Combined present days for display
//     const presentDays = presentWeekdays + presentWeekends;

//     /**
//      * HOLIDAY COUNT
//      */
//     const holidayDays = holidayDates.length;

//     /**
//      * PAID LEAVE RULE — 1 paid leave per month; beyond that is unpaid
//      */
//     const paidLeaveQuota = 1;
//     const paidLeaveDays   = Math.min(totalLeaveDays, paidLeaveQuota);
//     const unpaidLeaveDays = Math.max(0, totalLeaveDays - paidLeaveQuota);

//     /**
//      * TOTAL WORKING DAYS in the month (weekdays, excluding holidays)
//      */
//     let totalWorkingDays = 0;
//     for (let d = moment(startDate); d.isSameOrBefore(endOfMonth); d.add(1, 'day')) {
//       if (![0, 6].includes(d.day()) && !holidayDates.includes(d.format('YYYY-MM-DD'))) {
//         totalWorkingDays++;
//       }
//     }

//     /**
//      * SANDWICH LEAVE DETECTION
//      * Full multi-day bridge rule:
//      *  - Leave adjacent to holiday → also deduct the holiday + any bordering weekends
//      *  - Two leave days bridged only by weekends/holidays → deduct the whole span
//      */
//     const { sandwichExtraDays } = computeDeductibleDays(
//       [...rawLeaveDateSet],
//       holidayDates
//     );
//     const sandwichDays = sandwichExtraDays;

//     /**
//      * NET SALARY — deduction-based formula
//      *
//      * Weekends and holidays are always paid, so we never deduct them.
//      * We deduct only:
//      *   (a) unpaid leave days  (leaves beyond the 1/month quota)
//      *   (b) absent weekdays    (weekdays with no attendance AND no leave)
//      *
//      * This avoids the double-count / cap problem in the old additive formula.
//      */
//     const absentWeekdays = Math.max(0, totalWorkingDays - presentWeekdays - totalLeaveDays);
//     const absentDays     = absentWeekdays;
//     const deductDays     = unpaidLeaveDays + sandwichExtraDays + absentWeekdays;
//     const netPaidDays    = Math.max(0, totalMonthDays - deductDays);

//     const hasActivity  = presentWeekdays > 0 || presentWeekends > 0 || totalLeaveDays > 0;
//     const netSalary    = hasActivity ? netPaidDays * dailySalary : 0;
//     const leaveDeduction = deductDays * dailySalary;

//     /**
//      * ADDON AMOUNT — fetch any saved add-on from override record
//      */
//     const [overrideRows] = await db.query(
//       'SELECT addon_amount FROM salary_payslip WHERE employee_id = ? AND month = ? AND year = ?',
//       [employeeId, month, year]
//     );
//     const addonAmount = overrideRows.length ? parseFloat(overrideRows[0].addon_amount || 0) : 0;

//     /**
//      * RESPONSE
//      */
//     return res.json({
//       employeeId,
//       month,
//       year,
//       totalDays: daysInMonth,
//       totalWorkingDays,
//       salary: salary.toFixed(2),
//       dailySalary: dailySalary.toFixed(2),
//       presentDays,
//       halfDays,
//       weekendDays,
//       holidayDays,
//       totalLeaveDays,
//       paidLeaveDays,
//       unpaidLeaveDays,
//       sandwichDays,
//       absentDays,
//       workingDays: netPaidDays,
//       leaveDeduction: leaveDeduction.toFixed(2),
//       netSalary: netSalary.toFixed(2),
//       addonAmount: addonAmount.toFixed(2),
//       // added code below is — incentive amount from employees table (BDE monthly incentive)
//       incentiveAmount: incentiveAmount.toFixed(2),
//       startDate: startDate.format('YYYY-MM-DD'),
//       endDate: endDate.format('YYYY-MM-DD'),
//       generatedAt: new Date()
//     });

//   } catch (err) {
//     console.error('Payroll error:', err);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// });

// router.get('/', async (req, res) => {
//   try {
//     const sql = 'SELECT * FROM employees ';
//     const [results] = await db.query(sql);
//     // console.log(results);
//     res.status(200).json(results);
//   } catch (err) {
//     console.error('Error fetching employees:', err);
//     res.status(500).json({ error: 'An error occurred while fetching employees' });
//   }
// });

// // router.get('/all-payslip/:employeeID', async (req, res) => {
// //   const employeeID = req.params.employeeID;
// //   try {
// //     const sql = 'SELECT * FROM salary_slips WHERE employee_id = ? ORDER BY year DESC, month DESC';
// //     const [results] = await db.query(sql, [employeeID]);
// //     if (results.length === 0) {
// //       return res.status(404).json({ message: 'No payslip found for this employee.' });
// //     }
// //     res.status(200).json(results);
// //   } catch (err) {
// //     console.error('Error fetching salary_slip:', err);
// //     res.status(500).json({ error: 'An error occurred while fetching salary slip' });
// //   }
// // });

// // PATCH /payslip/override/:employeeId


// // router.get('/all-payslip/:employeeID', async (req, res) => {
// //   const employeeID = req.params.employeeID;

// //   try {
// //     const sql = `
// //       SELECT * 
// //       FROM salary_payslip 
// //       WHERE employee_id = ? 
// //       ORDER BY year DESC, month DESC
// //     `;

// //     const [results] = await db.query(sql, [employeeID]);

// //     if (results.length === 0) {
// //       return res.status(404).json({ message: 'No payslip found for this employee.' });
// //     }

// //     res.status(200).json(results);
// //   } catch (err) {
// //     console.error('Error fetching salary_payslip:', err);
// //     res.status(500).json({ error: 'An error occurred while fetching salary slip' });
// //   }
// // });



// // router.patch('/override/:employeeId', async (req, res) => {
// //   const { employeeId } = req.params;
// //   const { month, year } = req.body;

// //   const workingDays    = parseFloat(req.body.workingDays    ?? 0);
// //   const paidLeaveDays  = parseFloat(req.body.paidLeaveDays  ?? 0);
// //   const unpaidLeaveDays = parseFloat(req.body.unpaidLeaveDays ?? 0);
// //   const netSalary      = parseFloat(req.body.netSalary      ?? 0);
// //   const addonAmount    = parseFloat(req.body.addonAmount    ?? 0);
// // m
// //   if (!employeeId || !month || !year) {
// //     return res.status(400).json({ error: 'Missing required parameters' });
// //   }

// //   try {
// //     const [rows] = await db.query(
// //       'SELECT id FROM salary_payslip WHERE employee_id = ? AND month = ? AND year = ?',
// //       [employeeId, month, year]
// //     );

// //     if (rows.length > 0) {
// //       await db.query(
// //         `UPDATE salary_payslip
// //          SET working_days = ?, paid_leave_days = ?, unpaid_leave_days = ?,
// //              net_salary = ?, addon_amount = ?, updated_at = NOW()
// //          WHERE employee_id = ? AND month = ? AND year = ?`,
// //         [workingDays, paidLeaveDays, unpaidLeaveDays, netSalary, addonAmount, employeeId, month, year]
// //       );
// //     } else {
// //       await db.query(
// //         `INSERT INTO salary_payslip
// //          (employee_id, month, year, working_days, paid_leave_days, unpaid_leave_days, net_salary, addon_amount, created_at)
// //          VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
// //         [employeeId, month, year, workingDays, paidLeaveDays, unpaidLeaveDays, netSalary, addonAmount]
// //       );
// //     }

// //     res.json({ message: 'Payslip override saved successfully' });
// //   } catch (err) {
// //     console.error('Error saving override:', err);
// //     res.status(500).json({ error: 'Internal server error' });
// //   }
// // });

// module.exports = router;



const express = require('express');
const router = express.Router();
const db = require('../connection');
const cron = require('node-cron');
const moment = require('moment');

/**
 * ============================================================
 * ENSURE ADDON AMOUNT COLUMN EXISTS
 * ============================================================
 */
db.query(`
  SELECT COUNT(*) AS cnt
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'salary_payslip'
    AND COLUMN_NAME = 'addon_amount'
`)
  .then(([rows]) => {
    if (rows[0].cnt === 0) {
      return db.query(`
        ALTER TABLE salary_payslip
        ADD COLUMN addon_amount DECIMAL(10, 2) DEFAULT 0
      `);
    }
  })
  .catch(err => {
    console.error(
      'Could not verify addon_amount column:',
      err.message
    );
  });


/**
 * ============================================================
 * GENERATE PREVIOUS MONTH OLD SALARY SLIPS
 * Runs on the 1st day of every month.
 * ============================================================
 */
cron.schedule('0 0 1 * *', async () => {

  const today = new Date();

  let month = today.getMonth();
  let year = today.getFullYear();

  month -= 1;

  if (month < 0) {
    month = 11;
    year -= 1;
  }

  try {

    const [employees] = await db.query(`
      SELECT
        e.id AS employee_id,
        e.salary,

        IFNULL(
          SUM(
            CASE
              WHEN l.leave_type = 'Unpaid'
               AND MONTH(l.start_date) = ?
               AND YEAR(l.start_date) = ?
              THEN l.no_of_days
              ELSE 0
            END
          ),
          0
        ) AS unpaid_days

      FROM employees e

      LEFT JOIN leave_requests l
        ON e.id = l.employee_id

      GROUP BY e.id
    `, [
      month + 1,
      year
    ]);


    for (const emp of employees) {

      const baseSalary =
        Number(emp.salary || 0);

      const unpaidDays =
        Number(emp.unpaid_days || 0);


      if (
        !Number.isFinite(baseSalary) ||
        !Number.isFinite(unpaidDays)
      ) {
        continue;
      }


      const perDaySalary =
        baseSalary / 30;


      const finalSalary =
        baseSalary -
        unpaidDays * perDaySalary;


      await db.query(`
        INSERT INTO salary_slips
        (
          employee_id,
          month,
          year,
          base_salary,
          unpaid_leave_days,
          final_salary
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [
        emp.employee_id,
        month + 1,
        year,
        baseSalary,
        unpaidDays,
        finalSalary
      ]);

    }


    console.log(
      `[${new Date().toISOString()}] Salary slips generated for ${month + 1}/${year}`
    );

  } catch (err) {

    console.error(
      'Error generating salary slips:',
      err
    );

  }

});


/**
 * ============================================================
 * GET DATES BETWEEN TWO MOMENTS
 * ============================================================
 */
const getDatesBetween = (start, end) => {

  const dates = [];

  const current =
    moment(start).startOf('day');

  const last =
    moment(end).startOf('day');


  while (
    current.isSameOrBefore(last, 'day')
  ) {

    dates.push(
      current.format('YYYY-MM-DD')
    );

    current.add(1, 'day');
  }


  return dates;
};


/**
 * ============================================================
 * SANDWICH LEAVE CALCULATION
 * ============================================================
 */
const computeDeductibleDays = (
  rawLeaveDates,
  holidayDates
) => {

  if (!rawLeaveDates.length) {

    return {
      allDeductible: [],
      sandwichExtraDays: 0
    };

  }


  const leaveDateSet =
    new Set(rawLeaveDates);

  const holidaySet =
    new Set(holidayDates);

  const deductibleSet =
    new Set(rawLeaveDates);


  /**
   * ----------------------------------------------------------
   * Leave next to holiday
   * ----------------------------------------------------------
   */
  rawLeaveDates.forEach(dateStr => {

    const date =
      moment(dateStr);


    for (const offset of [-1, 1]) {

      const adjacent =
        date.clone().add(
          offset,
          'days'
        );


      const adjacentStr =
        adjacent.format(
          'YYYY-MM-DD'
        );


      if (
        !holidaySet.has(adjacentStr)
      ) {
        continue;
      }


      deductibleSet.add(
        adjacentStr
      );


      for (
        const weekendOffset of [-1, 1]
      ) {

        const weekendDate =
          adjacent
            .clone()
            .add(
              weekendOffset,
              'days'
            );


        if (
          ![0, 6].includes(
            weekendDate.day()
          )
        ) {
          continue;
        }


        deductibleSet.add(
          weekendDate.format(
            'YYYY-MM-DD'
          )
        );


        const pairDate =
          weekendDate.day() === 6

            ? weekendDate
                .clone()
                .add(1, 'day')

            : weekendDate
                .clone()
                .subtract(1, 'day');


        deductibleSet.add(
          pairDate.format(
            'YYYY-MM-DD'
          )
        );

      }

    }

  });


  /**
   * ----------------------------------------------------------
   * Leave separated only by weekends / holidays
   * ----------------------------------------------------------
   */
  const sortedLeaves =
    [...leaveDateSet].sort();


  for (
    let i = 0;
    i < sortedLeaves.length - 1;
    i++
  ) {

    const first =
      moment(sortedLeaves[i]);

    const second =
      moment(sortedLeaves[i + 1]);


    const diff =
      second.diff(
        first,
        'days'
      );


    if (diff <= 1) {
      continue;
    }


    const gap = [];

    let allNonWorking = true;


    for (
      let j = 1;
      j < diff;
      j++
    ) {

      const between =
        first
          .clone()
          .add(
            j,
            'days'
          );


      const betweenStr =
        between.format(
          'YYYY-MM-DD'
        );


      gap.push(
        betweenStr
      );


      if (
        ![0, 6].includes(
          between.day()
        ) &&
        !holidaySet.has(
          betweenStr
        )
      ) {

        allNonWorking = false;

        break;

      }

    }


    if (allNonWorking) {

      gap.forEach(
        dateStr => {
          deductibleSet.add(
            dateStr
          );
        }
      );

    }

  }


  /**
   * ----------------------------------------------------------
   * Calculate extra sandwich days
   * ----------------------------------------------------------
   */
  const sandwichExtraDays =
    [...deductibleSet].filter(
      dateStr => {

        if (
          leaveDateSet.has(
            dateStr
          )
        ) {
          return false;
        }


        const day =
          moment(dateStr).day();


        if (
          day === 0 ||
          day === 6
        ) {
          return false;
        }


        if (
          holidaySet.has(
            dateStr
          )
        ) {
          return false;
        }


        return true;

      }
    ).length;


  return {

    allDeductible:
      [...deductibleSet],

    sandwichExtraDays

  };

};


/**
 * ============================================================
 * MAIN PAYSLIP API
 * ============================================================
 *
 * GET:
 *
 * /api/payroll/payslip/:employeeId?month=8&year=2026
 *
 * Attendance rules:
 *
 * Present  = 1 day
 * Half Day = 0.5 day
 *
 * check_out is NOT required.
 *
 * Attendance is loaded for the COMPLETE selected month.
 *
 * IMPORTANT FIX:
 *
 * Payroll calculation also uses the COMPLETE selected month.
 * ============================================================
 */
router.get(
  '/payslip/:employeeId',
  async (req, res) => {

    const {
      employeeId
    } = req.params;


    const month =
      Number(req.query.month);

    const year =
      Number(req.query.year);


    /**
     * ----------------------------------------------------------
     * Validate request
     * ----------------------------------------------------------
     */
    if (
      !employeeId ||
      !Number.isInteger(month) ||
      month < 1 ||
      month > 12 ||
      !Number.isInteger(year)
    ) {

      return res.status(400).json({
        error:
          'Valid employeeId, month and year are required'
      });

    }


    try {

      /**
       * ========================================================
       * SELECTED MONTH
       * ========================================================
       */
      const startOfMonth =
        moment({
          year,
          month: month - 1,
          day: 1
        }).startOf('day');


      const endOfMonth =
        startOfMonth
          .clone()
          .endOf('month');


      /**
       * ========================================================
       * EMPLOYEE
       * ========================================================
       */
      const [employeeRows] =
        await db.query(
          `
          SELECT
            salary,
            incentive,
            created_at,
            termination_date

          FROM employees

          WHERE id = ?
          `,
          [employeeId]
        );


      if (
        !employeeRows.length
      ) {

        return res.status(404).json({
          error:
            'Employee not found'
        });

      }


      const employee =
        employeeRows[0];


      const salary =
        Number(
          employee.salary || 0
        );


      const incentiveAmount =
        Number(
          employee.incentive || 0
        );


      if (
        !Number.isFinite(salary)
      ) {

        return res.status(500).json({
          error:
            'Invalid employee salary'
        });

      }


      /**
       * --------------------------------------------------------
       * Joining / termination dates
       *
       * These are kept for employee information compatibility.
       *
       * IMPORTANT:
       * They are NOT used to shorten the selected monthly
       * payroll calculation window.
       * --------------------------------------------------------
       */
      const joiningDate =
        employee.created_at
          ? moment(
              employee.created_at
            ).startOf('day')
          : null;


      const terminationDate =
        employee.termination_date
          ? moment(
              employee.termination_date
            ).endOf('day')
          : null;


      /**
       * ========================================================
       * PAYROLL WINDOW
       * ========================================================
       *
       * FIX:
       *
       * Always calculate the selected month completely.
       *
       * Example:
       *
       * month = 8
       * year  = 2026
       *
       * Payroll:
       *
       * 2026-08-01 -> 2026-08-31
       *
       * NOT:
       *
       * employee joining date -> 2026-08-31
       *
       * This fixes the issue where employee 26 had:
       *
       * attendanceRecordsFound = 20
       * presentDays = 9
       *
       * because the old payroll window started on Aug 18.
       * ========================================================
       */
      const attendanceStartDate =
        startOfMonth.clone();


      const attendanceEndDate =
        endOfMonth.clone();


      /**
       * IMPORTANT FIX
       *
       * Use the COMPLETE selected month.
       */
      const payrollStartDate =
        startOfMonth.clone();


      const payrollEndDate =
        endOfMonth.clone();


      /**
       * ========================================================
       * ATTENDANCE
       * ========================================================
       *
       * Get ALL attendance records for selected month.
       *
       * Present:
       *   1
       *
       * Half Day:
       *   0.5
       *
       * check_out is NOT required.
       * ========================================================
       */
      const [attendanceRows] =
        await db.query(
          `
          SELECT
            date,
            status,
            check_in,
            check_out

          FROM attendance

          WHERE employee_id = ?

          AND date BETWEEN ? AND ?

          ORDER BY date ASC
          `,
          [
            employeeId,

            attendanceStartDate
              .format(
                'YYYY-MM-DD'
              ),

            attendanceEndDate
              .format(
                'YYYY-MM-DD'
              )
          ]
        );


      /**
       * ========================================================
       * ATTENDANCE MAP
       * ========================================================
       */
      const attendanceMap = {};


      attendanceRows.forEach(
        row => {

          const date =
            moment(row.date)
              .format(
                'YYYY-MM-DD'
              );


          if (
            row.status === 'Present'
          ) {

            attendanceMap[date] = 1;

          }

          else if (
            row.status === 'Half Day'
          ) {

            attendanceMap[date] = 0.5;

          }

        }
      );


      /**
       * ========================================================
       * LEAVES
       * ========================================================
       */
      const [leaveRows] =
        await db.query(
          `
          SELECT
            start_date,
            end_date,
            halfDay,
            leave_type

          FROM leave_requests

          WHERE employee_id = ?

          AND status = 'Approved'

          AND end_date >= ?

          AND start_date <= ?
          `,
          [
            employeeId,

            payrollStartDate
              .format(
                'YYYY-MM-DD'
              ),

            payrollEndDate
              .format(
                'YYYY-MM-DD'
              )
          ]
        );


      const leaveMap = {};

      let totalLeaveDays = 0;

      const rawLeaveDateSet =
        new Set();


      /**
       * --------------------------------------------------------
       * Build leave map
       * --------------------------------------------------------
       */
      leaveRows.forEach(
        leave => {

          const leaveStart =
            moment.max(
              moment(
                leave.start_date
              ).startOf('day'),

              payrollStartDate
                .clone()
                .startOf('day')
            );


          const leaveEnd =
            moment.min(
              moment(
                leave.end_date
              ).startOf('day'),

              payrollEndDate
                .clone()
                .startOf('day')
            );


          const isHalfDay =
            leave.halfDay === 'Half Day' ||
            Boolean(
              leave.halfDay
            );


          getDatesBetween(
            leaveStart,
            leaveEnd
          ).forEach(
            (
              dateStr,
              index
            ) => {

              rawLeaveDateSet.add(
                dateStr
              );


              const date =
                moment(dateStr);


              /**
               * Weekend is not leave.
               */
              if (
                [0, 6].includes(
                  date.day()
                )
              ) {

                return;

              }


              const value =
                isHalfDay &&
                index === 0

                  ? 0.5

                  : 1;


              leaveMap[dateStr] =
                Math.max(
                  leaveMap[dateStr] || 0,
                  value
                );

            }
          );

        }
      );


      /**
       * Total leave days.
       */
      totalLeaveDays =
        Object.values(
          leaveMap
        ).reduce(
          (
            sum,
            value
          ) =>
            sum +
            Number(
              value || 0
            ),
          0
        );


      /**
       * ========================================================
       * HOLIDAYS
       * ========================================================
       */
      const [holidayRows] =
        await db.query(
          `
          SELECT
            date

          FROM holidays

          WHERE date BETWEEN ? AND ?
          `,
          [
            payrollStartDate
              .format(
                'YYYY-MM-DD'
              ),

            payrollEndDate
              .format(
                'YYYY-MM-DD'
              )
          ]
        );


      const holidayDates =
        holidayRows.map(
          row =>
            moment(row.date)
              .format(
                'YYYY-MM-DD'
              )
        );


      const holidaySet =
        new Set(
          holidayDates
        );


      /**
       * ========================================================
       * PRESENT DAYS
       * ========================================================
       */
      let presentWeekdays = 0;

      let presentWeekends = 0;

      let halfDays = 0;


      /**
       * IMPORTANT:
       *
       * We no longer filter attendance using joiningDate.
       *
       * attendanceMap already contains attendance only from:
       *
       * startOfMonth -> endOfMonth
       *
       * Therefore ALL attendance records from the selected
       * month are counted.
       */
      Object.entries(
        attendanceMap
      ).forEach(
        (
          [
            dateStr,
            attendanceValue
          ]
        ) => {

          const date =
            moment(dateStr);


          /**
           * Attendance wins over leave.
           */
          if (
            leaveMap[dateStr] !==
            undefined
          ) {

            totalLeaveDays -=
              leaveMap[dateStr];

            delete leaveMap[dateStr];

            rawLeaveDateSet.delete(
              dateStr
            );

          }


          /**
           * ----------------------------------------------------
           * HALF DAY
           * ----------------------------------------------------
           */
          if (
            attendanceValue === 0.5
          ) {

            halfDays += 1;


            if (
              [0, 6].includes(
                date.day()
              )
            ) {

              presentWeekends +=
                0.5;

            }

            else {

              presentWeekdays +=
                0.5;

            }

          }


          /**
           * ----------------------------------------------------
           * FULL PRESENT
           * ----------------------------------------------------
           */
          else if (
            attendanceValue === 1
          ) {

            if (
              [0, 6].includes(
                date.day()
              )
            ) {

              presentWeekends += 1;

            }

            else {

              presentWeekdays += 1;

            }

          }

        }
      );


      totalLeaveDays =
        Math.max(
          0,
          totalLeaveDays
        );


      /**
       * Combined present days.
       */
      const presentDays =
        presentWeekdays +
        presentWeekends;


      /**
       * ========================================================
       * WEEKENDS
       * ========================================================
       */
      let weekendDays = 0;


      for (
        let date =
          payrollStartDate
            .clone()
            .startOf('day');

        date.isSameOrBefore(
          payrollEndDate,
          'day'
        );

        date.add(
          1,
          'day'
        )
      ) {

        if (
          [0, 6].includes(
            date.day()
          )
        ) {

          weekendDays += 1;

        }

      }


      /**
       * ========================================================
       * HOLIDAY COUNT
       * ========================================================
       */
      const holidayDays =
        holidayDates.filter(
          dateStr => {

            const date =
              moment(dateStr);


            return (
              date.isSameOrAfter(
                payrollStartDate,
                'day'
              ) &&

              date.isSameOrBefore(
                payrollEndDate,
                'day'
              )
            );

          }
        ).length;


      /**
       * ========================================================
       * PAID / UNPAID LEAVE
       * ========================================================
       *
       * 1 paid leave per month.
       */
      const paidLeaveQuota = 1;


      const paidLeaveDays =
        Math.min(
          totalLeaveDays,
          paidLeaveQuota
        );


      const unpaidLeaveDays =
        Math.max(
          0,
          totalLeaveDays -
          paidLeaveQuota
        );


      /**
       * ========================================================
       * TOTAL WORKING DAYS
       * ========================================================
       *
       * Weekdays excluding holidays.
       * ========================================================
       */
      let totalWorkingDays = 0;


      for (
        let date =
          payrollStartDate
            .clone()
            .startOf('day');

        date.isSameOrBefore(
          payrollEndDate,
          'day'
        );

        date.add(
          1,
          'day'
        )
      ) {

        const dateStr =
          date.format(
            'YYYY-MM-DD'
          );


        if (
          ![0, 6].includes(
            date.day()
          ) &&

          !holidaySet.has(
            dateStr
          )
        ) {

          totalWorkingDays += 1;

        }

      }


      /**
       * ========================================================
       * SANDWICH LEAVE
       * ========================================================
       */
      const {
        sandwichExtraDays
      } =
        computeDeductibleDays(
          [
            ...rawLeaveDateSet
          ],
          holidayDates
        );


      const sandwichDays =
        sandwichExtraDays;


      /**
       * ========================================================
       * ABSENT DAYS
       * ========================================================
       *
       * Weekday without attendance
       * and without leave.
       * ========================================================
       */
      const absentWeekdays =
        Math.max(
          0,

          totalWorkingDays -
          presentWeekdays -
          totalLeaveDays
        );


      const absentDays =
        absentWeekdays;


      /**
       * ========================================================
       * SALARY
       * ========================================================
       */
      const daysInMonth =
        endOfMonth.date();


      const dailySalary =
        salary /
        daysInMonth;


      /**
       * Deduction days.
       */
      const deductDays =
        unpaidLeaveDays +
        sandwichExtraDays +
        absentWeekdays;


      /**
       * Net paid days.
       *
       * Weekends and holidays are paid.
       */
      const netPaidDays =
        Math.max(
          0,

          daysInMonth -
          deductDays
        );


      const hasActivity =
        presentWeekdays > 0 ||
        presentWeekends > 0 ||
        totalLeaveDays > 0;


      const netSalary =
        hasActivity

          ? netPaidDays *
            dailySalary

          : 0;


      const leaveDeduction =
        deductDays *
        dailySalary;


      const halfDayDeduction =
        halfDays *
        0.5 *
        dailySalary;


      const presentDaySalary =
        presentDays *
        dailySalary;


      const paidDaySalary =
        (
          weekendDays +
          holidayDays +
          paidLeaveDays
        ) *
        dailySalary;


      const salaryDeduction =
        halfDayDeduction +
        leaveDeduction +
        absentDays *
        dailySalary;


      /**
       * ========================================================
       * ADDON AMOUNT
       * ========================================================
       */
      const [overrideRows] =
        await db.query(
          `
          SELECT
            addon_amount

          FROM salary_payslip

          WHERE employee_id = ?

          AND month = ?

          AND year = ?

          LIMIT 1
          `,
          [
            employeeId,
            month,
            year
          ]
        );


      const addonAmount =
        overrideRows.length

          ? Number(
              overrideRows[0]
                .addon_amount || 0
            )

          : 0;


      /**
       * ========================================================
       * RESPONSE
       * ========================================================
       */
      return res.json({

        employeeId:
          Number(employeeId),

        month,

        year,

        totalDays:
          daysInMonth,

        totalWorkingDays,

        salary:
          salary.toFixed(2),

        dailySalary:
          dailySalary.toFixed(2),

        presentDays,

        halfDays,

        weekendDays,

        holidayDays,

        totalLeaveDays,

        paidLeaveDays,

        unpaidLeaveDays,

        sandwichDays,

        absentDays,

        workingDays:
          netPaidDays,

        leaveDeduction:
          leaveDeduction.toFixed(2),

        halfDayDeduction:
          halfDayDeduction.toFixed(2),

        presentDaySalary:
          presentDaySalary.toFixed(2),

        paidDaySalary:
          paidDaySalary.toFixed(2),

        salaryDeduction:
          salaryDeduction.toFixed(2),

        netSalary:
          netSalary.toFixed(2),

        addonAmount:
          addonAmount.toFixed(2),

        incentiveAmount:
          incentiveAmount.toFixed(2),

        startDate:
          payrollStartDate.format(
            'YYYY-MM-DD'
          ),

        endDate:
          payrollEndDate.format(
            'YYYY-MM-DD'
          ),

        attendanceRecordsFound:
          attendanceRows.length,

        generatedAt:
          new Date()

      });

    }

    catch (err) {

      console.error(
        'Payroll error:',
        err
      );


      return res.status(500).json({
        error:
          'Internal server error'
      });

    }

  }
);


/**
 * ============================================================
 * GET ALL EMPLOYEES
 * ============================================================
 */
router.get(
  '/',
  async (req, res) => {

    try {

      const [results] =
        await db.query(
          'SELECT * FROM employees'
        );


      return res.status(200).json(
        results
      );

    }

    catch (err) {

      console.error(
        'Error fetching employees:',
        err
      );


      return res.status(500).json({

        error:
          'An error occurred while fetching employees'

      });

    }

  }
);


/**
 * ============================================================
 * EXPORT ROUTER
 * ============================================================
 */
module.exports = router;