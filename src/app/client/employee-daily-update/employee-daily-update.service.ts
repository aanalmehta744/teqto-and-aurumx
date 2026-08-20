import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeeDailyUpdateService {
  private readonly API_URL = `${environment.apiUrl}/dailyUpdates`;

  constructor(private http: HttpClient) { }

  getAllUpdates(): Observable<any[]> {
    return this.http.get<any[]>(this.API_URL);
  }

  // Get daily updates by employeeId and optional date
  getUpdates(employeeId: number): Observable<any[]> {
    let params = new HttpParams().set('employeeId', employeeId.toString());
    // if (date) {
    //   params = params.set('date', date);
    // }
    return this.http.get<any[]>(this.API_URL, { params });
  }

  // Add a new update
  addUpdate(data: any): Observable<any> {
    return this.http.post(this.API_URL, data);
  }

  // Update an existing update by ID
  updateDailyUpdate(id: number, data: any): Observable<any> {
    return this.http.put(`${this.API_URL}/${id}`, data);
  }

  // Delete an update by ID
  deleteUpdate(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
