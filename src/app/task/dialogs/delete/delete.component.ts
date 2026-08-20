import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { TaskService } from 'app/task/task.service';
import { MatButtonModule } from '@angular/material/button';
import { Observable } from 'rxjs';

export interface DialogData {
  id: number;
  projectTitle: string;
  title: string;
  done: string;
  trainer_project_name: string;
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
export class DeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public taskService: TaskService
  ) {}

  onNoClick(): void {
    this.dialogRef.close(); // Close dialog without deleting
  }

  confirmDelete(): void {
    this.taskService.deleteTask(this.data.id).subscribe(() => {
      console.log(`Deleted project with ID: ${this.data.id}`);
      this.dialogRef.close(true); // Close and return 'true' to indicate success
    });
  }
}
