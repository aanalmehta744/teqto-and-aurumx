import { Route } from "@angular/router";
import { Timeline1Component } from "./timeline1/timeline1.component";
import { Timeline2Component } from "./timeline2/timeline2.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const TIMELINE_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "timeline1",
    pathMatch: "full",
  },
  {
    path: "timeline1",
    component: Timeline1Component,
  },
  {
    path: "timeline2",
    component: Timeline2Component,
  },
  { path: '**', component: Page404Component },
];
