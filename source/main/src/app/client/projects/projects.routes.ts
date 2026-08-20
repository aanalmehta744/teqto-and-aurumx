import { Route } from '@angular/router';
import { Page404Component } from 'app/authentication/page404/page404.component';
import { MyProjectsComponent } from './my-projects/my-projects.component';
import { ProjectDetailsComponent } from './project-details/project-details.component';

export const PROJECTS_ROUTE: Route[] = [
  {
    path: 'myProjects',
    component: MyProjectsComponent,
  },
  {
    path: 'projectDetails',
    component: ProjectDetailsComponent,
  },
  { path: '**', component: Page404Component },
];

