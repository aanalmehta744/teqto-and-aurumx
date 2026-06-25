import { Route } from "@angular/router";
import { MaterialComponent } from "./material/material.component";
import { FontAwesomeComponent } from "./font-awesome/font-awesome.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const ICONS_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "material",
    pathMatch: "full",
  },
  {
    path: "material",
    component: MaterialComponent,
  },
  {
    path: "font-awesome",
    component: FontAwesomeComponent,
  },
  { path: '**', component: Page404Component },
];
