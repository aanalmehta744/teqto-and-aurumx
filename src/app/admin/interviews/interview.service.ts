import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'environments/environment';

import {
  Interview,
  InterviewRound,
  AssignedRound,
  SeniorDeveloper
} from './interview.model';


@Injectable({
  providedIn: 'root'
})
export class InterviewService {

  private apiUrl = `${environment.apiUrl}/interviews`;

  constructor(private http: HttpClient) {}


  // =====================================================
  // INTERVIEWS
  // =====================================================

  getAllInterviews(): Observable<Interview[]> {
    return this.http.get<Interview[]>(this.apiUrl);
  }

  getInterview(id: number): Observable<Interview> {
    return this.http.get<Interview>(`${this.apiUrl}/${id}`);
  }

  createInterview(data: Partial<Interview> | FormData): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateInterview(
    id: number,
    data: Partial<Interview> | FormData
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteInterview(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }


  // =====================================================
  // FINAL (CEO) DECISION — Admin + HR
  // =====================================================

  setFinalDecision(
    id: number,
    data: { final_call_status: string; final_call_notes?: string | null }
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}/final-decision`, data);
  }


  // =====================================================
  // ROUNDS
  // =====================================================

  assignRound(
    interviewId: number,
    data: Partial<InterviewRound>
  ): Observable<any> {
    return this.http.post(`${this.apiUrl}/${interviewId}/rounds`, data);
  }

  updateRound(
    roundId: number,
    data: Partial<InterviewRound>
  ): Observable<any> {
    return this.http.put(`${this.apiUrl}/rounds/${roundId}`, data);
  }

  deleteRound(roundId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/rounds/${roundId}`);
  }


  // Rounds assigned to the logged-in user (senior developer card).
  getAssignedRounds(): Observable<AssignedRound[]> {
    return this.http.get<AssignedRound[]>(`${this.apiUrl}/assigned/mine`);
  }


  // =====================================================
  // META
  // =====================================================

  getSeniorDevelopers(): Observable<SeniorDeveloper[]> {
    return this.http.get<SeniorDeveloper[]>(
      `${this.apiUrl}/meta/senior-developers`
    );
  }

  // Departments power the "Profile" dropdown.
  getDepartments(): Observable<any[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/departments`);
  }

}
