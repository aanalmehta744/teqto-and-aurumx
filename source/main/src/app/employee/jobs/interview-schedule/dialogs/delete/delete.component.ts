import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { InterviewService } from '../../interview.service';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
export interface DialogData {
  id: number;
  interview_time: string;
  interview_date: string;
  candidate_name: string;
}

@Component({
  selector: 'app-delete',
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    CommonModule
  ],
  templateUrl: './delete.component.html',
  styleUrl: './delete.component.scss'
})
export class DeleteComponent {
  constructor(
    public dialogRef: MatDialogRef<DeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public interviewService: InterviewService
  ) { 
    console.log(data);
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.interviewService.deleteInterview(this.data.id).subscribe({
      next: () => {
        this.dialogRef.close(true); // Optional: signal deletion success to parent
      },
      error: (err) => {
        console.error('Error deleting candidate:', err);
      }
    });
  }
}
