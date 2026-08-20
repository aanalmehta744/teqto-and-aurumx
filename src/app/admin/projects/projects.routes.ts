import { Route } from "@angular/router";
import { EstimatesComponent } from "./estimates/estimates.component";
import { ProjectDetailsComponent } from "./project-details/project-details.component";
import { Page404Component } from "../../authentication/page404/page404.component";
import { AddprojectsComponent } from "./add-project/add-project.component";
import { AllprojectsComponent } from "./all-projects/all-projects.component";
export const PROJECT_ROUTE: Route[] = [
  {
    path: "addProject",
    component: AddprojectsComponent,
  },
  {
    path: "allProjects",
    component: AllprojectsComponent,
  },
  {
    path: "estimates",
    component: EstimatesComponent,
  },
  {
    path: "projectDetails/:id",
    component: ProjectDetailsComponent,
  },
  { path: "**", component: Page404Component },
];
