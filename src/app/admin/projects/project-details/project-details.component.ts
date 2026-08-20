import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProjectService } from '../all-projects/core/project.service';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
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
    CommonModule,
  ],
})
export class ProjectDetailsComponent {
  projectId: string | null = null;
  projectDetails: any;
  isLoading = true;
  tags: string[] = [];

  constructor(
    private route: ActivatedRoute,
    private projectService: ProjectService
  ) {
    this.projectId = this.route.snapshot.paramMap.get('id');
    if (this.projectId) {
      this.fetchProjectDetails(this.projectId);
    }
  }

  fetchProjectDetails(id: string): void {
    this.projectService.getProjectById(id).subscribe({
      next: (data) => {
        this.projectDetails = data;
        this.isLoading = false;
        this.tags = data.tags ? data.tags.split(',') : [];
        console.log('Project Details:', data);
      },
      error: (err) => {
        console.error('Failed to fetch project details:', err);
        this.isLoading = false;
      },
    });
  }
  
}
