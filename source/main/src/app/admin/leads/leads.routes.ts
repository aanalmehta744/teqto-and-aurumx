import { Route } from "@angular/router";
import { LeadsComponent } from "./leads.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const LEADS_ROUTE: Route[] = [
  {
    path: "",
    component: LeadsComponent,
  },
  { path: "**", component: Page404Component },
];

