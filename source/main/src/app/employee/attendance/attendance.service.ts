import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { Attendances } from './attendance.model';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class AttendancesService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/attendances`;

  isTblLoading = true;
  dataChange: BehaviorSubject<Attendances[]> = new BehaviorSubject<Attendances[]>([]);
  dialogData!: Attendances;

  private timerSubject = new BehaviorSubject<string>('00:00:00'); // initial value
  timer$ = this.timerSubject.asObservable();

  constructor(private httpClient: HttpClient) {
    super();
  }

  // Getter to access data from BehaviorSubject
  get data(): Attendances[] {
    return this.dataChange.value;
  }

  // Returns dialog data
  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */

  // Get all attendance records for an employee
  // attendances.service.ts
  getAllAttendancess(employeeId: number): Observable<any[]> {
    return this.httpClient.get<Attendances[]>(`${this.API_URL}/${employeeId}`);
  }

  getEmployeeAttendance(): Observable<any[]> {
    this.isTblLoading = true;
    return this.httpClient.get<any[]>(`${this.API_URL}/employee-attendance`).pipe(
      tap(data => {
        this.isTblLoading = false;

        this.dataChange.next(data);
      }),
      catchError(err => {
        this.isTblLoading = false;
        console.error('Error loading employee attendance:', err);
        return throwError(() => err);
      })
    );
  }


  // getAllAttendancess(employeeId: number): Observable<any[]> {
  //   return this.httpClient.get<any[]>(`${this.API_URL}/${employeeId}`);
  // }


  // Add a new attendance record
  addAttendances(attendances: Attendances): void {
    this.dialogData = attendances;

    // Uncomment and implement the POST request if needed
    // this.httpClient.post(this.API_URL, attendances).subscribe({
    //   next: (data) => {
    //     this.dialogData = attendances; // Update dialogData after adding
    //   },
    //   error: (error: HttpErrorResponse) => {
    //     console.error('Error adding attendance:', error.message);
    //   },
    // });
  }

  // Update an attendance record
  updateAttendances(attendances: Attendances): void {
    this.dialogData = attendances;

    // Uncomment and implement the PUT request if needed
    // this.httpClient.put(`${this.API_URL}/${attendances.id}`, attendances).subscribe({
    //   next: (data) => {
    //     this.dialogData = attendances; // Update dialogData after updating
    //   },
    //   error: (error: HttpErrorResponse) => {
    //     console.error('Error updating attendance:', error.message);
    //   },
    // });
  }

  // Delete an attendance record
  deleteAttendances(id: number): void {
    console.log('Deleting attendance record with ID:', id);

    // Uncomment and implement the DELETE request if needed
    // this.httpClient.delete(`${this.API_URL}/${id}`).subscribe({
    //   next: (data) => {
    //     console.log('Attendance record deleted successfully');
    //   },
    //   error: (error: HttpErrorResponse) => {
    //     console.error('Error deleting attendance:', error.message);
    //   },
    // });
  }

  // Start the attendance timer
  startTimer(employeeId: number): Observable<any> {
    return this.httpClient.post(`${this.API_URL}/start-timer`, { employee_id: employeeId });
  }

  // Stop the attendance timer
  // stopTimer(employeeId: number, startDate: Date): Observable<any> {
  //   return this.httpClient.put(`${this.API_URL}/stop-timer`, { employee_id: employeeId, startDate });
  // }
  // Stop the attendance timer
  stopTimer(employeeId: number) {
    return this.httpClient.post(`${this.API_URL}/stop-timer`, { employee_id: employeeId });
  }

  // Fetch attendance records for a specific employee
  getAttendanceRecords(employeeId: number): Observable<any[]> {
    this.isTblLoading = true; // Set loading state to true
    return this.httpClient.get<any[]>(`${this.API_URL}/${employeeId}`);
  }

  getActiveAttendance(employeeId: number): Observable<{ success: boolean, data: Attendances[] }> {
    this.isTblLoading = true;
    return this.httpClient.get<{ success: boolean, data: Attendances[] }>(
      `${this.API_URL}/active/${employeeId}`
    );
  }

  // Add break
  addBreak(employeeId: number, breakDuration: string, startDate: string) {
    return this.httpClient.post<{ message: string }>(
      `${this.API_URL}/add-break`,
      { employeeId, breakDuration, startDate }
    );
  }
  // attendance.service.ts
  checkUserCheckedIn(userId: string, date: string) {
    return this.httpClient.get<{ hasCheckedIn: boolean }>(`${this.API_URL}/check/${userId}?date=${date}`);
  }

  // Pause timer
  pauseTimer(employeeId: number, pauseStart: string, is_paused: boolean, reason?: string) {
    return this.httpClient.post(`${this.API_URL}/pause-timer`, { employeeId, pauseStart, is_paused, reason:reason || '' });
  }

  // Resume timer
  resumeTimer(employeeId: number, pauseStart: number) {
    return this.httpClient.post(`${this.API_URL}/resume-timer`, { employeeId, pauseStart });
  }

  checkPauseStatus(employeeId: number): Observable<any> {
    return this.httpClient.get<{ is_paused: number }>(
      `${this.API_URL}/pause-status/${employeeId}`
    );
  }
  // checkUserCheckedIn(employeeId: number, date: string): Observable<{ hasCheckedIn: boolean }> {
  //   return this.http.get<{ hasCheckedIn: boolean }>(
  //     `${this.API_URL}/check/${employeeId}?date=${date}`
  //   );
  // }

  checkUserCheckedOut(employeeId: number, date: string): Observable<{ hasCheckedOut: boolean }> {
    return this.httpClient.get<{ hasCheckedOut: boolean }>(
      `${this.API_URL}/checkout-status/${employeeId}?date=${date}`
    );
  }
  updateTimer(value: string) {
    this.timerSubject.next(value);
  }
// Get pause history for a particular attendance record
getPauseHistory(attendanceId: number): Observable<any[]> {
  return this.httpClient.get<any[]>(
    `${environment.apiUrl}/todayattendances/pause-history/${attendanceId}`
  );
}

}
