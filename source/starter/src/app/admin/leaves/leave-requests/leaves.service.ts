import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Leaves } from './leaves.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class LeavesService extends UnsubscribeOnDestroyAdapter {
  private API_URL = `${environment.apiUrl}/leaveRequests`;
  isTblLoading = true;
  dataChange: BehaviorSubject<Leaves[]> = new BehaviorSubject<Leaves[]>([]);

  // Temporarily stores data from dialogs
  dialogData!: Leaves;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): Leaves[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */
  // Get all leave requests
  getAllLeaves(): void {
    this.subs.sink = this.httpClient.get<Leaves[]>(this.API_URL).subscribe({
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

  addLeaves(leaveData: any): Observable<any> {
    return this.httpClient.post(`${this.API_URL}`, leaveData);
  }

  addMyLeave(leaveData: any): Observable<any> {
    return this.httpClient.post(`${environment.apiUrl}/myleave`, leaveData);
  }

  updateLeaves(id: number, leaveData: any): Observable<any> {
    return this.httpClient.put(`${this.API_URL}/${id}`, leaveData);
  }

  // Delete a leave request
  deleteLeaves(id: number): void {
    this.subs.sink = this.httpClient.delete(`${this.API_URL}/${id}`).subscribe({
      next: () => {
        console.log(`Leave request with ID ${id} deleted`);
        this.getAllLeaves();
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error deleting leave request:', error);
      },
    });
  }

  checkLeaveDateOverlap(employeeId: number, startDate: string, endDate: string, leaveId?: number) {
    const params: any = {
      employee_id: employeeId,
      start_date: startDate,
      end_date: endDate
    };

    if (leaveId) {
      params.leaveId = leaveId;
    }

    return this.httpClient.get<{ overlap: boolean; overlappingLeaves: Leaves[] }>(`${this.API_URL}/check-overlap`, { params });
  }

  getTodayLeaves(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}`);
  }

  getLeavesByEmployee(employeeId: number): Observable<Leaves[]> {
    return this.httpClient.get<Leaves[]>(`${this.API_URL}/${employeeId}`);
  }

  // Loads only this employee's leaves into dataChange (for BA/BDE/Employee view)
  getMyLeaves(employeeId: number): void {
    this.subs.sink = this.httpClient.get<Leaves[]>(`${this.API_URL}/${employeeId}`).subscribe({
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
}
