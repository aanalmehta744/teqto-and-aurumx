import { Route } from '@angular/router';
import { MainLayoutComponent } from './layout/app-layout/main-layout/main-layout.component';
import { AuthGuard } from '@core/guard/auth.guard';
import { AuthLayoutComponent } from './layout/app-layout/auth-layout/auth-layout.component';
import { Page404Component } from './authentication/page404/page404.component';
import { Role } from '@core';
import { EmployeeProfileComponent } from './employee-profile/employee-profile.component';
import { ChatComponent } from './apps/chat/chat.component';

export const APP_ROUTE: Route[] = [
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],
    children: [
      { path: '', redirectTo: '/authentication/login', pathMatch: 'full' },

      {
        path: 'admin',
        canActivate: [AuthGuard],
        data: {
          role: Role.Admin,
        },
        loadChildren: () =>
          import('./admin/admin.routes').then((m) => m.ADMIN_ROUTE),
      },
      {
        path: 'employee',
        canActivate: [AuthGuard],
        data: {
          role: Role.Employee,
        },
        loadChildren: () =>
          import('./employee/employee.routes').then((m) => m.EMPLOYEE_ROUTE),
      },
      {
        path: 'client',
        canActivate: [AuthGuard],
        data: {
          role: Role.BDE,
        },
        loadChildren: () =>
          import('./client/client.routes').then((m) => m.CLIENT_ROUTE),
      },
      {
        path: 'ba',
        canActivate: [AuthGuard],
        data: {
          role: Role.BA,
        },
        loadChildren: () =>
          import('./admin/admin.routes').then((m) => m.ADMIN_ROUTE),
      },
      {
        path: 'calendar',
        loadChildren: () =>
          import('./calendar/calendar.routes').then((m) => m.CALENDAR_ROUTE),
      },
      {
        path: 'task',
        loadChildren: () =>
          import('./task/task.routes').then((m) => m.TASK_ROUTE),
      },
      {
        path: 'contacts',
        loadChildren: () =>
          import('./contacts/contacts.routes').then((m) => m.CONTACT_ROUTE),
      },
      {
        path: 'email',
        loadChildren: () =>
          import('./email/email.routes').then((m) => m.EMAIL_ROUTE),
      },
      {
        path: 'apps',
        loadChildren: () =>
          import('./apps/apps.routes').then((m) => m.APPS_ROUTE),
      },
      {
        path: 'widget',
        loadChildren: () =>
          import('./widget/widget.routes').then((m) => m.WIDGET_ROUTE),
      },
      {
        path: 'ui',
        loadChildren: () => import('./ui/ui.routes').then((m) => m.UI_ROUTE),
      },
      {
        path: 'forms',
        loadChildren: () =>
          import('./forms/forms.routes').then((m) => m.FORMS_ROUTE),
      },
      {
        path: 'tables',
        loadChildren: () =>
          import('./tables/tables.routes').then((m) => m.TEBLES_ROUTE),
      },
      {
        path: 'charts',
        loadChildren: () =>
          import('./charts/charts.routes').then((m) => m.CHART_ROUTE),
      },
      {
        path: 'timeline',
        loadChildren: () =>
          import('./timeline/timeline.routes').then((m) => m.TIMELINE_ROUTE),
      },
      {
        path: 'icons',
        loadChildren: () =>
          import('./icons/icons.routes').then((m) => m.ICONS_ROUTE),
      },
      {
        path: 'extra-pages',
        loadChildren: () =>
          import('./extra-pages/extra-pages.routes').then(
            (m) => m.EXTRA_PAGES_ROUTE
          ),
      },
      {
        path: 'maps',
        loadChildren: () =>
          import('./maps/maps.routes').then((m) => m.MAPS_ROUTE),
      },
      {
        path: 'multilevel',
        loadChildren: () =>
          import('./multilevel/multilevel.routes').then(
            (m) => m.MULTILEVEL_ROUTE
          ),
      },
      {
        path: 'employee-profile',
        component: EmployeeProfileComponent,
      },
    ],
  },
  // Standalone chat window — no sidebar or header, opens in new tab
  {
    path: 'chat-window',
    component: ChatComponent,
    canActivate: [AuthGuard],
  },
  {
    path: 'authentication',
    component: AuthLayoutComponent,
    loadChildren: () =>
      import('./authentication/auth.routes').then((m) => m.AUTH_ROUTE),
  },

  { path: '**', component: Page404Component },
];
