import { Route } from '@angular/router';
import { BdeTargetsComponent } from './bde-targets/bde-targets.component';
import { BdeAnalyticsComponent } from './bde-analytics/bde-analytics.component';

export const KPI_ROUTE: Route[] = [
  { path: 'bde-targets', component: BdeTargetsComponent },
  { path: 'bde-analytics', component: BdeAnalyticsComponent },
  { path: '', redirectTo: 'bde-analytics', pathMatch: 'full' },
];
