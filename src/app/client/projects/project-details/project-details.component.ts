import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

@Component({
  selector: 'app-project-details',
  templateUrl: './project-details.component.html',
  styleUrls: ['./project-details.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatProgressBarModule,
    MatTabsModule,
    MatIconModule,
  ],
})
export class ProjectDetailsComponent {
  constructor() {
    //constructor
  }
}
