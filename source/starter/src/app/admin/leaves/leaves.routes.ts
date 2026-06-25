import { Route } from '@angular/router';
import { LeaveRequestsComponent } from './leave-requests/leave-requests.component';

export const LEAVE_ROUTE: Route[] = [
  { path: 'leave-requests', component: LeaveRequestsComponent },
  { path: '', redirectTo: 'leave-requests', pathMatch: 'full' },
];
