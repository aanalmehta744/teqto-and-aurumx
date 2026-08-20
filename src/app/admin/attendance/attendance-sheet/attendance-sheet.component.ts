import { Component, OnInit } from '@angular/core';
import {
  UntypedFormControl,
  UntypedFormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule } from '@angular/common';
import { TodayService } from '../today/today.service';
import { dA } from '@fullcalendar/core/internal-common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { HolidayService } from 'app/admin/holidays/all-holidays/all-holidays.service';
import { formatDate, DatePipe } from '@angular/common';
import { TableExportUtil, TableElement } from '@shared';
import { LeavesService } from 'app/admin/leaves/leave-requests/leaves.service';

@Component({
  selector: 'app-attendance-sheet',
  templateUrl: './attendance-sheet.component.html',
  styleUrls: ['./attendance-sheet.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
    CommonModule,
    MatTooltipModule,
  ],
  providers: [DatePipe]
})
export class AttendanceSheetComponent implements OnInit {
  attendanceForm: UntypedFormGroup;
  attendanceList: any[] = [];
  holidays: { date: string; title: string }[] = [];

  daysInMonth: { dayNumber: number, dayName: string }[] = [];  // List to hold days of the current month

  constructor(private attendanceService: TodayService, private holidayService: HolidayService, private leavesService: LeavesService, private datePipe: DatePipe) {
    this.attendanceForm = new UntypedFormGroup({
      fromDate: new UntypedFormControl(),
      toDate: new UntypedFormControl(),
    });
  }

  ngOnInit(): void {
    this.setDefaultDates();
    this.calculateDaysInMonth(new Date(), new Date()); // Initially use today's date
    this.searchAttendance();
    this.isHoliday();
  }

  // Set the default date range to the current month's first date and last date
  setDefaultDates(): void {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth(); // Current month (0 - 11)
    const currentYear = currentDate.getFullYear();

    // Get the first day of the current month
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    // Get the last day of the current month
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Set the default date range in the form controls
    this.attendanceForm.patchValue({
      fromDate: firstDayOfMonth,
      toDate: lastDayOfMonth,
    });
  }

  // Calculate the days of the current month along with the day of the week
  calculateDaysInMonth(from: Date, to: Date): void {
    const fromDate = new Date(from);
    const toDate = new Date(to);

    this.daysInMonth = [];

    for (
      let date = new Date(fromDate);
      date <= toDate;
      date.setDate(date.getDate() + 1)
    ) {
      this.daysInMonth.push({
        dayNumber: date.getDate(),
        dayName: date.toLocaleString('en-US', { weekday: 'short' }),
      });
    }
  }
  searchAttendance(): void {
    let from = this.attendanceForm.value.fromDate;
    let to = this.attendanceForm.value.toDate;

    from = from instanceof Date ? from : new Date(from);
    to = to instanceof Date ? to : new Date(to);
    this.attendanceForm.patchValue({ fromDate: from, toDate: to });

    this.calculateDaysInMonth(from, to);

    this.attendanceService.getAttendancedateRange(
      this.formatDate(from),
      this.formatDate(to)
    ).subscribe({
      next: (attendanceData: any[]) => {
        // Remove admin records
        const filteredAttendance = attendanceData.filter((record: any) => record.role?.toLowerCase() !== 'admin');

        // Prepare grouped attendance
        const grouped = filteredAttendance.reduce((acc: any, record: any) => {
          const day = new Date(record.date).getDate();
          let emp = acc.find((e: any) => e.employee_id === record.employee_id);

          if (!emp) {
            emp = { employee_id: record.employee_id, employee_name: record.employee_name, attendance: {} };
            acc.push(emp);
          }

          emp.attendance[day.toString()] = {
            status: record.status === 'Present' ? 'P' :
              record.status === 'Half Day' ? 'HD' : 'A',
            checkIn: record.check_in,
            checkOut: record.check_out
          };
          return acc;
        }, []);

        // Now fetch leave data
        this.leavesService.getAllLeaves(); // assuming this populates dataChange observable

        this.leavesService.dataChange.subscribe((leaves: any[]) => {
          // Filter leaves in the current date range
          const filteredLeaves = leaves.filter(leave => {
            const leaveStart = new Date(leave.start_date);
            const leaveEnd = new Date(leave.end_date);
            return leaveEnd >= from && leaveStart <= to; // check overlap
          });

          filteredLeaves.forEach(leave => {
            let emp = grouped.find((e: any) => e.employee_id === leave.employee_id);
            if (!emp) {
              emp = { employee_id: leave.employee_id, employee_name: leave.employee_name, attendance: {} };
              grouped.push(emp);
            }

            // Loop through each day of the leave
            const start = new Date(leave.start_date);
            const end = new Date(leave.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
              const day = d.getDate();
              emp.attendance[day.toString()] = {
                status: 'A', // Show as Absent in table
                leaveType: leave.leave_type // Store leave type (e.g., Sick, Casual)
              };
            }

          });

          this.attendanceList = grouped;
        });
      },
      error: (err) => {
        console.error('Error loading attendance data', err);
      }
    });
  }


