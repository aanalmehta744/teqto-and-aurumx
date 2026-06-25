import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MyLeaves } from '../../my-leaves.model';
import { MyLeavesService } from '../../my-leaves.service';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '@core';
import { CommonModule } from '@angular/common';
import { formatDate, DatePipe } from '@angular/common';
import Swal from 'sweetalert2';
import { HolidayService } from 'app/admin/holidays/all-holidays/all-holidays.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { ChangeDetectorRef } from '@angular/core';
import { MatCheckbox, MatCheckboxModule } from '@angular/material/checkbox';

export interface DialogData {
  id: number;
  action: string;
  myLeaves: MyLeaves;
}

@Component({
  selector: 'app-form-dialog:not(o)',
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
    MatSelectModule,
    MatOptionModule,
    MatDialogClose,
    CommonModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,

  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY'], // Acceptable input formats
        },
        display: {
          dateInput: 'YYYY-MM-DD', // Display format in input box
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
  ]
})
export class FormDialogComponent implements OnInit {
  action: string;
  dialogTitle: string;
  myLeavesForm: UntypedFormGroup;
  myLeaves: MyLeaves;
  leaveTypes: string[] = [];
  availablePaidLeave = 0;  // Replace this with actual value from backend or user object
  paidLeaveError = '';     // For showing error message
  holidays: string[] = [];  // Will hold 'YYYY-MM-DD' format dates
  sandwichWarning = false;
  holidayWarning = false;
  isLoading: boolean = false;
  minDate: Date = new Date();
  halfdayError = '';
  leaveOverlapError = '';
  leaveError = '';
  sandwicherror = '';
  isSubmitDisabled: boolean = false;
  isSandwichLeave = false;
  employeeId!: number;
  employeeLeaves: any[] = [];
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public myLeavesService: MyLeavesService,
    private fb: UntypedFormBuilder,
    private authService: AuthService,  // Inject your auth service here
    private holidayService: HolidayService,
    private cdr: ChangeDetectorRef
  ) {
    this.action = data.action;

    if (this.action === 'edit') {
      this.dialogTitle = 'Edit Leave Request';
      this.myLeaves = data.myLeaves;
    } else {
      this.dialogTitle = 'New Leave Request';
      const blankObject = {} as MyLeaves;
      this.myLeaves = new MyLeaves(blankObject);
      this.myLeaves.halfDay = '';
    }

    this.myLeavesForm = this.createContactForm();  // Initialize form
  }
  ngOnInit() {
    const user = this.authService.currentUserValue;
    if (!user) return;

    this.employeeId = user.id || 0;
    this.availablePaidLeave = user.leave_balance || 0;
    this.leaveTypes = user.gender === 'Female' ? ['Paid', 'Unpaid', 'Sick'] : ['Paid', 'Unpaid'];
    this.myLeavesForm.patchValue({ employee_id: this.employeeId });

    this.myLeavesForm.get('halfDay')?.valueChanges.subscribe((value) => {
      const leaveTypeControl = this.myLeavesForm.get('leave_type');

      if (value === 'Half Day') {
        leaveTypeControl?.setValue('Unpaid');
        leaveTypeControl?.disable();
      } else {
        leaveTypeControl?.enable();
      }
    });

    // Fetch holidays
    this.holidayService.getAllHolidays().subscribe({
      next: (res) => this.holidays = res.map((h: any) => formatDate(h.date, 'yyyy-MM-dd', 'en')),
      error: (err) => console.error(err)
    });
    this.myLeavesForm.get('leave_type')?.valueChanges.subscribe(() => {
      this.runAllChecks();
    });
    this.myLeavesForm.get('end_date')?.valueChanges.subscribe(() => {
      this.runAllChecks();
    });

    // Fetch employee leaves
    this.myLeavesService.getLeavesByEmployee(this.employeeId).subscribe({
      next: (leaves) => this.employeeLeaves = leaves,
      error: (err) => console.error(err)
    });


    // Guard flag to prevent infinite loops
    let ignoreValueChanges = false;

    // ✅ Single subscription for all checks
    this.myLeavesForm.valueChanges.subscribe(() => {
      this.sickAllChecks();
    });

    // Subscribe to form changes
    this.myLeavesForm.valueChanges.subscribe(() => {
      if (ignoreValueChanges) return;
      this.runAllChecks(() => { ignoreValueChanges = true; });
    });

    // Initial check for edit mode
    if (this.action === 'edit') this.runAllChecks();
  }
  sickAllChecks(setIgnoreFlagCallback?: () => void) {
    const form = this.myLeavesForm;
    const leaveTypeControl = form.get('leave_type');
    const start_date = form.get('start_date')?.value;
    const end_date = form.get('end_date')?.value;
    // 🔹 Sick leave validation (only one per month)
    console.log(leaveTypeControl?.value);
    if (leaveTypeControl?.value === 'Sick' && start_date) {
      const start = new Date(start_date);
      const month = start.getMonth();
      const year = start.getFullYear();

      const existingSickLeave = this.employeeLeaves.some(l => {
        if (l.leave_type !== 'Sick') return false;

        const leaveStart = new Date(l.start_date);
        return (
          leaveStart.getMonth() === month &&
          leaveStart.getFullYear() === year &&
          (!this.myLeaves.id || l.id !== this.myLeaves.id) // exclude self when editing
        );
      });

      if (existingSickLeave) {
        this.leaveError = 'You can apply for only one Sick leave per month.';
        leaveTypeControl.setErrors({ ...(leaveTypeControl.errors || {}), singleSick: true });
        this.isSubmitDisabled = true;
      } else {
        // Clear sick error if no conflict
        if (leaveTypeControl?.hasError('singleSick')) {
          const errors = { ...leaveTypeControl.errors };
          delete errors['singleSick'];
          leaveTypeControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        this.leaveError = '';
      }
    }
  }
  // ✅ Updated runAllChecks
  runAllChecks(setIgnoreFlagCallback?: () => void) {
    const form = this.myLeavesForm;
    const leaveTypeControl = form.get('leave_type');
    const start_date = form.get('start_date')?.value;
    const end_date = form.get('end_date')?.value;
    const halfDay = form.get('halfDay')?.value;
    console.log('halfDay value:', form.get('halfDay')?.value);
    this.myLeavesForm.valueChanges.subscribe(formValue => {
      const { leave_type, start_date, end_date, halfDay } = formValue;
      // ✅ HALF DAY VALIDATION — only restrict single-day when "Half Day" is specifically selected
      if (halfDay === 'Half Day' && start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (start.toDateString() !== end.toDateString()) {
          this.halfdayError = "Half Day leave can only be for a single day.";
          this.isSubmitDisabled = true;
        } else {
          this.halfdayError = '';
          this.isSubmitDisabled = false;
        }
      } else {
        this.halfdayError = '';
        // this.isSubmitDisabled = false;
      }
    });

    // Reset errors/warnings
    this.paidLeaveError = '';
    this.halfdayError = '';
    this.sandwichWarning = false;
    this.holidayWarning = false;
    this.sandwicherror = '';
    this.leaveOverlapError = '';
    this.isSubmitDisabled = false;

    if (!start_date || !end_date) return;

    const start = new Date(start_date);
    const end = new Date(end_date);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    // 🔹 Paid leave validation
    const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    if (leaveTypeControl?.value === 'Paid' && diffDays > this.availablePaidLeave) {
      this.paidLeaveError = `You only have ${this.availablePaidLeave} paid leave(s) left.`;
      leaveTypeControl?.setErrors({ ...(leaveTypeControl.errors || {}), noPaidLeave: true });
      this.isSubmitDisabled = true;
    } else if (leaveTypeControl?.hasError('noPaidLeave')) {
      const errors = { ...leaveTypeControl.errors };
      delete errors['noPaidLeave'];
      leaveTypeControl.setErrors(Object.keys(errors).length ? errors : null);
    }

    // 🔹 Holiday overlap
    this.holidayWarning = this.holidays.some(h => {
      const holiday = new Date(h);
      return holiday >= start && holiday <= end;
    });

    // 🔹 Sandwich rule
    const sandwichResult = this.applySandwichRule(start, end, this.employeeLeaves || []);
    if (sandwichResult.applies) {
      this.isSandwichLeave = true;
      this.sandwichWarning = true;
      this.sandwicherror = `⚠️ Your leave request falls under the <b>Sandwich Rule</b>.<br>
      <b>Reason:</b> ${sandwichResult.reason}.<br>
      Weekends and holidays between leave days are counted as leave.`;
      form.get('sandwich_confirm')?.setValidators([Validators.requiredTrue]);
    } else {
      this.isSandwichLeave = false;
      form.get('sandwich_confirm')?.clearValidators();
      this.sandwicherror = '';
    }
    form.get('sandwich_confirm')?.updateValueAndValidity({ emitEvent: false });

    // 🔹 Leave overlap check (with backend)
    const leaveId = this.action === 'edit' ? form.get('id')?.value : null;
    const formattedStart = this.formatDateForDB(start);
    const formattedEnd = this.formatDateForDB(end);

    if (!formattedStart || !formattedEnd) return;

    this.myLeavesService.checkLeaveDateOverlap(this.employeeId, formattedStart, formattedEnd, leaveId)
      .subscribe({
        next: (res) => {
          // Prevent valueChanges recursion
          if (setIgnoreFlagCallback) setIgnoreFlagCallback();

          if (res.overlap) {
            this.leaveOverlapError = 'This employee already has an approved leave on selected dates.';
            this.isSubmitDisabled = true;

            form.setErrors({ overlap: true });
            form.get('start_date')?.setErrors({ overlap: true });
            form.get('end_date')?.setErrors({ overlap: true });
          } else {
            this.leaveOverlapError = '';
            form.setErrors(null);
            form.get('start_date')?.setErrors(null);
            form.get('end_date')?.setErrors(null);
          }
        },
        error: (err) => console.error('Error checking leave overlap:', err)
      });
    // 🔹 Sick leave validation (only one per month)
    console.log(leaveTypeControl?.value);
    if (leaveTypeControl?.value === 'Sick' && start_date) {
      const start = new Date(start_date);
      const month = start.getMonth();
      const year = start.getFullYear();

      const existingSickLeave = this.employeeLeaves.some(l => {
        if (l.leave_type !== 'Sick') return false;

        const leaveStart = new Date(l.start_date);
        return (
          leaveStart.getMonth() === month &&
          leaveStart.getFullYear() === year &&
          (!this.myLeaves.id || l.id !== this.myLeaves.id) // exclude self when editing
        );
      });

      if (existingSickLeave) {
        this.leaveError = 'You can apply for only one Sick leave per month.';
        leaveTypeControl.setErrors({ ...(leaveTypeControl.errors || {}), singleSick: true });
        this.isSubmitDisabled = true;
      } else {
        // Clear sick error if no conflict
        if (leaveTypeControl?.hasError('singleSick')) {
          const errors = { ...leaveTypeControl.errors };
          delete errors['singleSick'];
          leaveTypeControl.setErrors(Object.keys(errors).length ? errors : null);
        }
        this.leaveError = '';
      }
    }

  }


  checkForLeaveOverlap(): void {
    const employeeId = this.myLeavesForm.get('employee_id')?.value;
    const startDate = this.formatDateForDB(this.myLeavesForm.get('start_date')?.value);
    const endDate = this.formatDateForDB(this.myLeavesForm.get('end_date')?.value);
    const currentLeaveId = this.action === 'edit' ? this.myLeavesForm.get('id')?.value : null;

    if (employeeId && startDate && endDate) {
      this.myLeavesService.checkLeaveDateOverlap(employeeId, startDate, endDate, currentLeaveId).subscribe({
        next: (res) => {
          if (res.overlap) {
            console.log(res.overlap);
            this.leaveOverlapError = `This employee already has an approved leave on selected dates.`;
            this.isSubmitDisabled = true;
            this.myLeavesForm.setErrors({ overlap: true });
            this.myLeavesForm.get('start_date')?.setErrors({ overlap: true });
            this.myLeavesForm.get('end_date')?.setErrors({ overlap: true });
          } else {
            this.paidLeaveError = '';
            this.myLeavesForm.get('start_date')?.setErrors(null);
            this.myLeavesForm.get('end_date')?.setErrors(null);
          }
        },
        error: (err) => {
          console.error('Error checking leave date overlap:', err);
        }
      });
    }
  }
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
  createContactForm(): UntypedFormGroup {
    const user = this.authService.currentUserValue;
    return this.fb.group({
      id: [this.myLeaves.id],
      employee_id: [user ? user.id : null],
      halfDay: [this.myLeaves.halfDay],
      start_date: [
        this.myLeaves.start_date ? formatDate(this.myLeaves.start_date, 'yyyy-MM-dd', 'en') : '',
        Validators.required
      ],
      end_date: [
        this.myLeaves.end_date ? formatDate(this.myLeaves.end_date, 'yyyy-MM-dd', 'en') : '',
        Validators.required
      ],
      leave_type: [this.myLeaves.leave_type, Validators.required],
      reason: [this.myLeaves.reason, Validators.required],
      status: ['Pending'],
      sandwich_confirm: [false, this.isSandwichLeave ? Validators.requiredTrue : []],
    });
  }

  formControl = new UntypedFormControl('', [Validators.required]);

  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }
  checkSandwichRule() {
    const start_date = this.myLeavesForm.get('start_date')?.value;
    const end_date = this.myLeavesForm.get('end_date')?.value;

    if (!start_date || !end_date) {
      this.isSandwichLeave = false;
      this.myLeavesForm.get('sandwich_confirm')?.clearValidators();
      this.myLeavesForm.get('sandwich_confirm')?.updateValueAndValidity();
      return;
    }

    const sandwichResult = this.applySandwichRule(new Date(start_date), new Date(end_date));
    if (sandwichResult.applies) {
      this.isSandwichLeave = true;
      this.myLeavesForm.get('sandwich_confirm')?.setValidators([Validators.requiredTrue]);
      this.myLeavesForm.get('sandwich_confirm')?.updateValueAndValidity();
    } else {
      this.isSandwichLeave = false;
      this.myLeavesForm.get('sandwich_confirm')?.clearValidators();
      this.myLeavesForm.get('sandwich_confirm')?.updateValueAndValidity();
    }
  }

  submit() {
    // Handle submit logic
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
  applySandwichRule(start: Date, end: Date, employeeLeaves: any[] = []): { applies: boolean, reason?: string } {
    const format = (d: Date) => formatDate(d, 'yyyy-MM-dd', 'en');

    const appliedStart = new Date(start);
    const appliedEnd = new Date(end);

    const isWeekendOrHoliday = (d: Date) => {
      const day = d.getDay();
      const dateStr = format(d);
      return day === 0 || day === 6 || this.holidays.includes(dateStr);
    };

    const hasLeaveOn = (dateStr: string) =>
      employeeLeaves.some(l => {
        const leaveStart = this.formatDateForDB(l.start_date);
        const leaveEnd = this.formatDateForDB(l.end_date);
        return leaveStart && leaveEnd && leaveStart <= dateStr && leaveEnd >= dateStr;
      });

    // 🔹 Case 1: Leave directly on weekend/holiday
    if (isWeekendOrHoliday(appliedStart) || isWeekendOrHoliday(appliedEnd)) {
      return { applies: true, reason: "Leave includes a weekend/holiday directly." };
    }

    // 🔹 Case 2: Leave before weekend + applied after
    const prevDate = new Date(appliedStart);
    prevDate.setDate(prevDate.getDate() - 1);

    if (isWeekendOrHoliday(prevDate) && hasLeaveOn(format(new Date(appliedStart.getTime() - 3 * 86400000)))) {
      return { applies: true, reason: "Leave is connected through a weekend/holiday gap before." };
    }

    // 🔹 Case 3: Leave after weekend + applied before
    const nextDate = new Date(appliedEnd);
    nextDate.setDate(nextDate.getDate() + 1);

    if (isWeekendOrHoliday(nextDate) && hasLeaveOn(format(new Date(appliedEnd.getTime() + 3 * 86400000)))) {
      return { applies: true, reason: "Leave is connected through a weekend/holiday gap after." };
    }

    // 🔹 Case 4: Friday–Monday bridge
    const dayOfWeek = appliedStart.getDay();
    if (dayOfWeek === 1) { // Monday
      const friday = new Date(appliedStart);
      friday.setDate(friday.getDate() - 3);
      if (hasLeaveOn(format(friday))) {
        return { applies: true, reason: "Leave extends from Friday through Monday (weekend bridge)." };
      }
    }
    // 🔹 Case 5: Weekends/holidays inside applied range
    let current = new Date(appliedStart);
    while (current <= appliedEnd) {
      if (isWeekendOrHoliday(current)) {
        return {
          applies: true,
          reason:
            'Selected leave range includes weekends/holidays within the period.'
        };
      }
      current.setDate(current.getDate() + 1);
    }
    return { applies: false };
  }
  public confirmAdd(): void {
    if (this.myLeavesForm.valid) {
      this.isLoading = true;
      const rawValue = this.myLeavesForm.getRawValue();
      const start_date = rawValue.start_date ? formatDate(rawValue.start_date, 'yyyy-MM-dd', 'en') : '';
      const end_date = rawValue.end_date ? formatDate(rawValue.end_date, 'yyyy-MM-dd', 'en') : '';
      const leaveData = {
        ...rawValue,
        start_date: start_date,
        end_date: end_date
      };

      console.log("Sending cleaned data:", leaveData);

      if (this.action === 'edit') {
        // Update record
        this.myLeavesService.updateMyLeaves(leaveData).subscribe({
          next: (response) => {
            this.isLoading = true;

            Swal.fire({
              icon: 'success',
              title: 'Leave Updated',
              text: 'Your leave request has been successfully updated!',
              confirmButtonColor: '#3085d6'
            }).then(() => {
              this.dialogRef.close(leaveData);
              window.location.reload();
            });
          },
          error: (err) => {
            console.error("Error updating leave request:", err);
            this.isLoading = true;

            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Something went wrong while updating the leave.',
              confirmButtonColor: '#d33'
            });
          }
        });
      } else {
        // Add new record
        this.myLeavesService.addMyLeaves(leaveData).subscribe({
          next: (response) => {
            this.isLoading = false;

            Swal.fire({
              icon: 'success',
              title: 'Leave Requested',
              text: 'Your leave request has been submitted!',
              confirmButtonColor: '#3085d6'
            }).then(() => {
              this.dialogRef.close(leaveData);
              window.location.reload();
            });
          },
          error: (err) => {
            console.error("Error submitting leave request:", err);
            this.isLoading = false;
            Swal.fire({
              icon: 'error',
              title: 'Error',
              text: 'Something went wrong while submitting the leave.',
              confirmButtonColor: '#d33'
            });
          }
        });
      }
    } else {
      this.myLeavesForm.markAllAsTouched();
    }
  }
}
