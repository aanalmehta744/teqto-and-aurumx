import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatDialogClose } from '@angular/material/dialog'; // Ensure MatDialogClose is correctly imported
import { MatDialogContent } from '@angular/material/dialog'; // Ensure MatDialogContent is correctly imported
import { ReactiveFormsModule } from '@angular/forms';
import { EmployeesService } from '../../allEmployees/employees.service';
import { formatDate } from '@angular/common';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';

export interface DialogData {
  employees: { id: number };
  dialogTitle: string;
  action?: 'add' | 'edit';
  target?: any;
}


@Component({
  selector: 'app-add-target-dialog',
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    MatIconModule,
    MatDialogModule,
    MatDialogContent,
    MatDialogClose,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatOptionModule,
    MatSelectModule,
    ReactiveFormsModule
  ],
  templateUrl: './add-target-dialog.component.html',
  styleUrls: ['./add-target-dialog.component.scss'],
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
export class AddTargetDialogComponent {
  targetForm: FormGroup;
  employees: any;
  dialogTitle: string;
  action: 'add' | 'edit' = 'add';

  constructor(
    private employeesService: EmployeesService,
    public dialogRef: MatDialogRef<AddTargetDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    private fb: FormBuilder
  ) {
    this.employees = data.employees;
    this.dialogTitle = data.dialogTitle;
    this.action = data.action || 'add';

    this.targetForm = this.fb.group({
      amount: [data?.target?.amount || '', Validators.required],
      target_date: [data?.target?.target_month || '', Validators.required]
    });
  }

  onSubmit() {
    if (this.targetForm.invalid) return;

    const targetData = this.targetForm.value;
    const employeeId = this.employees?.id;
    targetData.target_date = this.formatDateForDB(targetData.target_date);
    if (this.action === 'edit') {
      const targetId = this.data.target?.id;
      this.employeesService.updateMonthlyTarget(targetId, targetData).subscribe({
        next: (res) => {
          console.log('Target updated:', res);
          this.dialogRef.close(res);
        },
        error: (err) => {
          console.error('Failed to update target:', err);
        }
      });
    } else {
      this.employeesService.addMonthlyTarget(employeeId, targetData).subscribe({
        next: (res) => {
          console.log('Target added:', res);
          this.dialogRef.close(res);
        },
        error: (err) => {
          console.error('Failed to add target:', err);
        }
      });
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
}
