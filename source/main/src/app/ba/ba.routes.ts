import { Route } from '@angular/router';
import { Page404Component } from '../authentication/page404/page404.component';
import { AttendancesComponent } from '../employee/attendance/attendance.component';
import { EmployeeAttendanceComponent } from '../employee/attendance/employee-attendance/employee-attendance.component';
import { TodayComponent } from '../employee/attendance/today/today.component';
import { EmployeeDailyUpdateComponent } from '../employee/employee-daily-update/employee-daily-update.component';
import { AllTasksComponent } from '../employee/all-tasks/all-tasks.component';

export const BA_ROUTE: Route[] = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('../admin/dashboard/dashboard.routes').then((m) => m.ADMIN_DASHBOARD_ROUTE),
  },
  {
    path: 'clients',
    loadChildren: () =>
      import('../admin/clients/clients.routes').then((m) => m.ADMIN_CLIENT_ROUTE),
  },
  {
    path: 'leaves',
    loadChildren: () =>
      import('../admin/leaves/leaves.routes').then((m) => m.LEAVE_ROUTE),
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
  {
    path: 'attendance',
    component: AttendancesComponent,
  },
  {
    path: 'attendance/employee-attendance',
    component: EmployeeAttendanceComponent,
  },
  {
    path: 'attendance/today',
    component: TodayComponent,
  },
  {
    path: 'alltasks',
    component: AllTasksComponent,
  },
  {
    path: 'daily-update',
    component: EmployeeDailyUpdateComponent,
  },
  { path: '**', component: Page404Component },
];
