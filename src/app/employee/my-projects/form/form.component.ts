import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { MyProjectsService } from '../my-projects.service';
import { MyProjects } from '../my-projects.model';
import { DatePipe } from '@angular/common';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';

export interface DialogData {
  id: number;
  action: string;
  myProjects: MyProjects;
}

@Component({
    selector: 'app-form',
    templateUrl: './form.component.html',
    styleUrls: ['./form.component.scss'],
    standalone: true,
    imports: [
        MatButtonModule,
        MatIconModule,
        MatDialogContent,
        MatCardModule,
        MatProgressBarModule,
        DatePipe,
        CommonModule,
    ],
})
export class FormComponent {
  action?: string;
  dialogTitle?: string;
  isDetails = false;
  myProjects: MyProjects;
  constructor(
    public dialogRef: MatDialogRef<FormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public myProjectsService: MyProjectsService
  ) {
    // Set the defaults
    this.myProjects = data.myProjects;
    this.isDetails = true;
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