  // Helper method to format the date into 'yyyy-MM-dd'
  formatDate(date: Date): string {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0'); // Month is 0-indexed
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  isWeekend(dayNumber: number): boolean {
    const from = this.attendanceForm.value.fromDate;
    if (!from) return false;

    const year = new Date(from).getFullYear();
    const month = new Date(from).getMonth();

    const date = new Date(year, month, dayNumber); // Use actual day number
    const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday
    return dayOfWeek === 0 || dayOfWeek === 6;
  }
  isHoliday() {
    // Fetch holidays
    this.holidayService.getAllHolidays().subscribe({
      next: (response) => {
        this.holidays = response.map((holiday: any) => ({
          date: formatDate(holiday.date, 'yyyy-MM-dd', 'en'),
          title: holiday.hName
        }));
        console.log('Holiday List:', this.holidays);
      },
      error: (err) => {
        console.error('Error fetching holiday list:', err);
      }
    });
  }
  getAttendanceTooltip(employee: any, dayNumber: number): string {
    if (this.isWeekend(dayNumber)) return 'Weekend';

    const holiday = this.getHolidayTitle(dayNumber);
    if (holiday) return holiday;

    const att = employee.attendance?.[dayNumber];
    if (!att) return '';

    const checkIn = att.checkIn ? this.datePipe.transform(att.checkIn, 'shortTime') : 'N/A';
    const checkOut = att.checkOut ? this.datePipe.transform(att.checkOut, 'shortTime') : 'N/A';

    switch (att.status) {
      case 'P':
        return `Present | Punch-in: ${checkIn} | Punch-out: ${checkOut}`;
      case 'HD':
        return `Half Day | Punch-in: ${checkIn} | Punch-out: ${checkOut}`;
      case 'HOL':
        return 'Holiday';
      case 'A':
        return att.leaveType ? `Leave (${att.leaveType})` : 'Absent';
      // case 'A':
      //   return 'Absent';
      default:
        return '';
    }
  }
  getHolidayTitle(dayNumber: number): string | null {
    const from = this.attendanceForm.value.fromDate;
    const year = new Date(from).getFullYear();
    const month = new Date(from).getMonth();
    const date = new Date(year, month, dayNumber);
    const formatted = formatDate(date, 'yyyy-MM-dd', 'en');

    const holiday = this.holidays.find(h => h.date === formatted);
    return holiday ? holiday.title : null;
  }

  exportExcel(): void {
    const from = this.attendanceForm.value.fromDate;
    const year = new Date(from).getFullYear();
    const month = new Date(from).getMonth();

    const exportData: Partial<TableElement>[] = this.attendanceList.map((emp) => {
      const row: Partial<TableElement> = {
        Name: emp.employee_name
      };

      this.daysInMonth.forEach((day) => {
        const fullDate = formatDate(new Date(year, month, day.dayNumber), 'yyyy-MM-dd', 'en');
        const key = `${fullDate} (${day.dayName})`;
        const dayData = emp.attendance?.[day.dayNumber];

        if (dayData) {
          const status = dayData.status ?? '';
          const checkIn = dayData.checkIn ? formatDate(dayData.checkIn, 'hh:mm a', 'en') : '--';
          const checkOut = dayData.checkOut ? formatDate(dayData.checkOut, 'hh:mm a', 'en') : '--';
          row[key] = `${status} | Punch-in: ${checkIn} | Punch-out: ${checkOut}`;
        } else {
          row[key] = '--';
        }
      });

      return row;
    });

    TableExportUtil.exportToExcel(exportData, 'AttendanceSheet');
  }


}
