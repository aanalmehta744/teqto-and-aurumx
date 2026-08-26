import { Page404Component } from '../authentication/page404/page404.component';
import { Route } from '@angular/router';
import { LoginSettingsComponent } from '../admin/login-settings/login-settings.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AttendancesComponent } from './attendance/attendance.component';
import { MyTeamsComponent } from './myteam/myteam.component';
// import { SettingsComponent } from './settings/settings.component';
import { MyLeavesComponent } from './my-leaves/my-leaves.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { MyTasksComponent } from './my-tasks/my-tasks.component';
import { ChatComponent } from './chat/chat.component';
import { LeaveBalanceComponent } from './my-leaves/leave-balance/leave-balance.component';
import { EmployeeDailyUpdateComponent } from './employee-daily-update/employee-daily-update.component';
import { AllEmployeeDailyUpdateComponent } from './employee-daily-update/allemployee-daily-update/allemployee-daily-update.component';
import { AllTasksComponent } from './all-tasks/all-tasks.component';
import { EmployeeLeavesComponent } from './my-leaves/employee-leaves/employee-leaves.component';
import { DepartmentsComponent } from '../departments/departments.component';
import { TodayComponent } from '../admin/attendance/today/today.component';
import { EmployeeComponent } from '../admin/attendance/employee/employee.component';
import { AttendanceSheetComponent } from '../admin/attendance/attendance-sheet/attendance-sheet.component';
import { EmployeeAttendanceComponent } from '../admin/attendance/employee-attendance/employee-attendance.component';
import { LeaveRequestsComponent } from '../admin/leaves/leave-requests/leave-requests.component';
import { AllInterviewsComponent } from '../admin/interviews/all-interviews/all-interviews.component';
import { MyInterviewsComponent } from './my-interviews/my-interviews.component';
export const EMPLOYEE_ROUTE: Route[] = [
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'attendance',
    loadChildren: () =>
      import('./attendance/attendance.routes').then((m) => m.EMPLOYEEATTENDANCE_ROUTE),
  },
  // {
  //   path: 'jobs',
  //   loadChildren: () =>
  //     import('./jobs/jobs.routes').then((m) => m.JOBS_ROUTE),
  // },
  // HR-only management routes using the same Admin components.
  // Access is protected by the parent Employee route; the sidebar exposes
  // these routes only to users with role=Employee and department=HR.
  {
    path: 'hr-attendance/today',
    component: TodayComponent,
  },
  {
    path: 'hr-attendance/employee',
    component: EmployeeComponent,
  },
  {
    path: 'hr-attendance/attendance-sheet',
    component: AttendanceSheetComponent,
  },
  {
    path: 'hr-attendance/employee-attendance',
    component: EmployeeAttendanceComponent,
  },
  {
    path: 'hr-leaves/leave-requests',
    component: LeaveRequestsComponent,
  },
  {
    path: 'hr-interviews',
    component: AllInterviewsComponent,
  },
  {
    path: 'my-interviews',
    component: MyInterviewsComponent,
  },
  {
    path: 'employee-list',
    loadChildren: () =>
      import('./employees-list/employees-list.routes').then((m) => m.EMPLOYEE_list_ROUTE),
  },
  {
    path: 'holidays',
    loadChildren: () =>
      import('./holidays/holidays.routes').then((m) => m.HOLIDAY_ROUTE),
  },
  {
    path: 'payroll',
    loadChildren: () =>
      import('./payroll/payroll.routes').then((m) => m.EMP_PAYROLL_ROUTE),
  },
  {
    path: 'myteam',
    component: MyTeamsComponent,
  },
  {
    path: 'myprojects',
    component: MyProjectsComponent,
  },
  {
    path: 'mytasks',
    component: MyTasksComponent,
  },
  {
    path: 'alltasks',
    component: AllTasksComponent,
  },
  { path: 'departments', component: DepartmentsComponent },
  {
    path: 'myleaves',
    component: MyLeavesComponent,
  },
  {
    path: 'chat',
    component: ChatComponent,
  },
  // {
  //   path: 'settings',
  //   component: SettingsComponent,
  // },
  {
    path: 'myleaves/leave-balance',
    component: LeaveBalanceComponent,
  },
  {
    path: 'myleaves/employee-leaves',
    component: EmployeeLeavesComponent,
  },
  {
    path: 'daily-update',
    component: EmployeeDailyUpdateComponent,
  },
  {
    path: 'daily-update/all-employees',
    component: AllEmployeeDailyUpdateComponent,
  },
  {
    path: 'login-settings',
    component: LoginSettingsComponent,
  },

  { path: '**', component: Page404Component },
];

