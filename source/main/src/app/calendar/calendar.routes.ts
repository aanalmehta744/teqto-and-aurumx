import { Route } from "@angular/router";
import { CalendarComponent } from "./calendar.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const CALENDAR_ROUTE: Route[] = [
  {
    path: "",
    component: CalendarComponent,
  },
  { path: '**', component: Page404Component },
];

