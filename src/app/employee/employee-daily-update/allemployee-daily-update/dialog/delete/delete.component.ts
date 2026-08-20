import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { EmployeeDailyUpdateService } from '../../allemployee-daily-update.service';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
export interface DialogData {
  id: number;
  title: string;
  update_date: string;
  projectTitle: string;
}

@Component({
  selector: 'app-delete:not(g)',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    CommonModule
  ],
})
export class DeleteDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public dailyUpdateService: EmployeeDailyUpdateService
  ) { }

  onNoClick(): void {
    this.dialogRef.close();
  }

  confirmDelete(): void {
    this.dailyUpdateService.deleteUpdate(this.data.id).subscribe({
      next: () => {
        // Optionally update any UI state here
        this.dialogRef.close(true); // Pass true to indicate successful deletion
      },
      error: (err) => {
        console.error('Delete failed', err);
        // You may want to show an error message here
      }
    });
  }
}
