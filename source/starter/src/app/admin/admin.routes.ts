import { Route } from '@angular/router';

export const ADMIN_ROUTE: Route[] = [
  {
    path: 'dashboard',
    loadChildren: () =>
      import('./dashboard/dashboard.routes').then((m) => m.ADMIN_DASHBOARD_ROUTE),
  },
  {
    path: 'leaves',
    loadChildren: () =>
      import('./leaves/leaves.routes').then((m) => m.LEAVE_ROUTE),
  },
  {
    path: 'projects',
    loadChildren: () =>
      import('./projects/projects.routes').then((m) => m.PROJECT_ROUTE),
  },
];
