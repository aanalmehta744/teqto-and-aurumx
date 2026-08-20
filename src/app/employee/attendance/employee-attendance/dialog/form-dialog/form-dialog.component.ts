import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule, formatDate } from '@angular/common';
import { TodayService } from 'app/admin/attendance/today/today.service';

export interface DialogData {
  id?: number;
  action: string;
  attendance?: any; // pass record when editing
}

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatNativeDateModule,
  ],
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  attendanceForm: UntypedFormGroup;

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: UntypedFormBuilder,
    private todayService: TodayService
  ) {
    this.action = data?.action ?? 'add';
    this.dialogTitle = this.action === 'edit' ? 'Edit Attendance' : 'New Attendance';

    const a = data?.attendance || {};
    console.log("Edit record", data);

    // convert check_in / check_out ISO → "HH:mm" for <input type="time">
    const formatTime = (dateStr: string | undefined | null): string => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      return d.toTimeString().split(':').slice(0, 2).join(':'); // "HH:mm"
    };

    // convert date ISO → Date object for datepicker
    const parseDate = (dateStr: string | undefined | null): Date | null => {
      return dateStr ? new Date(dateStr) : null;
    };

    // initialize the form
    this.attendanceForm = this.fb.group({
      employeeName: [a.employee_name || a.employeeName || '', Validators.required,],
      date: [parseDate(a.date), Validators.required],          // Date object
      checkIn: [formatTime(a.check_in || a.checkIn), Validators.required], // "HH:mm"
      checkOut: [formatTime(a.check_out || a.checkOut)],       // "HH:mm"
      break: [a.break || ''],
      status: [a.status || '', Validators.required],
    });
  }

  formControl = new UntypedFormControl('', [Validators.required]);

  onNoClick(): void {
    this.dialogRef.close();
  }

  submit(): void {
    this.confirmEdit();
  }

  public confirmEdit(): void {
    if (this.attendanceForm.invalid) {
      this.attendanceForm.markAllAsTouched();
      return;
    }

    const formValue = this.attendanceForm.value;

    // Extract id & convert to number
    const id = parseInt(this.data.attendance?.id); // Convert string to number
    const date: string = this.formatDateForDB(formValue.date); // guaranteed string
    formValue.date = date;

    console.log("Submit value", formValue);
    console.log("ID as number:", id, "Type:", typeof id);

    // Validate that ID is a valid number
    if (isNaN(id)) {
      console.error("Invalid ID:", this.data.attendance?.id);
      return;
    }

    this.todayService.updateAttendance(id, date, formValue).subscribe({
      next: (res) => {
        console.log("Attendance updated:", res);
        this.dialogRef.close({ success: true, data: formValue });
      },
      error: (err) => {
        console.error("Error updating attendance:", err);
      }
    });
  }

  private formatDateForDB(date: any): string {
    // Always return string; form has Validators.required
    return formatDate(date, 'yyyy-MM-dd', 'en');
  }
}
