import { Route } from '@angular/router';
import { Page404Component } from '../authentication/page404/page404.component';
import { AttendancesComponent } from '../employee/attendance/attendance.component';
// import { EmployeeAttendanceComponent } from '../employee/attendance/employee-attendance/employee-attendance.component'; // REMOVED: BA should not see all-employee attendance
// import { TodayComponent } from '../employee/attendance/today/today.component'; // REMOVED: BA should not see today's all-employee attendance
import { EmployeeDailyUpdateComponent } from '../employee/employee-daily-update/employee-daily-update.component';
import { AllEmployeeDailyUpdateComponent } from '../employee/employee-daily-update/allemployee-daily-update/allemployee-daily-update.component';
import { AllTasksComponent } from '../employee/all-tasks/all-tasks.component';
import { MyLeavesComponent } from '../employee/my-leaves/my-leaves.component';
import { LeaveBalanceComponent } from '../employee/my-leaves/leave-balance/leave-balance.component';
// ADDED: Employee-style dashboard for BA (same as other employees see)
import { DashboardComponent } from '../employee/dashboard/dashboard.component';
// ADDED: Holiday component (view-only) for BA
import { AllHolidayComponent } from '../employee/holidays/all-holidays/all-holidays.component';

export const BA_ROUTE: Route[] = [
  // CHANGED: Was loading admin dashboard routes ('../admin/dashboard/dashboard.routes').
  // BA should see the same employee dashboard as other employees, not the admin dashboard.
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  // OLD (admin dashboard — commented out):
  // {
  //   path: 'dashboard',
  //   loadChildren: () =>
  //     import('../admin/dashboard/dashboard.routes').then((m) => m.ADMIN_DASHBOARD_ROUTE),
  // },
  {
    path: 'clients',
    loadChildren: () =>
      import('../admin/clients/clients.routes').then((m) => m.ADMIN_CLIENT_ROUTE),
  },
  {
    path: 'myleaves',
    component: MyLeavesComponent,
  },
  {
    path: 'myleaves/leave-balance',
    component: LeaveBalanceComponent,
  },
  {
    path: 'employees',
    loadChildren: () =>
      import('../admin/employees/employees.routes').then((m) => m.ADMIN_EMPLOYEE_ROUTE),
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('../admin/projects/projects.routes').then((m) => m.PROJECT_ROUTE),
  },
  {
    path: 'payroll',
    loadChildren: () =>
      import('../admin/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTE),
  },
  // BA can only see their own attendance records (AttendancesComponent filters by current user ID)
  {
    path: 'attendance',
    component: AttendancesComponent,
  },
  // REMOVED: BA should not have access to view all employees' attendance records
  // {
  //   path: 'attendance/employee-attendance',
  //   component: EmployeeAttendanceComponent,
  // },
  // {
  //   path: 'attendance/today',
  //   component: TodayComponent,
  // },
  // ADDED: View-only holiday list for BA
  {
    path: 'holidays',
    component: AllHolidayComponent,
  },
  {
    path: 'alltasks',
    component: AllTasksComponent,
  },
  {
    path: 'daily-update',
    component: EmployeeDailyUpdateComponent,
  },
  {
    path: 'employee-updates',
    component: AllEmployeeDailyUpdateComponent,
  },
  { path: '**', component: Page404Component },
];
