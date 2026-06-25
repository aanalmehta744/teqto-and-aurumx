import { Route } from "@angular/router";
import { ChartWidgetComponent } from "./chart-widget/chart-widget.component";
import { DataWidgetComponent } from "./data-widget/data-widget.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const WIDGET_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "chart-widget",
    pathMatch: "full",
  },
  {
    path: "chart-widget",
    component: ChartWidgetComponent,
  },
  {
    path: "data-widget",
    component: DataWidgetComponent,
  },
  { path: '**', component: Page404Component },
];
