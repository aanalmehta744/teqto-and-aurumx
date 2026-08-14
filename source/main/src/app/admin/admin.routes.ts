import { Route } from '@angular/router';
import { EmployeeDailyUpdateComponent } from './employee-daily-update/employee-daily-update.component';
import { LoginSettingsComponent } from './login-settings/login-settings.component';
import { AllTasksComponent } from '../employee/all-tasks/all-tasks.component';
export const ADMIN_ROUTE: Route[] = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.routes').then((m) => m.ADMIN_DASHBOARD_ROUTE),
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('./projects/projects.routes').then((m) => m.PROJECT_ROUTE),
  },
  {
    path: 'employees',
    loadChildren: () =>
      import('./employees/employees.routes').then((m) => m.ADMIN_EMPLOYEE_ROUTE),
  },
  {
    path: 'clients',
    loadChildren: () =>
      import('./clients/clients.routes').then((m) => m.ADMIN_CLIENT_ROUTE),
  },
  {
    path: 'leaves',
    loadChildren: () =>
      import('./leaves/leaves.routes').then((m) => m.LEAVE_ROUTE),
  },
  {
    path: 'accounts',
    loadChildren: () =>
      import('./accounts/accounts.routes').then((m) => m.ACCOUNT_ROUTE),
  },
  {
    path: 'holidays',
    loadChildren: () =>
      import('./holidays/holidays.routes').then((m) => m.HOLIDAY_ROUTE),
  },
  {
    path: 'attendance',
    loadChildren: () =>
      import('./attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTE),
  },
  {
    path: 'payroll',
    loadChildren: () =>
      import('./payroll/payroll.routes').then((m) => m.PAYROLL_ROUTE),
  },
  // {
  //   path: 'leads',
  //   loadChildren: () =>
  //     import('./leads/leads.routes').then((m) => m.LEADS_ROUTE),
  // },
 
  // {
  //   path: 'reports',
  //   loadChildren: () =>
  //     import('./reports/reports.routes').then((m) => m.REPORT_ROUTE),
  // },
  {
    path: 'daily-update',
    component: EmployeeDailyUpdateComponent,
  },
  {
    path: 'kpi',
    loadChildren: () => import('./kpi/kpi.routes').then((m) => m.KPI_ROUTE),
  },
  {
    path: 'login-settings',
    component: LoginSettingsComponent,
  },
  {
    path: 'alltasks',
    component: AllTasksComponent,
  },
];

