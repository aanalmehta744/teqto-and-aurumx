import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormsModule,
  ReactiveFormsModule,
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';
import { LeaveBalanceService } from '../leave-balance.service';

export interface EditBalanceData {
  employee_id: number;
  fullName: string;
  leave_balance: number;
  total_leave: number;
}

@Component({
  selector: 'app-edit-balance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './edit-balance-dialog.component.html',
})
export class EditBalanceDialogComponent {
  form: UntypedFormGroup;
  isLoading = false;

  /** Used is always Total − Remaining, so it stays consistent with the other two. */
  get usedLeaves(): number {
    const total = Number(this.form?.get('total_leave')?.value) || 0;
    const remaining = Number(this.form?.get('leave_balance')?.value) || 0;
    return total - remaining;
  }

  constructor(
    private fb: UntypedFormBuilder,
    private leaveBalanceService: LeaveBalanceService,
    public dialogRef: MatDialogRef<EditBalanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EditBalanceData
  ) {
    this.form = this.fb.group({
      total_leave: [
        data.total_leave ?? 0,
        [Validators.required, Validators.min(0)],
      ],
      leave_balance: [
        data.leave_balance ?? 0,
        [Validators.required, Validators.min(0)],
      ],
    });
  }

  save(): void {
    if (this.form.invalid || this.usedLeaves < 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.isLoading = true;
    const { leave_balance, total_leave } = this.form.value;

    this.leaveBalanceService
      .updateLeaveBalance(this.data.employee_id, {
        leave_balance: Number(leave_balance),
        total_leave: Number(total_leave),
      })
      .subscribe({
        next: () => {
          this.isLoading = false;
          Swal.fire({
            icon: 'success',
            title: 'Updated',
            text: 'Leave balance updated successfully!',
            confirmButtonColor: '#3085d6',
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          this.isLoading = false;
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.error?.error || 'Failed to update leave balance.',
            confirmButtonColor: '#d33',
          });
        },
      });
  }
}
