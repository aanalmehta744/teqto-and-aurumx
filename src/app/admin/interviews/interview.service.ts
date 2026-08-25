import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from 'environments/environment';

import {
  Interview
} from './interview.model';


@Injectable({
  providedIn: 'root'
})
export class InterviewService {

  private apiUrl =
    `${environment.apiUrl}/interviews`;


  constructor(
    private http: HttpClient
  ) {}


  // =====================================================
  // GET ALL INTERVIEWS
  // =====================================================

  getAllInterviews():
    Observable<Interview[]> {

    return this.http.get<Interview[]>(
      this.apiUrl
    );

  }


  // =====================================================
  // GET SINGLE INTERVIEW
  // =====================================================

  getInterview(
    id: number
  ): Observable<Interview> {

    return this.http.get<Interview>(
      `${this.apiUrl}/${id}`
    );

  }


  // =====================================================
  // CREATE INTERVIEW
  // =====================================================

  createInterview(
    data: Partial<Interview>
  ): Observable<any> {

    return this.http.post(
      this.apiUrl,
      data
    );

  }


  // =====================================================
  // UPDATE INTERVIEW
  // =====================================================

  updateInterview(
    id: number,
    data: Partial<Interview>
  ): Observable<any> {

    return this.http.put(
      `${this.apiUrl}/${id}`,
      data
    );

  }


  // =====================================================
  // DELETE INTERVIEW
  // =====================================================

  deleteInterview(
    id: number
  ): Observable<any> {

    return this.http.delete(
      `${this.apiUrl}/${id}`
    );

  }

}