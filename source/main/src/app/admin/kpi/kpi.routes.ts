import { Route } from '@angular/router';
import { KpiMasterComponent } from './kpi-master/kpi-master.component';
import { KpiTargetsComponent } from './kpi-targets/kpi-targets.component';
import { BdeTargetsComponent } from './bde-targets/bde-targets.component';

export const KPI_ROUTE: Route[] = [
  { path: 'kpi-master', component: KpiMasterComponent },
  { path: 'kpi-targets', component: KpiTargetsComponent },
  { path: 'bde-targets', component: BdeTargetsComponent },
  { path: '', redirectTo: 'bde-targets', pathMatch: 'full' },
];
