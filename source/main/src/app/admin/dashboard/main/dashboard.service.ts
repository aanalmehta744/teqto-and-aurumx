import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private API_URL = `${environment.apiUrl}/admindashboard`;

  constructor(private httpClient: HttpClient) { }

  getTodayFollowupsByBDE(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}/today-followups`);
  }
  getAllTeams(): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}/all-teams`);
  }

}
