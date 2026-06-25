import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Candidates } from './candidates.model';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class CandidatesService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/candidate`;
  // private readonly API_URL = 'assets/data/candidates.json';
  isTblLoading = true;
  dataChange: BehaviorSubject<Candidates[]> = new BehaviorSubject<Candidates[]>([]);
  dialogData!: Candidates;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): Candidates[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */
getAllCandidates(): Observable<Candidates[]> {
  return this.httpClient.get<Candidates[]>(this.API_URL);
}


  addCandidates(formData: FormData): Observable<Candidates> {
    // No need to set Content-Type header; browser sets it automatically with FormData
    return this.httpClient.post<Candidates>(this.API_URL, formData);
  }

  updateCandidate(formData: FormData): Observable<Candidates> {
    const id = formData.get('id');
    if (!id) throw new Error('Candidate id is missing in formData');

    return this.httpClient.put<Candidates>(`${this.API_URL}/${id}`, formData);
  }

  deleteCandidates(id: number): Observable<any> {
    return this.httpClient.delete(`${this.API_URL}/${id}`);
  }
  getCandidateById(id: number): Observable<any> {
    return this.httpClient.get(`${this.API_URL}/${id}`);
  }
}
