import { Route } from '@angular/router';
import { AllprojectsComponent } from './all-projects/all-projects.component';

export const PROJECT_ROUTE: Route[] = [
  { path: 'all-projects', component: AllprojectsComponent },
  { path: '', redirectTo: 'all-projects', pathMatch: 'full' },
];
