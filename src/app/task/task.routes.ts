import { Route } from "@angular/router";
import { TaskComponent } from "./task.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const TASK_ROUTE: Route[] = [
  {
    path: "",
    component: TaskComponent,
  },
  { path: '**', component: Page404Component },
];
