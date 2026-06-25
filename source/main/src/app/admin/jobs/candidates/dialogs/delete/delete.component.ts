import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { CandidatesService } from '../../candidates.service';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  title: string;
  email: string;
  full_name: string;
}

@Component({
  selector: 'app-delete:not(f)',
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
    public candidatesService: CandidatesService
  ) {
    console.log('Dialog Data:', data);
   }
  onNoClick(): void {
    this.dialogRef.close();
  }
  confirmDelete(): void {
    this.candidatesService.deleteCandidates(this.data.id).subscribe({
      next: () => {
        this.dialogRef.close(true); // Optional: signal deletion success to parent
      },
      error: (err) => {
        console.error('Error deleting candidate:', err);
      }
    });
  }

}
