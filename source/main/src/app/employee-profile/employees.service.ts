import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Employees } from './employees.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root',
})
export class EmployeesService extends UnsubscribeOnDestroyAdapter {
  private API_URL = `${environment.apiUrl}/employees`;
  isTblLoading = true;
  dataChange: BehaviorSubject<Employees[]> = new BehaviorSubject<Employees[]>(
    []
  );
  // Temporarily stores data from dialogs
  dialogData!: Employees;
  constructor(private httpClient: HttpClient) {
    super();
  }
  get data(): Employees[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  /** CRUD METHODS */
  getAllEmployeess(): Observable<Employees[]> {
    return this.httpClient.get<Employees[]>(this.API_URL);
  }
  
  addEmployees(employeeData: any): Observable<any> {
    const formData = new FormData();
  
    // Append all form fields
    for (const key in employeeData) {
      if (key !== 'uploadImg') {
        formData.append(key, employeeData[key]);
      }
    }
  
    // Append the file separately
    if (employeeData.uploadImg instanceof File) {
      formData.append('uploadImg', employeeData.uploadImg);
    }
  
    return this.httpClient.post(this.API_URL, formData);
  }
  
  
  updateEmployees(id: number, employeeData: any) {
    return this.httpClient.put(`${this.API_URL}/${id}`, employeeData);
  }
  
  deleteEmployees(id: number): void {
    console.log(`Deleting employee with ID: ${id}`);

    this.httpClient.delete(`${this.API_URL}/${id}`) // Ensure the slash before id
        .subscribe({
          next: (response) => {
            console.log(`Employee with ID ${id} deleted successfully`, response);
          },
          error: (error: HttpErrorResponse) => {
            console.error(`Error deleting employee with ID ${id}:`, error.message);
          },
        });
}

getEmployeeById(id: number): Observable<Employees> {
  return this.httpClient.get<Employees>(`${this.API_URL}/${id}`);
}

// employees.service.ts
addMonthlyTarget(employeeId: number, targetData: any) {
  return this.httpClient.post(`${this.API_URL}/${employeeId}/targets`, targetData);
}
// employees.service.ts
getMonthlyTargets(employeeId: number) {
  return this.httpClient.get<any[]>(`${this.API_URL}/${employeeId}/targets`);
}


updateMonthlyTarget(targetId: number, data: any) {
  return this.httpClient.put(`${this.API_URL}/${targetId}/targets`, data);
}

deleteMonthlyTarget(targetId: number) {
  return this.httpClient.delete(`${this.API_URL}/${targetId}/targets`);
}

uploadPhoto(employeeId: number, file: File): Observable<any> {
  const formData = new FormData();
  formData.append('photo', file);
  return this.httpClient.patch(`${this.API_URL}/${employeeId}/upload-photo`, formData);
}

}
