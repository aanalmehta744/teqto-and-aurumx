import { MAT_DIALOG_DATA, MatDialogRef, MatDialogTitle, MatDialogContent, MatDialogActions, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { HolidayService } from '../../all-holidays.service';
import { MatButtonModule } from '@angular/material/button';
import { DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

export interface DialogData {
  id: number;
  hName: string;
  location: string;
  date: string;
}

@Component({
  selector: 'app-delete:not(d)',
  templateUrl: './delete.component.html',
  styleUrls: ['./delete.component.scss'],
  standalone: true,
  imports: [
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatButtonModule,
    MatDialogClose,
    CommonModule,
  ],
  providers: [DatePipe], // ✅ Correct way to inject DatePipe
})
export class DeleteDialogComponent {
  formattedDate: string;

  constructor(
    public dialogRef: MatDialogRef<DeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public holidayService: HolidayService,
    private datePipe: DatePipe // ✅ Inject DatePipe correctly
  ) {
    // Format the date using DatePipe
    this.formattedDate = this.datePipe.transform(this.data.date, 'MM/dd/yyyy') || '';
  }

  onNoClick(): void {
    this.dialogRef.close(false);
  }

  confirmDelete(): void {
    this.holidayService.deleteHoliday(this.data.id).subscribe(
      () => {
        console.log('Holiday has been deleted');
        this.dialogRef.close(true);
        window.location.reload();
      },
      (error) => {
        console.error('Error deleting holiday:', error);
      }
    ); // ✅ Corrected the misplaced closing brace
  }
}
