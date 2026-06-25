import { Route } from "@angular/router";
import { GoogleComponent } from "./google/google.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const MAPS_ROUTE: Route[] = [
  {
    path: "google",
    component: GoogleComponent,
  },
  { path: '**', component: Page404Component },
];
