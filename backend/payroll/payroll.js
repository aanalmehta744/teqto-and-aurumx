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


      // const netSalary =
      //   hasActivity

      //     ? netPaidDays *
      //       dailySalary

      //     : 0;
      const netSalary =
  hasActivity
    ? Number(
        ((netPaidDays * salary) / daysInMonth).toFixed(2)
      )
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