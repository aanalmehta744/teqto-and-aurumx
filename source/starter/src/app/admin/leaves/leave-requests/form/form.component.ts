import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { LeavesService } from '../leaves.service';
import {
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Leaves } from '../leaves.model';
import { formatDate, DatePipe, CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
import Swal from 'sweetalert2';

export interface DialogData {
  id: number;
  action: string;
  leaves: Leaves;
  loggedUser: any;
}

@Component({
  selector: 'app-form',
  template: `
<div class="flex items-center justify-between p-4 border-b bg-[#00c4c4]">
  <h2 class="text-xl font-semibold text-white">{{ dialogTitle }}</h2>
  <button mat-icon-button mat-dialog-close class="text-white">
    <mat-icon>close</mat-icon>
  </button>
</div>

<div mat-dialog-content class="p-6">

  <!-- ===== DETAILS VIEW ===== -->
  @if (isDetails) {
    <div class="space-y-3 text-sm">
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">Employee:</span>
        <span>{{ leaves.employee_name }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">Leave Type:</span>
        <span>{{ leaves.leave_type }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">From:</span>
        <span>{{ leaves.start_date | date }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">To:</span>
        <span>{{ leaves.end_date | date }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">No. of Days:</span>
        <span>{{ leaves.no_of_days }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">Duration:</span>
        <span>{{ (leaves.halfDay && leaves.halfDay !== '0') ? leaves.halfDay : 'Full Day' }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">Reason:</span>
        <span>{{ leaves.reason }}</span>
      </div>
      <div class="flex gap-2">
        <span class="font-semibold text-[#00383F] w-36">Status:</span>
        <span [class]="
          leaves.status === 'Approved' ? 'px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium' :
          leaves.status === 'Rejected' ? 'px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium' :
          'px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium'
        ">{{ leaves.status }}</span>
      </div>
    </div>
  }

  <!-- ===== ADD / EDIT FORM ===== -->
  @if (!isDetails) {
    <form [formGroup]="leavesForm" class="space-y-4">

      <!-- Employee: name display for edit, ID input for add, info box for employees -->
      @if (isAdminOrHR && action === 'edit') {
        <div class="bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm">
          <span class="font-semibold text-[#00383F]">Employee:</span>
          <span class="ml-1 font-medium">{{ leaves.employee_name }}</span>
          <span class="ml-2 text-xs text-gray-400">(ID: {{ leaves.employee_id }})</span>
        </div>
      } @else if (isAdminOrHR && action === 'add') {
        <mat-form-field class="w-full" appearance="outline">
          <mat-label>Employee ID</mat-label>
          <input matInput type="number" formControlName="employee_id"
            placeholder="Enter Employee ID" />
          @if (leavesForm.get('employee_id')?.hasError('required') && leavesForm.get('employee_id')?.touched) {
            <mat-error>Employee ID is required</mat-error>
          }
        </mat-form-field>
      } @else if (action === 'add') {
        <div class="bg-teal-50 border border-teal-200 rounded-lg p-3 text-sm text-teal-800">
          <span class="font-medium">Submitting as:</span> {{ loggedUser?.fullName || 'You' }}
          <span class="ml-2 text-xs text-teal-500">(Employee ID: {{ loggedUser?.id }})</span>
        </div>
      }

      <!-- Leave Type -->
      <mat-form-field class="w-full" appearance="outline">
        <mat-label>Leave Type</mat-label>
        <mat-select formControlName="leave_type">
          <mat-option value="Paid">Paid</mat-option>
          <mat-option value="Unpaid">Unpaid</mat-option>
          <mat-option value="Sick">Sick</mat-option>
        </mat-select>
        @if (leavesForm.get('leave_type')?.hasError('required') && leavesForm.get('leave_type')?.touched) {
          <mat-error>Leave type is required</mat-error>
        }
      </mat-form-field>

      <!-- Start & End Date -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <mat-form-field class="w-full" appearance="outline">
          <mat-label>Leave From</mat-label>
          <input matInput [matDatepicker]="startPicker" formControlName="start_date" />
          <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
          <mat-datepicker #startPicker></mat-datepicker>
          @if (leavesForm.get('start_date')?.hasError('required') && leavesForm.get('start_date')?.touched) {
            <mat-error>Start date is required</mat-error>
          }
        </mat-form-field>

        <mat-form-field class="w-full" appearance="outline">
          <mat-label>Leave To</mat-label>
          <input matInput [matDatepicker]="endPicker" formControlName="end_date" />
          <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
          <mat-datepicker #endPicker></mat-datepicker>
          @if (leavesForm.get('end_date')?.hasError('required') && leavesForm.get('end_date')?.touched) {
            <mat-error>End date is required</mat-error>
          }
        </mat-form-field>
      </div>

      <!-- Duration -->
      <mat-form-field class="w-full" appearance="outline">
        <mat-label>Duration</mat-label>
        <mat-select formControlName="halfDay">
          <mat-option value="">Full Day</mat-option>
          <mat-option value="Half Day">Half Day</mat-option>
          <mat-option value="First Half">First Half</mat-option>
          <mat-option value="Second Half">Second Half</mat-option>
        </mat-select>
      </mat-form-field>

      <!-- Reason -->
      <mat-form-field class="w-full" appearance="outline">
        <mat-label>Reason</mat-label>
        <textarea matInput formControlName="reason" rows="3" placeholder="Enter reason for leave"></textarea>
      </mat-form-field>

      <!-- STATUS: only Admin / eligible HR can change -->
      @if (action === 'edit') {
        @if (canApprove) {
          <mat-form-field class="w-full" appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select formControlName="status">
              <mat-option value="Pending">Pending</mat-option>
              <mat-option value="Approved">Approved</mat-option>
              <mat-option value="Rejected">Rejected</mat-option>
            </mat-select>
            @if (leavesForm.get('status')?.hasError('required') && leavesForm.get('status')?.touched) {
              <mat-error>Status is required</mat-error>
            }
          </mat-form-field>
        } @else if (statusDisabledForHR) {
          <div class="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-700">
            Only <strong>Admin</strong> can approve or reject leave requests for HR employees.
          </div>
          <div class="flex gap-2 items-center mt-1">
            <span class="text-sm text-gray-600">Current Status:</span>
            <span [class]="
              leaves.status === 'Approved' ? 'px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium' :
              leaves.status === 'Rejected' ? 'px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium' :
              'px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium'
            ">{{ leaves.status }}</span>
          </div>
        } @else {
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700">
            Only <strong>Admin</strong> or <strong>HR</strong> can approve or reject leave requests.
          </div>
          <div class="flex gap-2 items-center mt-1">
            <span class="text-sm text-gray-600">Current Status:</span>
            <span [class]="
              leaves.status === 'Approved' ? 'px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-medium' :
              leaves.status === 'Rejected' ? 'px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-medium' :
              'px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 text-xs font-medium'
            ">{{ leaves.status }}</span>
          </div>
        }
      }

    </form>
  }
</div>

<!-- FOOTER BUTTONS -->
@if (!isDetails) {
  <div class="flex justify-end gap-3 px-6 pb-6">
    @if (isLoading) {
      <mat-spinner diameter="30"></mat-spinner>
    }
    @if (action === 'add' || canApprove) {
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="isLoading">
        {{ action === 'edit' ? 'Update / Approve' : 'Save Request' }}
      </button>
    }
    <button mat-raised-button color="warn" (click)="onNoClick()" [disabled]="isLoading">
      Cancel
    </button>
  </div>
}
`,
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
        parse: { dateInput: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY'] },
        display: {
          dateInput: 'YYYY-MM-DD',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
  ],
})
export class FormComponent implements OnInit {
  action: string;
  dialogTitle: string;
  isDetails = false;
  leavesForm!: UntypedFormGroup;
  leaves: Leaves;
  isLoading = false;

  loggedUser: any;
  loggedUserRole = '';

  canApprove = false;
  statusDisabledForHR = false;
  isAdminOrHR = false;

  constructor(
    public dialogRef: MatDialogRef<FormComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public leavesService: LeavesService,
    private fb: UntypedFormBuilder
  ) {
    this.loggedUser = data.loggedUser
      || JSON.parse(localStorage.getItem('currentUser') || 'null');
    this.loggedUserRole = this.loggedUser?.role || '';
    this.isAdminOrHR = this.loggedUserRole === 'Admin' || this.loggedUserRole === 'HR';

    this.action = data.action;
    if (this.action === 'edit') {
      this.isDetails = false;
      this.leaves = data.leaves;
    } else if (this.action === 'details') {
      this.isDetails = true;
      this.dialogTitle = data.leaves.employee_name || 'Leave Details';
      this.leaves = data.leaves;
    } else {
      this.isDetails = false;
      this.dialogTitle = this.isAdminOrHR ? 'Add Leave Request' : 'Submit My Leave';
      this.leaves = new Leaves({});
    }

    if (this.loggedUserRole === 'Admin') {
      this.canApprove = true;
      if (this.action === 'edit') {
        this.dialogTitle = `Approve / Edit — ${data.leaves.employee_name || 'Leave'}`;
      }
    } else if (this.loggedUserRole === 'HR') {
      const employeeRole = this.leaves?.employee_role || '';
      if (employeeRole === 'HR') {
        this.canApprove = false;
        this.statusDisabledForHR = true;
        if (this.action === 'edit') {
          this.dialogTitle = `View Leave — ${data.leaves.employee_name || 'Leave'}`;
        }
      } else {
        this.canApprove = true;
        if (this.action === 'edit') {
          this.dialogTitle = `Approve / Edit — ${data.leaves.employee_name || 'Leave'}`;
        }
      }
    } else {
      this.canApprove = false;
      if (this.action === 'edit') {
        this.dialogTitle = `Leave Details — ${data.leaves.employee_name || 'Leave'}`;
      }
    }
  }

  ngOnInit() {
    this.leavesForm = this.createForm();
  }

  createForm(): UntypedFormGroup {
    const statusValue = this.leaves.status || 'Pending';
    const empId = (this.action === 'add' && !this.isAdminOrHR)
      ? (this.loggedUser?.id || 0)
      : (this.leaves.employee_id || 0);
    const halfDayValue = (this.leaves.halfDay === '0' || !this.leaves.halfDay) ? '' : this.leaves.halfDay;
    return this.fb.group({
      id: [this.leaves.id],
      employee_id: [empId, Validators.required],
      leave_type: [this.leaves.leave_type, Validators.required],
      start_date: [this.leaves.start_date, Validators.required],
      end_date: [this.leaves.end_date, Validators.required],
      reason: [this.leaves.reason],
      halfDay: [halfDayValue],
      sandwich_confirm: [this.leaves.sandwich_confirm ?? 0],
      status: [
        { value: statusValue, disabled: !this.canApprove },
        Validators.required,
      ],
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  submit() {
    if (this.leavesForm.invalid) {
      this.leavesForm.markAllAsTouched();
      return;
    }
    this.confirmAdd();
  }

  confirmAdd(): void {
    const formData = this.leavesForm.getRawValue();
    formData.start_date = this.formatDateForDB(formData.start_date);
    formData.end_date = this.formatDateForDB(formData.end_date);
    formData.approvedBy = this.loggedUser?.id ?? null;

    if (this.action === 'edit' && !formData.approvedBy) {
      Swal.fire('Session Expired', 'Please log out and log in again to approve leaves.', 'warning');
      return;
    }

    this.isLoading = true;
    const onComplete = () => { this.isLoading = false; };

    if (this.action === 'edit') {
      console.log('[LeaveApproval] PUT payload:', formData);
      this.leavesService.updateLeaves(formData.id, formData).subscribe({
        next: () => {
          Swal.fire({ title: 'Success!', text: 'Leave updated successfully', icon: 'success', confirmButtonText: 'OK' })
            .then(() => { this.dialogRef.close(1); window.location.reload(); });
        },
        error: (err) => {
          const msg = err?.error?.error || 'Failed to update leave.';
          Swal.fire('Error', msg, 'error');
        },
        complete: onComplete,
      });
    } else {
      formData.status = 'Pending';
      if (!this.isAdminOrHR) {
        formData.employee_id = this.loggedUser?.id;
        this.leavesService.addMyLeave(formData).subscribe({
          next: () => {
            Swal.fire({ title: 'Success!', text: 'Your leave request has been submitted!', icon: 'success', confirmButtonText: 'OK' })
              .then(() => { this.dialogRef.close(1); window.location.reload(); });
          },
          error: (err) => {
            const msg = err?.error?.error || err?.error?.message || 'Failed to submit leave request.';
            Swal.fire('Error', msg, 'error');
          },
          complete: onComplete,
        });
      } else {
        this.leavesService.addLeaves(formData).subscribe({
          next: () => {
            Swal.fire({ title: 'Success!', text: 'Leave request added successfully', icon: 'success', confirmButtonText: 'OK' })
              .then(() => { this.dialogRef.close(1); window.location.reload(); });
          },
          error: (err) => {
            const msg = err?.error?.error || err?.error?.message || 'Failed to add leave.';
            Swal.fire('Error', msg, 'error');
          },
          complete: onComplete,
        });
      }
    }
  }

  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    try {
      const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
      const yyyy = d.getUTCFullYear();
      const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(d.getUTCDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd} 00:00:00`;
    } catch {
      return null;
    }
  }
}
