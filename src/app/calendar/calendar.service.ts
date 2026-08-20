import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { Calendar } from './calendar.model';
import { environment } from 'environments/environment';
@Injectable({
  providedIn: 'root',
})
export class CalendarService {
  private readonly API_URL = `${environment.apiUrl}/calendar`;
  httpOptions = {
    headers: new HttpHeaders({
      'Content-Type': 'application/json',
    }),
  };

  dataChange: BehaviorSubject<Calendar[]> = new BehaviorSubject<Calendar[]>([]);
  dialogData!: Calendar; // temporarily stores data from dialogs

  constructor(private httpClient: HttpClient) { }

  get data(): Calendar[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  getAllCalendars(): Observable<Calendar[]> {
    return this.httpClient
      .get<Calendar[]>(this.API_URL)
      .pipe(catchError(this.errorHandler));
  }



  // ✅ Always store local time as string
  private formatDateToLocal(date: Date): string {
    if (!date) return '';
    const d = new Date(date);
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return (
      d.getFullYear() +
      '-' +
      pad(d.getMonth() + 1) +
      '-' +
      pad(d.getDate()) +
      ' ' +
      pad(d.getHours()) +
      ':' +
      pad(d.getMinutes()) +
      ':' +
      pad(d.getSeconds())
    );
  }

  // ✅ Create or Update Event
  // addUpdateCalendar(event: Calendar): Observable<Calendar> {
  //   this.dialogData = event;
  //   // get logged-in employee ID (assuming stored in localStorage)
  //   const loggedUserString = localStorage.getItem('currentUser');
  //   let employee_id = '';
  //   if (loggedUserString) {
  //     const loggedUser = JSON.parse(loggedUserString);
  //     employee_id = loggedUser.id.toString(); // convert to string if needed
  //   }
  //   const payload = new Calendar({
  //     ...event,
  //     employee_id: employee_id,
  //     start_date: event.start_date
  //       ? this.formatDateToLocal(new Date(event.start_date))
  //       : '',
  //     end_date: event.end_date
  //       ? this.formatDateToLocal(new Date(event.end_date))
  //       : '',
  //     // startDate: event.startDate
  //     //   ? this.formatDateToLocal(new Date(event.startDate))
  //     //   : '',
  //     // endDate: event.endDate
  //     //   ? this.formatDateToLocal(new Date(event.endDate))
  //     //   : '',
  //   });
  //   return event.id
  //     ? this.httpClient.put<Calendar>(`${this.API_URL}/${event.id}`, payload, this.httpOptions)
  //     : this.httpClient.post<Calendar>(this.API_URL, payload, this.httpOptions);
  // }
  // ✅ Add Event
  addCalendar(event: Calendar): Observable<Calendar> {
    this.dialogData = event;

    const loggedUserString = localStorage.getItem('currentUser');
    let employee_id = '';
    if (loggedUserString) {
      const loggedUser = JSON.parse(loggedUserString);
      employee_id = loggedUser.id.toString();
    }

    const payload = new Calendar({
      ...event,
      employee_id: employee_id,
      start_date: event.start_date
        ? this.formatDateToLocal(new Date(event.start_date))
        : '',
      end_date: event.endDate
        ? this.formatDateToLocal(new Date(event.endDate))
        : '',
    });
    return this.httpClient.post<Calendar>(this.API_URL, payload, this.httpOptions);
  }

  // ✅ Edit Event
  editCalendar(event: Calendar): Observable<Calendar> {
    this.dialogData = event;

    const loggedUserString = localStorage.getItem('currentUser');
    let employee_id = '';
    if (loggedUserString) {
      const loggedUser = JSON.parse(loggedUserString);
      employee_id = loggedUser.id.toString();
    }

    const payload = new Calendar({
      ...event,
      employee_id: employee_id,
      start_date: event.start_date
        ? this.formatDateToLocal(new Date(event.start_date))
        : '',
      end_date: event.end_date
        ? this.formatDateToLocal(new Date(event.end_date))
        : '',
    });

    return this.httpClient.put<Calendar>(
      `${this.API_URL}/${event.id}`,
      payload,
      this.httpOptions
    );
  }
  // ✅ Delete Event by object
  deleteCalendar(event: Calendar): Observable<any> {
    return this.httpClient.delete(`${this.API_URL}/${event.id}`);
  }
  private errorHandler(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // client-side error
      errorMessage = error.error.message;
    } else {
      // server-side error
      errorMessage = `Error Code: ${error.status}\nMessage: ${error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => errorMessage);
  }
}
