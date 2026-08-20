import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { EmployeeSalary } from './employee-salary.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class EmployeeSalaryService extends UnsubscribeOnDestroyAdapter {
  private API_URL = `${environment.apiUrl}/payroll`;
  isTblLoading = true;
  dataChange: BehaviorSubject<EmployeeSalary[]> = new BehaviorSubject<
    EmployeeSalary[]
  >([]);
  // Temporarily stores data from dialogs
  dialogData!: EmployeeSalary;
  constructor(private httpClient: HttpClient) {
    super();
  }
  get data(): EmployeeSalary[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  /** CRUD METHODS */
  getAllEmployeeSalarys(): void {
    this.subs.sink = this.httpClient
      .get<EmployeeSalary[]>(this.API_URL)
      .subscribe({
        next: (data) => {
          this.isTblLoading = false;
          this.dataChange.next(data);
        },
        error: (error: HttpErrorResponse) => {
          this.isTblLoading = false;
          console.log(error.name + ' ' + error.message);
        },
      });
  }
  // Fetch payslip data from the API
  getPayslipData(employeeId: number, month: number, year: number): Observable<any> {
    return this.httpClient.get<any>(
      `${this.API_URL}/payslip/${employeeId}?month=${month}&year=${year}`
    );
  }


  addEmployeeSalary(employeeSalary: EmployeeSalary): void {
    this.dialogData = employeeSalary;

    // this.httpClient.post(this.API_URL, employeeSalary)
    //   .subscribe({
    //     next: (data) => {
    //       this.dialogData = employeeSalary;
    //     },
    //     error: (error: HttpErrorResponse) => {
    //        // error code here
    //     },
    //   });
  }
  updateEmployeeSalary(employeeSalary: EmployeeSalary): void {
    this.dialogData = employeeSalary;

    // this.httpClient.put(this.API_URL + employeeSalary.id, employeeSalary)
    //     .subscribe({
    //       next: (data) => {
    //         this.dialogData = employeeSalary;
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
  deleteEmployeeSalary(id: number): void {
    console.log(id);

    // this.httpClient.delete(this.API_URL + id)
    //     .subscribe({
    //       next: (data) => {
    //         console.log(id);
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }

  getPayrollRecords(employeeId: number): Observable<EmployeeSalary[]> {
    return this.httpClient.get<any>(`${this.API_URL}/all-payslip/${employeeId}`);
  }
  downloadPayslip(employeeId: string, month: number, year: number): Observable<any[]> {
    return this.httpClient.get<any>(`${this.API_URL}/download?employeeId=${employeeId}&month=${month}&year=${year}`);
  }
  //   updatePayslipOverride(employeeId: string, month: number, year: number, workingDays: number) {
  //   return this.httpClient.put(`${this.API_URL}/override/${employeeId}`, {
  //     month,
  //     year,
  //     workingDays
  //   });
  // }
  updatePayslipOverride(employeeId: string, month: number, year: number, payload: any) {
    return this.httpClient.patch(
      `${this.API_URL}/override/${employeeId}`,
      { month, year, ...payload }
    );
  }


}
