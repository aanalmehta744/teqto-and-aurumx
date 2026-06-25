import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'environments/environment';
export interface Interview {
  id?: number;
  candidate_id: number;
  job_id: number;
  interview_date: string;   // ISO date string
  interview_time: string;   // HH:mm
  interviewer?: string;
  mode?: string;            // Online / Offline
  status?: string;          // Scheduled / Completed / Cancelled
  notes?: string;
}

@Injectable({
  providedIn: 'root'
})
export class InterviewService {
  private readonly API_URL = `${environment.apiUrl}/interviews`;

  constructor(private http: HttpClient) { }

  // Get all interviews
  getInterviews(): Observable<Interview[]> {
    return this.http.get<Interview[]>(this.API_URL);
  }

  // Get interview by ID
  getInterviewById(id: number): Observable<Interview> {
    return this.http.get<Interview>(`${this.API_URL}/${id}`);
  }

  // Get interviews by Candidate
  getInterviewsByCandidate(candidateId: number): Observable<Interview[]> {
    return this.http.get<Interview[]>(`${this.API_URL}/candidate/${candidateId}`);
  }

  // Get interviews by Job
  getInterviewsByJob(jobId: number): Observable<Interview[]> {
    return this.http.get<Interview[]>(`${this.API_URL}/job/${jobId}`);
  }

  // Create interview
  createInterview(interview: Interview): Observable<Interview> {
    return this.http.post<Interview>(this.API_URL, interview);
  }

  // Update interview
  updateInterview(id: number, interview: Interview): Observable<Interview> {
    return this.http.put<Interview>(`${this.API_URL}/${id}`, interview);
  }

  // Delete interview
  deleteInterview(id: number): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`);
  }
}
