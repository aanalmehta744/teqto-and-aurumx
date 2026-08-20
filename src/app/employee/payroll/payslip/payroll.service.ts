import { Injectable } from '@angular/core';
import { EmployeeSalary } from '../employee-salary/employee-salary.model';

@Injectable({
  providedIn: 'root',
})
export class PayrollService {
  private selectedRow: EmployeeSalary | null = null; // Initialize with null

  // Store selected row (the entire row object)
  setSelectedRow(row: EmployeeSalary): void {
    this.selectedRow = row;
  }

  // Retrieve the selected row
  getSelectedRow(): EmployeeSalary | null {
    return this.selectedRow;
  }

  constructor() {}
}
