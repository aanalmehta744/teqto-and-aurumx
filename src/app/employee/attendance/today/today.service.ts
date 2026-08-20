// import { Injectable } from '@angular/core';
// import { BehaviorSubject } from 'rxjs';
// import { Today } from './today.model';
// import { HttpClient, HttpErrorResponse } from '@angular/common/http';
// import { UnsubscribeOnDestroyAdapter } from '@shared';
// import { environment } from 'environments/environment';
// import { Observable } from 'rxjs';
// @Injectable({
//   providedIn: 'root',
// })
// export class TodayService extends UnsubscribeOnDestroyAdapter {
//   private API_URL = `${environment.apiUrl}/todayattendances`;
//   private API_URL_A = `${environment.apiUrl}/attendances`;

//   isTblLoading = true;
//   dataChange: BehaviorSubject<Today[]> = new BehaviorSubject<Today[]>([]);
//   // Temporarily stores data from dialogs
//   dialogData!: Today;
//   constructor(private httpClient: HttpClient) {
//     super();
//   }
//   get data(): Today[] {
//     return this.dataChange.value;
//   }
//   getDialogData() {
//     return this.dialogData;
//   }
//   /** CRUD METHODS */
//   getAllTodays(): void {
//     this.subs.sink = this.httpClient.get<Today[]>(`${this.API_URL}/today`).subscribe({
//       next: (data) => {
//         this.isTblLoading = false;
//         this.dataChange.next(data);
//         console.log(data);
//       },
//       error: (error: HttpErrorResponse) => {
//         this.isTblLoading = false;
//         console.log(error.name + ' ' + error.message);
//       },
//     });
//   }
//   getTodayAttendacves(): Observable<any[]> {
//     // Make sure to send 'from' and 'to' as query parameters
//     return this.httpClient.get<any[]>(`${this.API_URL}/today`);
//   }
//   // Function to fetch attendance data based on date range
//   getAttendancedateRange(fromDate: string, toDate: string): Observable<any[]> {
//     // Make sure to send 'from' and 'to' as query parameters
//     return this.httpClient.get<any[]>(`${this.API_URL}/searchlist?fromDate=${fromDate}&toDate=${toDate}`);
//   }
//   updateAttendance(id: number, date: string, data: any): Observable<any[]> {
//     return this.httpClient.put<any>(`${this.API_URL_A}/updateTimer/${id}`, data);
//   }

// }

import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { Today } from './today.model';
import { HttpClient } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class TodayService extends UnsubscribeOnDestroyAdapter {

  private API_URL = `${environment.apiUrl}/todayattendances`;
  private API_URL_A = `${environment.apiUrl}/attendances`;

  isTblLoading = true;

  dataChange: BehaviorSubject<Today[]> =
    new BehaviorSubject<Today[]>([]);

  dialogData!: Today;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): Today[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  // Get today's attendance
  getAllTodays(): Observable<Today[]> {
    this.isTblLoading = true;

    return this.httpClient.get<Today[]>(
      `${this.API_URL}/today`
    );
  }

  // Get today's attendance
  getTodayAttendacves(): Observable<any[]> {
    return this.httpClient.get<any[]>(
      `${this.API_URL}/today`
    );
  }

  // Get attendance by date range
  getAttendancedateRange(
    fromDate: string,
    toDate: string
  ): Observable<any[]> {

    return this.httpClient.get<any[]>(
      `${this.API_URL}/searchlist?fromDate=${fromDate}&toDate=${toDate}`
    );
  }

  // Update attendance
  updateAttendance(
    id: number,
    date: string,
    data: any
  ): Observable<any[]> {

    return this.httpClient.put<any>(
      `${this.API_URL_A}/updateTimer/${id}`,
      data
    );
  }


getAllPauseHistory(): Observable<any[]> {
  return this.httpClient.get<any[]>(
    `${this.API_URL}/pause-history-all`
  );
}
  
  // Get complete pause history
  getPauseHistory(attendanceId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(
      `${this.API_URL}/pause-history/${attendanceId}`
    );
  }
}