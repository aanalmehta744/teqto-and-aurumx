import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
} from '@angular/forms';
import { formatDate, DatePipe } from '@angular/common';
import { AttendancesService } from '../attendance.service';
import { Attendances } from '../attendance.model';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
export interface DialogData {
  id: number;
  action: string;
  attendances: Attendances;
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
        MatTooltipModule,
        DatePipe,
        CommonModule
    ],
})
export class FormComponent {
  action: string;
  dialogTitle?: string;
  isDetails = false;
  attendancesForm?: UntypedFormGroup;
  attendances!: Attendances;
  constructor(
    public dialogRef: MatDialogRef<FormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public attendancesService: AttendancesService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'details') {
      this.attendances = data.attendances;
      this.isDetails = true;
    }
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
      ? 'Not a valid email'
      : '';
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.attendances.id],
      date: [
        formatDate(this.attendances.date, 'yyyy-MM-dd, HH:mm', 'en'),
        [Validators.required],
      ],
      check_in: [this.attendances.check_in],
      break: [this.attendances.break],
      check_out: [this.attendances.check_out],
      hours: [this.attendances.hours],
      status: [this.attendances.status],
      details: [this.attendances.details],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.attendancesService.addAttendances(this.attendancesForm?.getRawValue());
  }
}
