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

  getBdePerformanceSummary(month?: number, year?: number): Observable<any[]> {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    return this.httpClient.get<any[]>(`${this.API_URL}/bde-performance-summary?month=${m}&year=${y}`);
  }

  getBdeKpiAchievement(month?: number, year?: number): Observable<any[]> {
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    return this.httpClient.get<any[]>(`${this.API_URL}/bde-kpi-achievement?month=${m}&year=${y}`);
  }
}
