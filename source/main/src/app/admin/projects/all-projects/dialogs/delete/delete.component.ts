import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { ProjectService } from '../../core/project.service';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';

export interface DialogData {
  id: number;
  projectTitle: string;
  status: string;
  mobile: string;
}

@Component({
    selector: 'app-delete-dialog',
    templateUrl: './delete.component.html',
    styleUrls: ['./delete.component.scss'],
    standalone: true,
    imports: [
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButtonModule,
        MatDialogClose,
    ],
})
export class DeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public projectService: ProjectService
  ) {}

  onNoClick(): void {
    this.dialogRef.close(); // Close dialog without deleting
  }

  confirmDelete(): void {
    this.projectService.deleteProject(this.data.id).subscribe(() => {
      console.log(`Deleted project with ID: ${this.data.id}`);
      this.dialogRef.close(true); // Close and return 'true' to indicate success
    });
  }
}
