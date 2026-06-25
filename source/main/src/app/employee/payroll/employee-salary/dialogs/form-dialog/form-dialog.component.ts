import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { EmployeeSalaryService } from '../../employee-salary.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { EmployeeSalary } from '../../employee-salary.model';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { PayrollService } from 'app/admin/payroll/payslip/payroll.service';
import { Router } from '@angular/router';
export interface DialogData {
  id: number;
  action: string;
  employeeSalary: EmployeeSalary;
}

@Component({
  selector: 'app-form-dialog:not(j)',
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
    MatDialogClose,
    CommonModule
  ],
})
export class FormDialogComponent {

  allMonths: { name: string; value: number }[] = [
    { name: 'January', value: 1 }, { name: 'February', value: 2 }, { name: 'March', value: 3 },
    { name: 'April', value: 4 }, { name: 'May', value: 5 }, { name: 'June', value: 6 },
    { name: 'July', value: 7 }, { name: 'August', value: 8 }, { name: 'September', value: 9 },
    { name: 'October', value: 10 }, { name: 'November', value: 11 }, { name: 'December', value: 12 }
  ];

  months: { name: string; value: number }[] = [];
  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  currentYear = new Date().getFullYear();
  currentMonth = new Date().getMonth() + 1;

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public employeeSalaryService: EmployeeSalaryService,
    public payrollService: PayrollService,
    private router: Router,
  ) {
    this.updateMonthOptions(); // initialize with current filter
  }

  updateMonthOptions() {
    if (this.selectedYear === this.currentYear) {
      this.months = this.allMonths.filter(month => month.value <= this.currentMonth);
    } else {
      this.months = this.allMonths;
    }

    // Auto-correct selected month if it's now out of range
    if (!this.months.find(m => m.value === this.selectedMonth)) {
      this.selectedMonth = this.currentMonth;
    }
  }

  onYearChange() {
    this.updateMonthOptions();
  }

  onGenerate() {
    const row = this.data;
    if (row?.id) {
      const url = `/employee/payroll/payslip/${row.id}?month=${this.selectedMonth}&year=${this.selectedYear}`;
      window.open(url, '_blank');
      this.dialogRef.close({ action: 'generate', month: this.selectedMonth, year: this.selectedYear });
    }
  }

  onConfirm() {
    this.dialogRef.close({ month: this.selectedMonth, year: this.selectedYear });
    this.dialogRef.close();
  }

  onCancel() {
    this.dialogRef.close();
  }
}

