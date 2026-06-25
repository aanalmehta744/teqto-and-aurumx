import { Route } from "@angular/router";
import { MainComponent } from "./main/main.component";
import { Dashboard2Component } from "./dashboard2/dashboard2.component";
import { Page404Component } from "../../authentication/page404/page404.component";
export const ADMIN_DASHBOARD_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "main",
    pathMatch: "full",
  },
  {
    path: "main",
    component: MainComponent,
  },
  {
    path: "dashboard2",
    component: Dashboard2Component,
  },
  { path: "**", component: Page404Component },
];
