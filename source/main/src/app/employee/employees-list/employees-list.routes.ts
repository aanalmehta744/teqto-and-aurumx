import { Route } from "@angular/router";
import { AddEmployeeComponent } from "./add-employee/add-employee.component";
import { Page404Component } from "../../authentication/page404/page404.component";
import { AllemployeesComponent } from "./allEmployees/allemployees.component";
import { EditEmployeeComponent } from "./edit-employee/edit-employee.component";
import { EmployeeProfileComponent } from "./employee-profile/employee-profile.component";
import { BdeEmployeeComponent } from "./bde-employee/bde-employee.component";
export const EMPLOYEE_list_ROUTE: Route[] = [
  {
    path: "allEmployees",
    component: AllemployeesComponent,
  },
  {
    path: "add-employee",
    component: AddEmployeeComponent,
  },
  {
    path: "edit-employee",
    component: EditEmployeeComponent,
  },
  {
    path: "employee-profile/:id",
    component: EmployeeProfileComponent,
  },
  {
    path: "bde-employee",
    component: BdeEmployeeComponent,
  },
  { path: "**", component: Page404Component },
];
