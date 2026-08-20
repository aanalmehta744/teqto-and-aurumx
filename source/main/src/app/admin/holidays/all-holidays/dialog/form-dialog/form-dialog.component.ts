import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { HolidayService } from '../../all-holidays.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AllHoliday } from '../../all-holidays.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { formatDate } from '@angular/common';
import Swal from 'sweetalert2';

export interface DialogData {
  id: number;
  action: string;
  holiday: AllHoliday;
}

@Component({
  selector: 'app-form-dialog:not(d)',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatDialogClose,
  ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  holidayForm: UntypedFormGroup;
  holiday: AllHoliday;

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public holidayService: HolidayService,
    private fb: UntypedFormBuilder
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.holiday.hName;
      this.holiday = data.holiday;
    } else {
      this.dialogTitle = 'New Holiday';
      const blankObject = {} as AllHoliday;
      this.holiday = new AllHoliday(blankObject);
    }
    this.holidayForm = this.createHolidayForm();
  }

  createHolidayForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.holiday.id],
      hName: [this.holiday.hName, Validators.required],
      date: [this.holiday.date, Validators.required],
      details: [this.holiday.details],
    });
  }

  // Format the date before sending it to the API
  private formatDateValue(date: any): string {
    return formatDate(date, 'yyyy-MM-dd', 'en-US');
  }

  submit() {
    // Empty for now
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    if (this.holidayForm.valid) {
      let formData = this.holidayForm.getRawValue();

      // Ensure the date is formatted correctly before submission
      formData.date = this.formatDateValue(formData.date);

      if (this.action === 'edit') {
        this.holidayService.updateHoliday(this.holiday.id, formData).subscribe(
          () => {
            Swal.fire('Success!', 'Holiday updated successfully', 'success').then(() => {
              this.dialogRef.close(true);
              window.location.reload();
            });
          },
          (error) => {
            Swal.fire('Error!', 'Failed to update holiday', 'error');
            console.error('Error updating holiday:', error);
          }
        );
      } else {
        this.holidayService.addHoliday(formData).subscribe(
          () => {
            Swal.fire('Success!', 'Holiday added successfully', 'success').then(() => {
              this.dialogRef.close(true);
              window.location.reload();
            });
          },
          (error) => {
            Swal.fire('Error!', 'Failed to add holiday', 'error');
            console.error('Error adding holiday:', error);
          }
        );
      }
    }
  }
}
