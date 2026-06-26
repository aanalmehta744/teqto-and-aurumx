import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { LeavesService } from '../leaves.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Leaves } from '../leaves.model';
import { formatDate, DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { EmployeesService } from 'app/admin/employees/allEmployees/employees.service';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { HolidayService } from 'app/admin/holidays/all-holidays/all-holidays.service';
import { ChangeDetectorRef } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectChange } from '@angular/material/select';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { MatCheckboxModule } from '@angular/material/checkbox';
export interface DialogData {
  id: number;
  action: string;
  leaves: Leaves;
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
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatOptionModule,
    MatDialogClose,
    MatCardModule,
    DatePipe,
    CommonModule,
    MatProgressSpinnerModule,
    MatCheckboxModule
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
export class FormComponent implements OnInit {
  action: string;
  dialogTitle?: string;
  isDetails = false;
  leavesForm!: UntypedFormGroup;
  leaves: Leaves;
  employees: any[] = []; // Array to store employyees
  holidays: string[] = [];
  availablePaidLeave = 0;  // Replace this with actual value from backend or user object
  employeeId!: number;
  paidLeaveError = '';
  leaveError = '';
  halfdayError = '';
  leaveOverlapError = '';
  isSubmitDisabled: boolean = false;
  sandwichWarning = false;
  sandwicherror = '';
  holidayWarning = false;
  isLoading: boolean = false;
  // minDate: Date = new Date();

  isSandwichLeave = false;

