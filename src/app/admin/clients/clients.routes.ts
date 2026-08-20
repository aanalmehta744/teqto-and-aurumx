import { Route } from "@angular/router";
import { AddClientComponent } from "./add-client/add-client.component";
import { EditClientComponent } from "./edit-client/edit-client.component";
import { Page404Component } from "../../authentication/page404/page404.component";
import { AllclientComponent } from "./all-clients/all-clients.component";
import { ClientDetailsComponent } from "./client-details/client-details.component";

export const ADMIN_CLIENT_ROUTE: Route[] = [
  {
    path: "all-clients",
    component: AllclientComponent,
  },
  {
    path: "add-client",
    component: AddClientComponent,
  },
  {
    path: "edit-client",
    component: EditClientComponent,
  },
  {
    path: "clientDetails/:id",
    component: ClientDetailsComponent,
  },
  {
    path: "**",
    component: Page404Component,
  },
];
