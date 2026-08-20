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

@Component({
  selector: 'app-add-payslip',
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
  templateUrl: './add-payslip.component.html',
  styleUrl: './add-payslip.component.scss'
})
export class AddPayslipComponent {
  // form model properties
  selectedMonth: number | null = null;
  selectedYear: number = new Date().getFullYear();

  presentDays: number = 0;
  paidLeaveDays: number = 0;
  unpaidLeaveDays: number = 0;
  weekendDays: number = 0;
  workingDays: number = 0;
  netSalary: number = 0;
  months = [
    { name: 'January', value: 1 },
    { name: 'February', value: 2 },
    { name: 'March', value: 3 },
    { name: 'April', value: 4 },
    { name: 'May', value: 5 },
    { name: 'June', value: 6 },
    { name: 'July', value: 7 },
    { name: 'August', value: 8 },
    { name: 'September', value: 9 },
    { name: 'October', value: 10 },
    { name: 'November', value: 11 },
    { name: 'December', value: 12 },
  ];
  constructor(
    public dialogRef: MatDialogRef<AddPayslipComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    public employeeSalaryService: EmployeeSalaryService,
    public payrollService: PayrollService,
    private router: Router,
  ) {
    console.log("Edit data", data);
  }
  onSave() { }
  onCancel() {
    this.dialogRef.close();
  }
}
