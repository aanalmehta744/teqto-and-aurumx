import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AllHoliday } from './all-holidays.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class HolidayService extends UnsubscribeOnDestroyAdapter {
  private API_URL = `${environment.apiUrl}/holidays`;
  isTblLoading = true;
  dataChange: BehaviorSubject<AllHoliday[]> = new BehaviorSubject<AllHoliday[]>([]);

  // Temporarily stores data from dialogs
  dialogData!: AllHoliday;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): AllHoliday[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */

  // Fetch all holidays
  getAllHolidays(): Observable<AllHoliday[]> {
    return this.httpClient.get<AllHoliday[]>(this.API_URL); // Directly return the observable
  }


  // Add a new holiday
  addHoliday(holiday: AllHoliday): Observable<AllHoliday> {
    return this.httpClient.post<AllHoliday>(this.API_URL, holiday);
  }

  // Update an existing holiday
  updateHoliday(id: number, holiday: AllHoliday): Observable<AllHoliday> {
    return this.httpClient.put<AllHoliday>(`${this.API_URL}/${id}`, holiday);
  }

  // Delete a holiday
  deleteHoliday(id: number): Observable<void> {
    return this.httpClient.delete<void>(`${this.API_URL}/${id}`);
  }
}
