import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Project, ProjectStatus } from '../core/project.model';
import { ProjectService } from '../core/project.service';
import { ProjectDialogComponent } from '../project-dialog/project-dialog.component';
import { Direction } from '@angular/cdk/bidi';
import { TruncatePipe, PluralPipe } from '../core/pipes';
import { DatePipe, KeyValuePipe } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { JsonPipe } from '@angular/common';


@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  standalone: true,
  imports: [
    CdkDropList,
    CdkDrag,
    MatProgressBarModule,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    DatePipe,
    KeyValuePipe,
    TruncatePipe,
    PluralPipe,
    JsonPipe,
  ],
})
export class BoardComponent implements OnInit {
  public lists: { [key: string]: Project[] } = {};

  constructor(
    private projectService: ProjectService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  public ngOnInit(): void {
    this.projectService.getAllProjects().subscribe((projects: any[]) => {
      // ✅ Map API data to match expected properties
      const formattedProjects = projects.map((project) => ({
        id: project.id,
        name: project.projectTitle,  // ✅ Fix name mapping
        status: this.mapStatus(project.status), // ✅ Convert status properly
        created: new Date(project.created_at), // ✅ Convert to Date
        priority: this.mapPriority(project.priority), // ✅ Convert priority
        description: project.description || 'No description available',
        type: project.department || 'General', // ✅ Use department as type
        progress: project.progress || 0,
        team_leader: project.team?.split(',')[0] || 'N/A', // ✅ Take first team member as leader
        deadline: project.deadLine ? new Date(project.deadLine) : undefined, // ✅ Fix null issue
        startDate: project.startDate ? new Date(project.startDate) : undefined, // ✅ Fix null issue
        endDate: project.endDate ? new Date(project.endDate) : undefined, // ✅ Fix null issue
        comments: project.comments || 'No comments',
        bugs: project.bugs || 0,
      }));
  
      this.lists = {
        NEWPROJECTS: formattedProjects.filter((p) => p.status === ProjectStatus.NEWPROJECTS),
        RUNNING: formattedProjects.filter((p) => p.status === ProjectStatus.RUNNING),
        ONHOLD: formattedProjects.filter((p) => p.status === ProjectStatus.ONHOLD),
        FINISHED: formattedProjects.filter((p) => p.status === ProjectStatus.FINISHED),
      };
  
      console.log("Mapped Projects:", this.lists);
    });
  }
  

  unsorted = (): number => {
    return 0;
  };
// Convert backend status to ProjectStatus enum
private mapStatus(status: string): ProjectStatus {
  switch (status.toLowerCase()) {
    case 'new': return ProjectStatus.NEWPROJECTS;
    case 'in progress': return ProjectStatus.RUNNING;
    case 'on hold': return ProjectStatus.ONHOLD;
    case 'completed': return ProjectStatus.FINISHED;
    default: return ProjectStatus.NEWPROJECTS;
  }
}

// Convert priority text to numeric value
private mapPriority(priority: string): number {
  switch (priority.toLowerCase()) {
    case 'high': return 1;
    case 'medium': return 0;
    case 'low': return -1;
    default: return 0; // Default to medium
  }
}

  public drop(event: CdkDragDrop<any>): void {
    if (event.previousContainer !== event.container) {
      const project = event.item.data;
      const newStatus = event.container.id as keyof typeof ProjectStatus;
      if (newStatus in ProjectStatus) {
        project.status = ProjectStatus[newStatus];
        this.projectService.updateProject(project);
      }
    }
  }

  public addProject(name: string, status: string): void {
    if (!/\S/.test(name)) {
      return;
    }
    const newProject: Project = {
      id: 0, // Will be assigned inside `createProject`
      name,
      status: ProjectStatus[status as keyof typeof ProjectStatus],
      deadline: undefined, // ✅ Fixed: Use `undefined` instead of `null`
      priority: 1,
      type:"", // ✅ Fixed: Assign a default `type`
    };
    this.projectService.createProject(newProject);
  }
  
  

  public removeProject(project: Project): void {
    const snack = this.snackBar.open('Project deleted Successfully...!!!', 'Undo', {
      duration: 4000,
      verticalPosition: 'bottom',
      horizontalPosition: 'center',
      panelClass: 'snackbar-danger',
    });

    this.projectService.deleteProject(project.id);

    snack.afterDismissed().subscribe((info) => {
      if (info.dismissedByAction !== true) {
        this.projectService.deleteProject(project.id);
      }
    });
  }

  public newProjectDialog(): void {
    this.dialogOpen('Create new project', null);
  }

  public editProjectDialog(project: Project): void {
    this.dialogOpen('Edit project', project);
  }

  private dialogOpen(title: string, project: Project | null): void {
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    this.dialog.open(ProjectDialogComponent, {
      height: '75%',
      width: '55%',
      autoFocus: true,
      data: { title, project },
      direction: tempDirection,
    });
  }
}
