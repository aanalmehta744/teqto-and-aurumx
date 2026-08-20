import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MyLeaves } from './my-leaves.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { Observable } from 'rxjs';
import { throwError } from 'rxjs';
import { environment } from 'environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class MyLeavesService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/leaveRequests`;
  isTblLoading = true;
  dataChange: BehaviorSubject<MyLeaves[]> = new BehaviorSubject<MyLeaves[]>([]);
  dialogData!: MyLeaves;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): MyLeaves[] {
    return this.dataChange.value;
  }

  getDialogData(): MyLeaves {
    return this.dialogData;
  }

  /** CRUD METHODS */
  getAllMyLeaves(): Observable<MyLeaves[]> {
    this.isTblLoading = true;

    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;

    if (!employeeId) {
      console.error('User not logged in or user ID is missing.');
      this.isTblLoading = false;
      return of([]);
    }

    const url = `${this.API_URL}/${employeeId}`;

    return this.httpClient.get<MyLeaves[]>(url).pipe(
      tap((response) => {
        console.log('Leaves API response:', response);
        this.dataChange.next(response); // ✅ Add this line
        this.isTblLoading = false;
      }),
      catchError((error: HttpErrorResponse) => {
        this.isTblLoading = false;
        console.error('Error fetching leaves:', error.message);
        this.dataChange.next([]); // ✅ Optional: push empty list on error
        return of([]);
      })
    );
  }


  addMyLeaves(myLeaves: any): Observable<any> {
    // Return the observable from the HTTP request
    return this.httpClient.post<MyLeaves>(this.API_URL, myLeaves).pipe(
      tap((data) => {
        // You can update dialogData if necessary, but it's better to keep it outside this method
        this.dialogData = data; // If needed to store it globally within the service
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error adding leave:', error.message);
        return throwError(error); // Return error for the component to handle
      })
    );
  }


  updateMyLeaves(myLeaves: any): Observable<any> {
    this.dialogData = myLeaves;
    const url = `${this.API_URL}/${myLeaves.id}`;

    // Return the Observable directly
    return this.httpClient.put<MyLeaves>(url, myLeaves).pipe(
      tap((data) => {
        this.dialogData = data;
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating leave:', error.message);
        return throwError(() => error); // Ensure to return an observable
      })
    );
  }


  deleteMyLeaves(id: number): void {
    const url = `${this.API_URL}/${id}`;
    this.subs.sink = this.httpClient.delete(url).subscribe({
      next: () => {
        console.log(`Deleted leave with id ${id}`);
      },
      error: (error: HttpErrorResponse) => {
        console.error('Error deleting leave:', error.message);
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

    return this.httpClient.get<{ overlap: boolean }>(`${this.API_URL}/check-overlap`, { params });
  }


  getLeaveRecords(employeeId: number): Observable<MyLeaves[]> {
    const url = `${this.API_URL}/${employeeId}`; // Assuming the API endpoint for leave records
    return this.httpClient.get<MyLeaves[]>(url).pipe(
      tap((data) => {

        // Optionally handle the response, such as updating dataChange if needed
        this.dataChange.next(data);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching leave records:', error.message);
        return throwError(() => error); // Return observable so that components can handle errors
      })
    );
  }
  getLeavesByEmployee(employeeId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}/${employeeId}`);
  }
}

