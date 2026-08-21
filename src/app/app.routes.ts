import { Route } from '@angular/router';

import { MainLayoutComponent } from './layout/app-layout/main-layout/main-layout.component';
import { AuthGuard } from '@core/guard/auth.guard';
import { AuthLayoutComponent } from './layout/app-layout/auth-layout/auth-layout.component';
import { Page404Component } from './authentication/page404/page404.component';
import { Role } from '@core';
import { EmployeeProfileComponent } from './employee-profile/employee-profile.component';
import { ChatComponent } from './apps/chat/chat.component';

export const APP_ROUTE: Route[] = [

  // =====================================================
  // MAIN APPLICATION
  // =====================================================

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard],

    children: [

      {
        path: '',
        redirectTo: '/authentication/login',
        pathMatch: 'full'
      },


      // =================================================
      // ADMIN
      // =================================================

      {
        path: 'admin',

        canActivate: [AuthGuard],

        data: {
          role: Role.Admin
        },

        loadChildren: () =>
          import('./admin/admin.routes')
            .then((m) => m.ADMIN_ROUTE),
      },


      // =================================================
      // NORMAL EMPLOYEE / HR
      // =================================================

      {
        path: 'employee',

        canActivate: [AuthGuard],

        data: {
          role: Role.Employee
        },

        loadChildren: () =>
          import('./employee/employee.routes')
            .then((m) => m.EMPLOYEE_ROUTE),
      },


      // =================================================
      // BDE
      //
      // BDE is now:
      // role       = Employee
      // department = BDE
      // =================================================

      {
        path: 'client',

        canActivate: [AuthGuard],

        data: {
          role: Role.Employee,
          department: 'BDE'
        },

        loadChildren: () =>
          import('./client/client.routes')
            .then((m) => m.CLIENT_ROUTE),
      },


      // =================================================
      // BA
      //
      // BA is now:
      // role       = Employee
      // department = BA
      // =================================================

      {
        path: 'ba',

        canActivate: [AuthGuard],

        data: {
          role: Role.Employee,
          department: 'BA'
        },

        loadChildren: () =>
          import('./ba/ba.routes')
            .then((m) => m.BA_ROUTE),
      },


      // =================================================
      // CALENDAR
      // =================================================

      {
        path: 'calendar',

        loadChildren: () =>
          import('./calendar/calendar.routes')
            .then((m) => m.CALENDAR_ROUTE),
      },


      // =================================================
      // TASK
      // =================================================

      {
        path: 'task',

        loadChildren: () =>
          import('./task/task.routes')
            .then((m) => m.TASK_ROUTE),
      },


      // =================================================
      // EMAIL
      // =================================================

      {
        path: 'email',

        loadChildren: () =>
          import('./email/email.routes')
            .then((m) => m.EMAIL_ROUTE),
      },


      // =================================================
      // APPS
      // =================================================

      {
        path: 'apps',

        loadChildren: () =>
          import('./apps/apps.routes')
            .then((m) => m.APPS_ROUTE),
      },


      // =================================================
      // EMPLOYEE PROFILE
      // =================================================

      {
        path: 'employee-profile',

        component: EmployeeProfileComponent,
      },

    ],
  },


  // =====================================================
  // CHAT WINDOW
  //
  // Opens without sidebar/header
  // =====================================================

  {
    path: 'chat-window',

    component: ChatComponent,

    canActivate: [AuthGuard],
  },


  // =====================================================
  // AUTHENTICATION
  // =====================================================

  {
    path: 'authentication',

    component: AuthLayoutComponent,

    loadChildren: () =>
      import('./authentication/auth.routes')
        .then((m) => m.AUTH_ROUTE),
  },


  // =====================================================
  // 404
  // =====================================================

  {
    path: '**',

    component: Page404Component
  }

];