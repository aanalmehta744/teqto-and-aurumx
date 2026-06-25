import { Route } from "@angular/router";
import { CandidatesComponent } from "./candidates/candidates.component";
import { JobsListComponent } from "./jobs-list/jobs-list.component";
import { ResumesComponent } from "./resumes/resumes.component";
import { ShortlistComponent } from "./shortlist/shortlist.component";
import { Page404Component } from "app/authentication/page404/page404.component";
import { CandidateDetailsComponent } from "./candidates/dialogs/candidate-details/candidate-details.component";
export const JOBS_ROUTE: Route[] = [
  {
    path: "jobs-list",
    component: JobsListComponent,
  },
  {
    path: "resumes",
    component: ResumesComponent,
  },
  {
    path: "candidates",
    component: CandidatesComponent,
  },
  {
    path: "shortlist",
    component: ShortlistComponent,
  },
  {
    path: "candidateDetails/:id",
    component: CandidateDetailsComponent,
  },
  { path: "**", component: Page404Component },
];

