import { Page404Component } from '../authentication/page404/page404.component';
import { Route } from '@angular/router';
import { AllEmployeeDailyUpdateComponent } from '../employee/employee-daily-update/allemployee-daily-update/allemployee-daily-update.component';
import { DashboardComponent } from './dashboard/dashboard.component';
// ADDED: View-only holiday list for BDE
import { AllHolidayComponent } from '../employee/holidays/all-holidays/all-holidays.component';
// import { BillingComponent } from './billing/billing.component';
// import { SettingsComponent } from './settings/settings.component';
import { ChatComponent } from './chat/chat.component';
import { AttendancesComponent } from './attendance/attendance.component';
import { MyLeavesComponent } from './my-leaves/my-leaves.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { MyTeamsComponent } from './myteam/myteam.component';
import { EmployeeDailyUpdateComponent } from './employee-daily-update/employee-daily-update.component';
import { LeaveBalanceComponent } from './my-leaves/leave-balance/leave-balance.component';
import { AllTasksComponent } from '../employee/all-tasks/all-tasks.component';
// import { CallsComponent } from './calls/calls.component';
// import { MeetingsComponent } from './meetings/meetings.component';
import { DealsComponent } from './deals/deals.component';
import { PerformanceComponent } from './performance/performance.component';
import { MyTargetsComponent } from './my-targets/my-targets.component';
import { DailyNotesComponent } from './daily-notes/daily-notes.component';
export const CLIENT_ROUTE: Route[] = [
  {
    path: 'dashboard',
    component: DashboardComponent,
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('../admin/projects/projects.routes').then((m) => m.PROJECT_ROUTE),
  },
  {
    path: 'myprojects',
    component: MyProjectsComponent,
  },
  {
    path: 'alltasks',
    component: AllTasksComponent,
  },
  // {
  //   path: 'supports',
  //   loadChildren: () =>
  //     import('./supports/supports.routes').then((m) => m.CLIENT_SUPPORT_ROUTE),
  // },
  {
    path: 'clients',
    loadChildren: () =>
      import('./clients/clients.routes').then((m) => m.CLIENT_ROUTE),
  },
  {
    path: 'payroll',
    loadChildren: () =>
      import('./payroll/payroll.routes').then((m) => m.EMP_PAYROLL_ROUTE),
  },
  // {
  //   path: 'billing',
  //   component: BillingComponent,
  // },
  {
    path: 'chat',
    component: ChatComponent,
  },
  // {
  //   path: 'settings',
  //   component: SettingsComponent,
  // },
  {
    path: 'attendance',
    component: AttendancesComponent,
  },
  {
    path: 'myLeave',
    component: MyLeavesComponent,
  },
  {
    path: 'leave-balance',
    component: LeaveBalanceComponent,
  },
  {
    path: 'myteam',
    component: MyTeamsComponent,
  },
  {
    path: 'daily-update',
    component: EmployeeDailyUpdateComponent,
  },
  {
    path: 'employee-updates',
    component: AllEmployeeDailyUpdateComponent,
  },

  // { path: 'calls', component: CallsComponent },
  // { path: 'meetings', component: MeetingsComponent },
  { path: 'deals', component: DealsComponent },
  { path: 'performance', component: PerformanceComponent },
  { path: 'my-targets', component: MyTargetsComponent },
  { path: 'daily-notes', component: DailyNotesComponent },
  // ADDED: View-only holiday list for BDE
  { path: 'holidays', component: AllHolidayComponent },
  { path: '**', component: Page404Component },
];

