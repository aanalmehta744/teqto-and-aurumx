import { Route } from "@angular/router";
import { LeaveBalanceComponent } from "./leave-balance/leave-balance.component";
import { LeaveRequestsComponent } from "./leave-requests/leave-requests.component";
import { LeaveTypesComponent } from "./leave-types/leave-types.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const LEAVE_ROUTE: Route[] = [
  {
    path: "leave-requests",
    component: LeaveRequestsComponent,
  },
  {
    path: "leave-balance",
    component: LeaveBalanceComponent,
  },
  {
    path: "leave-types",
    component: LeaveTypesComponent,
  },
  { path: "**", component: Page404Component },
];

