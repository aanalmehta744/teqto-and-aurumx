import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { LeavesService } from '../leaves.service';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
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
import { MatCheckboxModule } from '@angular/material/checkbox';

import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE
} from '@angular/material/core';

import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS
} from '@angular/material-moment-adapter';

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
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS]
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY']
        },
        display: {
          dateInput: 'YYYY-MM-DD',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY'
        }
      }
    }
  ]
})
export class FormComponent implements OnInit {

  action: string;
  dialogTitle?: string;
  isDetails = false;

  leavesForm!: UntypedFormGroup;
  leaves: Leaves;

  employees: any[] = [];
  holidays: string[] = [];

  availablePaidLeave = 0;
  employeeId!: number;

  paidLeaveError = '';
  leaveError = '';
  halfdayError = '';
  leaveOverlapError = '';

  isSubmitDisabled = false;

  sandwichWarning = false;
  sandwicherror = '';

  holidayWarning = false;
  isLoading = false;

  minDate: Date = new Date();

  isSandwichLeave = false;
  isBdeOrBa = false;

  /**
   * To-date cannot be earlier than the selected From-date
   * and never earlier than today.
   */
  get endMinDate(): any {
    return this.leavesForm?.get('start_date')?.value || this.minDate;
  }

  constructor(
    public dialogRef: MatDialogRef<FormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public leavesService: LeavesService,
    private fb: UntypedFormBuilder,
    public employeesService: EmployeesService,
    private holidayService: HolidayService,
    private cdr: ChangeDetectorRef
  ) {
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
    Validators.required
  ]);

  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('type')
        ? 'Not a valid type'
        : '';
  }

  ngOnInit() {
    this.getEmployees();

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

    // Leave overlap checks
    this.leavesForm
      .get('start_date')
      ?.valueChanges
      .subscribe(() => this.checkForLeaveOverlap());

    this.leavesForm
      .get('end_date')
      ?.valueChanges
      .subscribe(() => this.checkForLeaveOverlap());

    this.leavesForm
      .get('employee_id')
      ?.valueChanges
      .subscribe(() => this.checkForLeaveOverlap());

    // Handle employee selection
    this.leavesForm.get('employee_id')?.valueChanges.subscribe(id => {
      const selectedEmployee = this.employees.find(
        emp => emp.id === id
      );

      if (selectedEmployee) {
        this.availablePaidLeave = selectedEmployee.leave_balance || 0;
        this.employeeId = selectedEmployee.id || 0;

        const role = (selectedEmployee.role || '').toUpperCase();

        this.isBdeOrBa =
          role === 'BDE' ||
          role === 'BA';

        console.log(
          'availablePaidLeave',
          this.availablePaidLeave
        );
      } else {
        this.availablePaidLeave = 0;
        this.employeeId = 0;
        this.isBdeOrBa = false;
      }
    });

    /**
     * Central form validation and business rules.
     *
     * IMPORTANT:
     * Leave Type is NOT disabled merely because Half Day is selected.
     * Half Day can independently be:
     * - Paid
     * - Sick (Paid)
     * - Unpaid
     */
    this.leavesForm.valueChanges.subscribe(formValue => {

      const {
        leave_type,
        start_date,
        end_date,
        halfDay
      } = formValue;

      // Reset messages
      this.paidLeaveError = '';
      this.leaveError = '';
      this.halfdayError = '';
      this.sandwichWarning = false;
      this.holidayWarning = false;

      const leaveTypeControl =
        this.leavesForm.get('leave_type');

      if (!leaveTypeControl) {
        return;
      }

      /**
       * Always keep Leave Type enabled initially.
       *
       * The only exception is handled later for the existing
       * BDE/BA sandwich-leave rule.
       */
      if (!leaveTypeControl.enabled) {
        leaveTypeControl.enable({
          emitEvent: false
        });
      }

      // Remove only our custom paid-leave validation error.
      const currentErrors = {
        ...(leaveTypeControl.errors || {})
      };

      delete currentErrors['noPaidLeave'];

      leaveTypeControl.setErrors(
        Object.keys(currentErrors).length
          ? currentErrors
          : null
      );

      /**
       * HALF DAY VALIDATION
       *
       * Half Day must always represent exactly one calendar day.
       */
      if (
        halfDay === 'Half Day' &&
        start_date &&
        end_date
      ) {
        const start = new Date(start_date);
        const end = new Date(end_date);

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        if (
          start.toDateString() !==
          end.toDateString()
        ) {
          this.halfdayError =
            'Half Day leave can only be for a single day.';

          this.isSubmitDisabled = true;

        } else {
          this.halfdayError = '';

          /**
           * Do not leave the submit button disabled
           * because of a previous Half Day validation error.
           */
          this.isSubmitDisabled = false;
        }

      } else if (halfDay !== 'Half Day') {

        this.halfdayError = '';

        /**
         * Do not reset isSubmitDisabled here if another
         * validation such as overlap is currently responsible
         * for disabling submission.
         */
      }

      /**
       * PAID LEAVE VALIDATION
       *
       * Both "Paid" and "Sick" are paid leave.
       *
       * Full Day:
       *   1 calendar day = 1 paid leave
       *
       * Half Day:
       *   1 calendar day = 0.5 paid leave
       */
      if (
        (
          leave_type === 'Paid' ||
          leave_type === 'Sick'
        ) &&
        start_date &&
        end_date
      ) {

        const start = new Date(start_date);
        const end = new Date(end_date);

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const diffTime =
          end.getTime() - start.getTime();

        const fullDays =
          Math.floor(
            diffTime /
            (1000 * 60 * 60 * 24)
          ) + 1;

        const daysRequested =
          halfDay === 'Half Day'
            ? 0.5
            : fullDays;

        console.log(
          'Available paid leave:',
          this.availablePaidLeave,
          'Requested:',
          daysRequested,
          'Type:',
          leave_type,
          'Duration:',
          halfDay
        );

        if (
          daysRequested >
          this.availablePaidLeave
        ) {

          this.leaveError =
            `You only have ${this.availablePaidLeave} paid leave(s) left.`;

          leaveTypeControl.setErrors({
            ...(leaveTypeControl.errors || {}),
            noPaidLeave: true
          });

          this.cdr.detectChanges();

        } else {

          this.paidLeaveError = '';

          const errors = {
            ...(leaveTypeControl.errors || {})
          };

          delete errors['noPaidLeave'];

          leaveTypeControl.setErrors(
            Object.keys(errors).length
              ? errors
              : null
          );

          leaveTypeControl.updateValueAndValidity({
            onlySelf: true,
            emitEvent: false
          });
        }
      }

      /**
       * HOLIDAY + SANDWICH WARNINGS
       */
      if (start_date && end_date) {

        const start = new Date(start_date);
        const end = new Date(end_date);

        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        const overlap = this.holidays.some(
          holiday => {

            const holidayDate =
              new Date(holiday);

            holidayDate.setHours(0, 0, 0, 0);

            return (
              holidayDate >= start &&
              holidayDate <= end
            );
          }
        );

        if (overlap) {
          this.holidayWarning = true;

          console.warn(
            '⚠️ Your leave period overlaps with a holiday!'
          );
        }

        const adjacentToHoliday =
          this.isLeaveAdjacentToHoliday(
            start,
            end
          );

        const sandwichResult =
          this.applySandwichRule(
            start,
            end
          );

        const leaveTypeCtrl =
          this.leavesForm.get('leave_type');

        if (
          adjacentToHoliday ||
          sandwichResult.applies
        ) {

          this.isSandwichLeave = true;
          this.sandwichWarning = true;

          /**
           * Existing BDE/BA sandwich rule:
           *
           * For a normal/full-day sandwich leave,
           * the system automatically uses Paid.
           *
           * IMPORTANT:
           * For Half Day we DO NOT lock Leave Type.
           * This allows:
           *   Half Day + Paid
           *   Half Day + Sick
           *   Half Day + Unpaid
           */
          if (
            this.isBdeOrBa &&
            halfDay !== 'Half Day'
          ) {

            leaveTypeCtrl?.setValue(
              'Paid',
              {
                emitEvent: false
              }
            );

            leaveTypeCtrl?.disable({
              emitEvent: false
            });

          } else {

            /**
             * Half Day must always remain selectable.
             */
            leaveTypeCtrl?.enable({
              emitEvent: false
            });

            this.sandwicherror = `
              ⚠️ Your leave request falls under the <b>Sandwich Rule</b>.<br>
              According to company policy, weekends and holidays that fall
              between two leave periods are also counted as leave days.
            `;
          }

        } else {

          this.isSandwichLeave = false;
          this.sandwichWarning = false;

          /**
           * Always re-enable Leave Type when the
           * sandwich condition no longer applies.
           */
          leaveTypeCtrl?.enable({
            emitEvent: false
          });

          this.sandwicherror = '';
        }

        /**
         * Check existing employee leaves for sandwich rules.
         */
        if (this.employeeId) {

          this.leavesService
            .getLeavesByEmployee(this.employeeId)
            .subscribe(existingLeaves => {

              const sandwichCheck =
                this.applySandwichRule(
                  start,
                  end,
                  existingLeaves
                );

              if (
                sandwichCheck.applies &&
                !this.isSandwichLeave
              ) {

                this.isSandwichLeave = true;

                /**
                 * Again, Half Day must remain selectable.
                 */
                if (
                  this.isBdeOrBa &&
                  halfDay !== 'Half Day'
                ) {

                  leaveTypeCtrl?.setValue(
                    'Paid',
                    {
                      emitEvent: false
                    }
                  );

                  leaveTypeCtrl?.disable({
                    emitEvent: false
                  });

                } else {

                  leaveTypeCtrl?.enable({
                    emitEvent: false
                  });

                  this.sandwicherror = `
                    ⚠️ Your leave request falls under the <b>Sandwich Rule</b>.<br>
                    According to company policy, weekends and holidays that fall
                    between two leave periods are also counted as leave days.
                  `;
                }
              }
            });
        }
      }

      /**
       * FINAL GUARANTEE:
       *
       * If Half Day is selected, Leave Type must be enabled.
       *
       * This is intentionally placed at the end so that no
       * sandwich/business-rule branch above can accidentally
       * leave the control disabled.
       */
      if (halfDay === 'Half Day') {
        leaveTypeControl.enable({
          emitEvent: false
        });
      }

      leaveTypeControl.updateValueAndValidity({
        onlySelf: true,
        emitEvent: false
      });
    });
  }

  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.leaves.id],

      employee_id: [
        this.leaves.employee_id,
        Validators.required
      ],

      leave_type: [
        this.leaves.leave_type,
        Validators.required
      ],

      start_date: [
        this.leaves.start_date,
        Validators.required
      ],

      end_date: [
        this.leaves.end_date,
        Validators.required
      ],

      reason: [
        this.leaves.reason
      ],

      halfDay: [
        this.leaves.halfDay
      ],

      status: [
        this.leaves.status,
        Validators.required
      ],

      sandwich_confirm: [
        false,
        this.isSandwichLeave
          ? Validators.requiredTrue
          : []
      ]

    }, {
      validators: this.dateRangeValidator
    });
  }

  checkSandwichRule() {
    const start_date =
      this.leavesForm.get('start_date')?.value;

    const end_date =
      this.leavesForm.get('end_date')?.value;

    if (!start_date || !end_date) {

      this.isSandwichLeave = false;

      this.leavesForm
        .get('sandwich_confirm')
        ?.clearValidators();

      this.leavesForm
        .get('sandwich_confirm')
        ?.updateValueAndValidity();

      return;
    }

    const sandwichResult =
      this.applySandwichRule(
        new Date(start_date),
        new Date(end_date)
      );

    if (sandwichResult.applies) {

      this.isSandwichLeave = true;

      this.leavesForm
        .get('sandwich_confirm')
        ?.setValidators([
          Validators.requiredTrue
        ]);

      this.leavesForm
        .get('sandwich_confirm')
        ?.updateValueAndValidity();

    } else {

      this.isSandwichLeave = false;

      this.leavesForm
        .get('sandwich_confirm')
        ?.clearValidators();

      this.leavesForm
        .get('sandwich_confirm')
        ?.updateValueAndValidity();
    }
  }

  dateRangeValidator(
    group: UntypedFormGroup
  ): { [key: string]: any } | null {

    const start =
      group.get('start_date')?.value;

    const end =
      group.get('end_date')?.value;

    return (
      start &&
      end &&
      start > end
    )
      ? { dateRangeInvalid: true }
      : null;
  }

  isLeaveAdjacentToHoliday(
    start: Date,
    end: Date
  ): boolean {

    const format = (d: Date) =>
      formatDate(
        d,
        'yyyy-MM-dd',
        'en'
      );

    const dayBefore =
      new Date(start);

    dayBefore.setDate(
      dayBefore.getDate() - 1
    );

    const dayAfter =
      new Date(end);

    dayAfter.setDate(
      dayAfter.getDate() + 1
    );

    return (
      this.holidays.includes(
        format(dayBefore)
      ) ||
      this.holidays.includes(
        format(dayAfter)
      )
    );
  }

  applySandwichRule(
    start: Date,
    end: Date,
    employeeLeaves: any[] = []
  ): {
    applies: boolean,
    reason?: string
  } {

    const format = (d: Date) =>
      formatDate(
        d,
        'yyyy-MM-dd',
        'en'
      );

    const appliedStart =
      new Date(start);

    const appliedEnd =
      new Date(end);

    const isWeekendOrHoliday =
      (d: Date) => {

        const day = d.getDay();

        const dateStr = format(d);

        return (
          day === 0 ||
          day === 6 ||
          this.holidays.includes(dateStr)
        );
      };

    const hasLeaveOn =
      (dateStr: string) =>
        employeeLeaves.some(l => {

          const leaveStart =
            this.formatDateForDB(
              l.start_date
            );

          const leaveEnd =
            this.formatDateForDB(
              l.end_date
            );

          return (
            leaveStart &&
            leaveEnd &&
            leaveStart <= dateStr &&
            leaveEnd >= dateStr
          );
        });

    // Case 1: Leave directly on weekend/holiday
    if (
      isWeekendOrHoliday(appliedStart) ||
      isWeekendOrHoliday(appliedEnd)
    ) {

      return {
        applies: true,
        reason:
          'Leave includes a weekend/holiday directly.'
      };
    }

    // Case 2: Leave before weekend + applied after
    const prevDate =
      new Date(appliedStart);

    prevDate.setDate(
      prevDate.getDate() - 1
    );

    if (
      isWeekendOrHoliday(prevDate) &&
      hasLeaveOn(
        format(
          new Date(
            appliedStart.getTime() -
            3 * 86400000
          )
        )
      )
    ) {

      return {
        applies: true,
        reason:
          'Leave is connected through a weekend/holiday gap before.'
      };
    }

    // Case 3: Leave after weekend + applied before
    const nextDate =
      new Date(appliedEnd);

    nextDate.setDate(
      nextDate.getDate() + 1
    );

    if (
      isWeekendOrHoliday(nextDate) &&
      hasLeaveOn(
        format(
          new Date(
            appliedEnd.getTime() +
            3 * 86400000
          )
        )
      )
    ) {

      return {
        applies: true,
        reason:
          'Leave is connected through a weekend/holiday gap after.'
      };
    }

    // Case 4: Friday–Monday bridge
    const dayOfWeek =
      appliedStart.getDay();

    if (dayOfWeek === 1) {

      const friday =
        new Date(appliedStart);

      friday.setDate(
        friday.getDate() - 3
      );

      if (
        hasLeaveOn(
          format(friday)
        )
      ) {

        return {
          applies: true,
          reason:
            'Leave extends from Friday through Monday (weekend bridge).'
        };
      }
    }

    // Case 5: Weekends/holidays inside applied range
    let current =
      new Date(appliedStart);

    while (current <= appliedEnd) {

      if (
        isWeekendOrHoliday(current)
      ) {

        return {
          applies: true,
          reason:
            'Selected leave range includes weekends/holidays within the period.'
        };
      }

      current.setDate(
        current.getDate() + 1
      );
    }

    return {
      applies: false
    };
  }

  // Method to check for overlap of leave dates
  // with existing approved leave requests
  checkForLeaveOverlap(): void {

    const employeeId =
      this.leavesForm
        .get('employee_id')
        ?.value;

    const startDate =
      this.formatDateForDB(
        this.leavesForm
          .get('start_date')
          ?.value
      );

    const endDate =
      this.formatDateForDB(
        this.leavesForm
          .get('end_date')
          ?.value
      );

    const currentLeaveId =
      this.action === 'edit'
        ? this.leavesForm
            .get('id')
            ?.value
        : null;

    if (
      employeeId &&
      startDate &&
      endDate
    ) {

      this.leavesService
        .checkLeaveDateOverlap(
          employeeId,
          startDate,
          endDate,
          currentLeaveId
        )
        .subscribe({

          next: (res) => {

            if (res.overlap) {

              this.leaveOverlapError =
                'This employee already has an approved leave on selected dates.';

              this.isSubmitDisabled = true;

              this.leavesForm.setErrors({
                overlap: true
              });

            } else {

              this.leaveOverlapError = '';

              this.leavesForm.setErrors(
                null
              );

              this.isSubmitDisabled = false;
            }
          },

          error: (err) => {

            console.error(
              'Error checking leave date overlap:',
              err
            );

            this.leavesForm.setErrors(
              null
            );
          }
        });

    } else {

      this.leavesForm.setErrors(
        null
      );
    }
  }

  // Method to fetch all employees
  getEmployees(): void {

    this.employeesService
      .getAllEmployeess()
      .subscribe({

        next: (data) => {

          this.employees = data;

          const empId =
            this.leavesForm
              .get('employee_id')
              ?.value;

          if (empId) {

            const selected =
              this.employees.find(
                emp => emp.id === empId
              );

            this.availablePaidLeave =
              selected?.leave_balance || 0;

            this.employeeId =
              selected?.id || 0;

            const role =
              (
                selected?.role || ''
              ).toUpperCase();

            this.isBdeOrBa =
              role === 'BDE' ||
              role === 'BA';
          }
        },

        error: (error) =>
          console.error(
            'Error fetching employees:',
            error
          )
      });
  }

  submit() {

    if (this.leavesForm.invalid) {

      this.leavesForm.markAllAsTouched();

      return;
    }

    this.confirmAdd();
  }

  public confirmAdd(): void {

    this.isLoading = true;

    const formData =
      this.leavesForm.getRawValue();

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          'currentUser'
        ) || '{}'
      );

    formData.approvedBy =
      currentUser.id;

    console.log(
      'UPDATE PAYLOAD',
      formData
    );

    formData.start_date =
      this.formatDateForDB(
        formData.start_date
      );

    formData.end_date =
      this.formatDateForDB(
        formData.end_date
      );

    const onComplete = () => {
      this.isLoading = false;
    };

    if (this.action === 'edit') {

      this.leavesService
        .updateLeaves(
          formData.id,
          formData
        )
        .subscribe({

          next: () => {

            Swal.fire({
              title: 'Success!',
              text:
                'Leave updated successfully',
              icon: 'success',
              confirmButtonText: 'OK'
            }).then(() => {

              this.dialogRef.close(
                true
              );

              window.location.reload();
            });
          },

          error: (err) => {

            console.log(
              'UPDATE ERROR',
              err
            );

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

      this.leavesService
        .addLeaves(formData)
        .subscribe({

          next: () => {

            Swal.fire({
              title: 'Success!',
              text:
                'Leave added successfully',
              icon: 'success',
              confirmButtonText: 'OK'
            }).then(() => {

              this.dialogRef.close(
                true
              );

              window.location.reload();
            });
          },

          error: () => {

            Swal.fire(
              'Error',
              'Failed to add leave.',
              'error'
            );
          },

          complete: onComplete
        });
    }
  }

  getInvalidControls(): string[] {

    const invalid: string[] = [];

    const controls =
      this.leavesForm.controls;

    for (const name in controls) {

      if (
        controls[name].invalid
      ) {

        invalid.push(name);
      }
    }

    return invalid;
  }

  /**
   * Utility function to format the date
   * for database storage.
   */
  private formatDateForDB(
    date: any
  ): string | null {

    if (!date) {
      return null;
    }

    return formatDate(
      date,
      'yyyy-MM-dd',
      'en'
    );
  }
}