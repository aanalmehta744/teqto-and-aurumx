import { Route } from '@angular/router';
import { Page404Component } from 'app/authentication/page404/page404.component';
import { TicketDetailsComponent } from './ticket-details/ticket-details.component';
import { TicketsComponent } from './tickets/tickets.component';

export const CLIENT_SUPPORT_ROUTE: Route[] = [
  {
    path: 'tickets',
    component: TicketsComponent,
  },
  {
    path: 'ticketDetails',
    component: TicketDetailsComponent,
  },
  { path: '**', component: Page404Component },
];

