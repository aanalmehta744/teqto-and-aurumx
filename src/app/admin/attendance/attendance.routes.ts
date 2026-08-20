import { Route } from "@angular/router";
import { TodayComponent } from './today/today.component';
import { EmployeeComponent } from './employee/employee.component';
import { Page404Component } from 'app/authentication/page404/page404.component';
import { AttendanceSheetComponent } from './attendance-sheet/attendance-sheet.component';
import { EmployeeAttendanceComponent } from "./employee-attendance/employee-attendance.component";
export const ATTENDANCE_ROUTE: Route[] = [
  {
    path: 'today',
    component: TodayComponent,
  },
  {
    path: 'employee',
    component: EmployeeComponent,
  },
  {
    path: 'attendance-sheet',
    component: AttendanceSheetComponent,
  },
  {
    path: 'employee-attendance',
    component: EmployeeAttendanceComponent,
  },
  { path: '**', component: Page404Component },
];

