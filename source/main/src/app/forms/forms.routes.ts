import { Route } from "@angular/router";
import { FormExamplesComponent } from "./form-examples/form-examples.component";
import { FormValidationsComponent } from "./form-validations/form-validations.component";
import { WizardComponent } from "./wizard/wizard.component";
import { EditorsComponent } from "./editors/editors.component";
import { FormControlsComponent } from "./form-controls/form-controls.component";
import { AdvanceControlsComponent } from "./advance-controls/advance-controls.component";
import { Page404Component } from "app/authentication/page404/page404.component";
export const FORMS_ROUTE: Route[] = [
  {
    path: "",
    redirectTo: "form-controls",
    pathMatch: "full",
  },
  {
    path: "form-controls",
    component: FormControlsComponent,
  },
  {
    path: "advance-controls",
    component: AdvanceControlsComponent,
  },
  {
    path: "form-example",
    component: FormExamplesComponent,
  },
  {
    path: "form-validation",
    component: FormValidationsComponent,
  },
  {
    path: "wizard",
    component: WizardComponent,
  },
  {
    path: "editors",
    component: EditorsComponent,
  },
  { path: '**', component: Page404Component },
];
