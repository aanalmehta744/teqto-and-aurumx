import { Route } from "@angular/router";
import { LeaveReportComponent } from "./leave-report/leave-report.component";
import { ExpenseReportComponent } from "./expense/expense-report.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const REPORT_ROUTE: Route[] = [
  {
    path: "leave-report",
    component: LeaveReportComponent,
  },
  {
    path: "expense-report",
    component: ExpenseReportComponent,
  },
  { path: "**", component: Page404Component },
];

