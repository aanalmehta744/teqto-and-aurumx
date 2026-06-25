import { Injectable } from '@angular/core';
import { BehaviorSubject,Observable } from 'rxjs';
import { JobsList } from './jobs-list.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class JobsListService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/jobs`;
  isTblLoading = true;
  dataChange: BehaviorSubject<JobsList[]> = new BehaviorSubject<JobsList[]>([]);
  dialogData!: JobsList;

  constructor(private httpClient: HttpClient) {
    super();
  }

  get data(): JobsList[] {
    return this.dataChange.value;
  }

  getDialogData() {
    return this.dialogData;
  }

  /** CRUD METHODS */

 getAllJobsLists(): Observable<JobsList[]> {
  this.isTblLoading = true;
  return this.httpClient.get<JobsList[]>(this.API_URL).pipe(
    map((data) => {
      this.isTblLoading = false;
      this.dataChange.next(data);
      return data;
    }),
    // Optionally handle error here if you want
  );
}

  addJobsList(jobsList: JobsList) {
    this.dialogData = jobsList;
    return this.httpClient.post<JobsList>(this.API_URL, jobsList);
  }

  updateJobsList(jobsList: JobsList) {
    this.dialogData = jobsList;
    return this.httpClient.put<JobsList>(`${this.API_URL}/${jobsList.id}`, jobsList);
  }

  deleteJobsList(id: number) {
    return this.httpClient.delete(`${this.API_URL}/${id}`);
  }
}
