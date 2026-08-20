import { Route } from "@angular/router";
import { SigninComponent } from "./signin/signin.component";
import { SignupComponent } from "./signup/signup.component";
import { ForgotPasswordComponent } from "./forgot-password/forgot-password.component";
import { LockedComponent } from "./locked/locked.component";
import { Page404Component } from "./page404/page404.component";
import { Page500Component } from "./page500/page500.component";
import { LoginComponent } from "./login/login.component";
import { ResetPasswordComponent } from "./reset-password/reset-password.component";
export const AUTH_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "login",
    pathMatch: "full",
  },
  {
    path: "signup",
    component: SignupComponent,
  },
  {
    path: "forgot-password",
    component: ForgotPasswordComponent,
  },
  {
    path: "locked",
    component: LockedComponent,
  },
  {
    path: "page404",
    component: Page404Component,
  },
  {
    path: "page500",
    component: Page500Component,
  },
  {
    path: "login",
    component: LoginComponent,
  },
  {
    path: "reset-password/:token",
    component: ResetPasswordComponent,
  },
];
