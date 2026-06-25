import { Route } from "@angular/router";
import { ContactsComponent } from "./contacts.component";
import { Page404Component } from "app/authentication/page404/page404.component";

export const CONTACT_ROUTE: Route[] = [
  {
    path: "",
    component: ContactsComponent,
  },
  { path: '**', component: Page404Component },
];

