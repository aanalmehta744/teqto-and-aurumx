import { Route } from '@angular/router';

import { AllInterviewsComponent } from './all-interviews/all-interviews.component';

export const INTERVIEW_ROUTE: Route[] = [
  {
    path: '',
    component: AllInterviewsComponent,
  },
];