  constructor(
    public dialogRef: MatDialogRef<FormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public leavesService: LeavesService,
    private fb: UntypedFormBuilder,
    public employeesService: EmployeesService,
    private holidayService: HolidayService,
    private cdr: ChangeDetectorRef
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.isDetails = false;
      this.dialogTitle = data.leaves.employee_name || 'Edit Leave';
      this.leaves = data.leaves;
      this.leavesForm = this.createContactForm();
    } else if (this.action === 'details') {
      this.leaves = data.leaves;
      this.isDetails = true;
    } else {
      this.isDetails = false;
      this.dialogTitle = 'New Leaves';
      const blankObject = {} as Leaves;
      this.leaves = new Leaves(blankObject);
      this.leavesForm = this.createContactForm();
    }
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('type')
        ? 'Not a valid type'
        : '';
  }
  ngOnInit() {
    this.getEmployees(); // Load employee list

    // Fetch holidays
    this.holidayService.getAllHolidays().subscribe({
      next: (response) => {
        this.holidays = response.map((holiday: any) =>
          formatDate(holiday.date, 'yyyy-MM-dd', 'en')
        );
        console.log('Holiday List:', this.holidays);
      },
      error: (err) => {
        console.error('Error fetching holiday list:', err);
      }
    });
    // this.checkForLeaveOverlap();
    // //  Leave Overlap Check Subscriptions — correct placement
    this.leavesForm.get('start_date')?.valueChanges.subscribe(() => this.checkForLeaveOverlap());
    this.leavesForm.get('end_date')?.valueChanges.subscribe(() => this.checkForLeaveOverlap());
    this.leavesForm.get('employee_id')?.valueChanges.subscribe(() => this.checkForLeaveOverlap());

    // Handle employee selection
    this.leavesForm.get('employee_id')?.valueChanges.subscribe(id => {
      const selectedEmployee = this.employees.find(emp => emp.id === id);
      if (selectedEmployee) {
        this.availablePaidLeave = selectedEmployee.leave_balance || 0;
        this.employeeId = selectedEmployee.id || 0;
        console.log("availablePaidLeave", this.availablePaidLeave);
      } else {
        this.availablePaidLeave = 0;
      }
    });

    // General form changes: validation, sandwich rule, etc.
    this.leavesForm.valueChanges.subscribe(formValue => {
      const { leave_type, start_date, end_date, halfDay } = formValue;

      // Reset
      this.paidLeaveError = '';
      this.leaveError = '';
      this.halfdayError = '';
      this.sandwichWarning = false;
      this.holidayWarning = false;

      const leaveTypeControl = this.leavesForm.get('leave_type');
      leaveTypeControl?.setErrors(null);
      leaveTypeControl?.updateValueAndValidity({ onlySelf: true, emitEvent: false });

      // ✅ HALF DAY VALIDATION
      if (halfDay && start_date && end_date) {
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

      // ✅ PAID LEAVE VALIDATION
      if (leave_type === 'Paid' && start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - start.getTime();
        const daysRequested = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;

        console.log(this.availablePaidLeave, " ", daysRequested);
        if (daysRequested > this.availablePaidLeave) {
          this.leaveError = `You only have ${this.availablePaidLeave} paid leave(s) left.`;
          this.cdr.detectChanges();
          console.log(this.leaveError);
          leaveTypeControl?.setErrors({ ...(leaveTypeControl.errors || {}), noPaidLeave: true });
        } else {
          this.paidLeaveError = '';
          if (leaveTypeControl?.hasError('noPaidLeave')) {
            const errors = { ...leaveTypeControl.errors };
            delete errors['noPaidLeave'];
            leaveTypeControl.setErrors(Object.keys(errors).length ? errors : null);
            leaveTypeControl.updateValueAndValidity({ onlySelf: true, emitEvent: false });
          }
        }
      }

      // ✅ HOLIDAY + SANDWICH WARNINGS
      if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);

        const overlap = this.holidays.some(holiday => {
          const holidayDate = new Date(holiday);
          return holidayDate >= start && holidayDate <= end;
        });

        if (overlap) {
          this.holidayWarning = true;
          console.warn('⚠️ Your leave period overlaps with a holiday!');
        }

        const sandwichResult = this.applySandwichRule(start, end);
        if (sandwichResult.applies) {
          this.isSandwichLeave = sandwichResult.applies;
          this.sandwichWarning = sandwichResult.applies;

          if (sandwichResult.applies) {
            this.isSandwichLeave = true;
            this.sandwicherror = `  
            ⚠️ Your leave request falls under the <b>Sandwich Rule</b>.<br>
            <b>Reason:</b> ${sandwichResult.reason}.<br><br>
            According to company policy, weekends and holidays that fall 
            between two leave periods are also counted as leave days.
          `;
          }
        }


        this.leavesService.getLeavesByEmployee(this.employeeId).subscribe(existingLeaves => {
          const sandwichCheck = this.applySandwichRule(start, end, existingLeaves);

          if (sandwichCheck.applies) {
            this.isSandwichLeave = true;
            console.warn('⚠️ Sandwich rule applies for this leave!');
            this.sandwicherror = `
              ⚠️ Your leave request falls under the <b>Sandwich Rule</b>.<br>
              <b>Reason:</b> ${sandwichCheck.reason}.<br><br>
              According to company policy, weekends and holidays that fall 
              between two leave periods are also counted as leave days.
            `;
            // this.isSubmitDisabled = true;
          }

        });
      }
    });
  }

  // createContactForm(): UntypedFormGroup {
  //   return this.fb.group({
  //     id: [this.leaves.id],
  //     employee_id: [this.leaves.employee_id],
  createContactForm(): UntypedFormGroup {
  return this.fb.group({
    id: [this.leaves.id],

    employee_id: [this.leaves.employee_id, Validators.required],

      leave_type: [this.leaves.leave_type, Validators.required],
      start_date: [this.leaves.start_date, Validators.required],
      end_date: [this.leaves.end_date, Validators.required],
      reason: [this.leaves.reason],
      halfDay: [this.leaves.halfDay],
      status: [this.leaves.status, Validators.required],
      sandwich_confirm: [false, this.isSandwichLeave ? Validators.requiredTrue : []],
    }, { validators: this.dateRangeValidator });
  }
  checkSandwichRule() {
    const start_date = this.leavesForm.get('start_date')?.value;
    const end_date = this.leavesForm.get('end_date')?.value;

    if (!start_date || !end_date) {
      this.isSandwichLeave = false;
      this.leavesForm.get('sandwich_confirm')?.clearValidators();
      this.leavesForm.get('sandwich_confirm')?.updateValueAndValidity();
      return;
    }

    const sandwichResult = this.applySandwichRule(new Date(start_date), new Date(end_date));
    if (sandwichResult.applies) {
      this.isSandwichLeave = true;
      this.leavesForm.get('sandwich_confirm')?.setValidators([Validators.requiredTrue]);
      this.leavesForm.get('sandwich_confirm')?.updateValueAndValidity();
    } else {
      this.isSandwichLeave = false;
      this.leavesForm.get('sandwich_confirm')?.clearValidators();
      this.leavesForm.get('sandwich_confirm')?.updateValueAndValidity();
    }
  }

  dateRangeValidator(group: UntypedFormGroup): { [key: string]: any } | null {
    const start = group.get('start_date')?.value;
    const end = group.get('end_date')?.value;
    return start && end && start > end ? { dateRangeInvalid: true } : null;
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

  // Method to check for overlap of leave dates with existing approved leave requests
  checkForLeaveOverlap(): void {
    const employeeId = this.leavesForm.get('employee_id')?.value;
    const startDate = this.formatDateForDB(this.leavesForm.get('start_date')?.value);
    const endDate = this.formatDateForDB(this.leavesForm.get('end_date')?.value);
    const currentLeaveId = this.action === 'edit' ? this.leavesForm.get('id')?.value : null;

    // Disable only if required values are present
    if (employeeId && startDate && endDate) {
      this.leavesService.checkLeaveDateOverlap(employeeId, startDate, endDate, currentLeaveId).subscribe({
        next: (res) => {
          if (res.overlap) {
            this.leaveOverlapError = `This employee already has an approved leave on selected dates.`;
            this.isSubmitDisabled = true;
            this.leavesForm.setErrors({ overlap: true });
          } else {
            this.leaveOverlapError = '';
            this.leavesForm.setErrors(null);
            this.isSubmitDisabled = false;
          }
        },
        error: (err) => {
          console.error('Error checking leave date overlap:', err);
          this.leavesForm.setErrors(null);
        }
      });
    } else {
      this.leavesForm.setErrors(null);
    }
  }

  // Method to fetch all employees
  getEmployees(): void {
    this.employeesService.getAllEmployeess().subscribe({
      next: (data) => {
        this.employees = data; // Assign fetched employees to the employees array
        // Only after loading employees, set availablePaidLeave
        const empId = this.leavesForm.get('employee_id')?.value;
        if (empId) {
          const selected = this.employees.find(emp => emp.id === empId);
          this.availablePaidLeave = selected?.leave_balance || 0;
        }
      },
      error: (error) => console.error('Error fetching employees:', error),
    });
  }
  submit() {
    if (this.leavesForm.invalid) {
      this.leavesForm.markAllAsTouched(); // This will show all errors
      return; // Stop submission
    }

    this.confirmAdd(); // Only call if form is valid
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.isLoading = true;
    const formData = this.leavesForm.getRawValue();

    
    //   formData.approvedBy =
    // JSON.parse(localStorage.getItem('user') || '{}').id;
    const currentUser = JSON.parse(
  localStorage.getItem('currentUser') || '{}'
);

formData.approvedBy = currentUser.id;

  console.log('UPDATE PAYLOAD', formData);

    formData.start_date = this.formatDateForDB(formData.start_date);
    formData.end_date = this.formatDateForDB(formData.end_date);
    // formData.start_date = this.formatDateForDB(formData.start_date);
    // formData.end_date = this.formatDateForDB(formData.end_date);
    const onComplete = () => {
      this.isLoading = false;
    };
    if (this.action === 'edit') {
      this.leavesService.updateLeaves(formData.id, formData).subscribe({
        next: () => {
          Swal.fire({
            title: 'Success!',
            text: 'Leave updated successfully',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.dialogRef.close(true);
            window.location.reload();
          });

        },
        // error: () => {
        //   Swal.fire('Error', 'Failed to update leave.', 'error');
        // },
        error: (err) => {
  console.log('UPDATE ERROR', err);

  Swal.fire(
    'Error',
    err.error?.error ||
    err.error?.message ||
    'Failed to update leave.',
    'error'
  );
},
        complete: onComplete
      });
    } else {
      this.leavesService.addLeaves(formData).subscribe({
        next: () => {
          Swal.fire({
            title: 'Success!',
            text: 'Leave added successfully',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.dialogRef.close(true);
            window.location.reload();
          });

        },
        error: () => {
          Swal.fire('Error', 'Failed to add leave.', 'error');
        },
        complete: onComplete
      });
    }
  }
  getInvalidControls(): string[] {
    const invalid = [];
    const controls = this.leavesForm.controls;
    for (const name in controls) {
      if (controls[name].invalid) {
        invalid.push(name);
      }
    }
    return invalid;
  }

  /**
* Utility function to format the date for database storage
*/
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
}
