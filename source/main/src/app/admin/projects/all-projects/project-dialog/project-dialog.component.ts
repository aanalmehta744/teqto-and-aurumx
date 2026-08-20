import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormBuilder, Validators, UntypedFormGroup, FormsModule, ReactiveFormsModule } from '@angular/forms';

import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogContent, MatDialogClose } from '@angular/material/dialog';

import {
  Project,
  ProjectStatus,
  ProjectPriority,
  ProjectType,
} from '../core/project.model';
import { ProjectService } from '../core/project.service';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface DialogData {
  id: number;
  action: string;
  title: string;
  project: Project;
}

@Component({
    selector: 'app-project-dialog',
    templateUrl: './project-dialog.component.html',
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatDialogContent,
        FormsModule,
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatOptionModule,
        MatDatepickerModule,
        MatDialogClose,
        CommonModule,
    ],
})
export class ProjectDialogComponent implements OnInit {
  public projectForm: UntypedFormGroup;
  public dialogTitle: string;
  public statusChoices = Object.values(ProjectStatus);
  public priorityChoices = Object.values(ProjectPriority);
  public projectTypes = Object.values(ProjectType);
  public projects: Project[] = []; // Store fetched projects

  constructor(
    private formBuilder: UntypedFormBuilder,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public dialogRef: MatDialogRef<ProjectDialogComponent>,
    private snackBar: MatSnackBar,
    private projectService: ProjectService
  ) {
    this.dialogTitle = data.title;
    this.projectForm = this.createForm(data.project);
  }

  ngOnInit(): void {
    this.getAllProjects(); // Fetch projects when the dialog opens
  }

  createForm(project: Partial<Project>): UntypedFormGroup {
    return this.formBuilder.group({
      name: [project?.name || '', Validators.required],
      status: [project?.status || '', Validators.required],
      team_leader: [project?.team_leader || ''],
      deadline: [project?.deadline || '', Validators.required],
      priority: [project?.priority || '', Validators.required],
      open_task: [project?.open_task || 0],
      type: [project?.type || '', Validators.required],
      created: [project?.created || '', Validators.required],
      progress: [project?.progress || 0],
      description: [project?.description || '', Validators.required],
    });
  }

  getAllProjects(): void {
    this.projectService.getAllProjects().subscribe(
      (projects) => {
        this.projects = projects;
        console.log(this.projects);
      },
      (error) => {
        console.error('Error fetching projects:', error);
      }
    );
  }

  save(): void {
    if (!this.projectForm.valid) return;
    const projectData = this.projectForm.value;
    this.data.project
      ? this.projectService.updateProject(projectData)
      : this.projectService.createProject(projectData);
    this.snackBar.open(`Project ${this.data.project ? 'updated' : 'created'} successfully!`, '', { duration: 2000 });
    this.dialogRef.close();
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
