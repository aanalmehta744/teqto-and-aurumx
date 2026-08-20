import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { CalendarService } from '../../calendar.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Calendar } from '../../calendar.model';
import { OwlDateTimeModule, OwlNativeDateTimeModule } from '@danielmoncada/angular-datetime-picker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  calendar: Calendar;
}

@Component({
  selector: 'app-form-dialog:not(l)',
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
    MatSelectModule,
    MatOptionModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
  ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  calendarForm: UntypedFormGroup;
  calendar: Calendar;
  showDeleteBtn = false;

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private calendarService: CalendarService,
    private fb: UntypedFormBuilder
  ) {
    // Set defaults
    this.action = data.action;

    if (this.action === 'edit') {
      this.dialogTitle = data.calendar.title;
      this.calendar = data.calendar;
      this.showDeleteBtn = true;
      console.log("Edit recode", data);
    } else {
      this.dialogTitle = 'New Event';
      this.calendar = new Calendar({} as Calendar);
      this.showDeleteBtn = false;
    }

    this.calendarForm = this.createContactForm();
  }

  formControl = new UntypedFormControl('', [Validators.required]);

  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.calendar.id],
      title: [this.calendar.title, [Validators.required]],
      category: [this.calendar.category],
      // startDate: [this.calendar.startDate, [Validators.required]],
      // endDate: [this.calendar.endDate, [Validators.required]],
      startDate: [
        this.calendar.startDate ? new Date(this.calendar.startDate) : null,
        [Validators.required]
      ],
      endDate: [
        this.calendar.endDate ? new Date(this.calendar.endDate) : null,
        [Validators.required]
      ],
      details: [this.calendar.details],
    });
  }


  deleteEvent() {
    const event = this.calendarForm.getRawValue();
    this.calendarService.deleteCalendar(event).subscribe({
      next: () => this.dialogRef.close('delete'),
      error: (err) => console.error('Delete failed:', err),
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  // public confirmAdd(): void {
  //   const event = this.calendarForm.getRawValue();
  //   console.log("submit evente", event);
  //   this.calendarService.addUpdateCalendar(event).subscribe({
  //     next: () => this.dialogRef.close('submit'),
  //     error: (err) => console.error('Save failed:', err),
  //   });
  // }
  public addEvent(): void {
    const formValue = this.calendarForm.getRawValue();

    // get logged-in user
    const loggedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employee_id = loggedUser.id;

    // create event object with employee_id
    const event: Calendar = {
      ...formValue,
      employee_id: employee_id,
    } as Calendar;

    console.log("submit event", event);

    this.calendarService.addCalendar(event).subscribe({
      next: () => this.dialogRef.close('submit'),
      error: (err) => console.error('Add failed:', err),
    });
  }

  public editEvent(): void {
    const formValue = this.calendarForm.getRawValue();

    // get logged-in user
    const loggedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employee_id = loggedUser.id;

    // create event object with employee_id
    const event: Calendar = {
      ...formValue,
      employee_id: employee_id,
    } as Calendar;

    console.log("submit event", event);

    this.calendarService.editCalendar(event).subscribe({
      next: () => this.dialogRef.close('submit'),
      error: (err) => console.error('Edit failed:', err),
    });
  }

  public confirmAdd(): void {
    if (this.action === 'edit') {
      this.editEvent();
    } else {
      this.addEvent();
    }
  }

}
