import { Route } from "@angular/router";
import { EmployeeSalaryComponent } from "./employee-salary/employee-salary.component";
import { PayslipComponent } from "./payslip/payslip.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const PAYROLL_ROUTE: Route[] = [
  {
    path: "employee-salary",
    component: EmployeeSalaryComponent,
  },
  {
    path: "payslip/:id",  // Adding the dynamic ID segment
    component: PayslipComponent,
  },
  { path: "**", component: Page404Component },
];
