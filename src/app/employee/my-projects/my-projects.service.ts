import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { MyProjects } from './my-projects.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { catchError, tap } from 'rxjs/operators';
import { of } from 'rxjs';
@Injectable({
  providedIn: 'root',
})
export class MyProjectsService extends UnsubscribeOnDestroyAdapter {
  private readonly API_URL = `${environment.apiUrl}/projects`;
  isTblLoading = true;
  dataChange: BehaviorSubject<MyProjects[]> = new BehaviorSubject<MyProjects[]>(
    []
  );
  // Temporarily stores data from dialogs
  dialogData!: MyProjects;
  constructor(private httpClient: HttpClient) {
    super();
  }
  get data(): MyProjects[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  /** CRUD METHODS */
 getAllMyProjectss(): Observable<MyProjects[]> {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const currentUserId = currentUser.id;

  if (!currentUserId) {
    console.error('No logged-in user found.');
    return of([]); // Return empty observable array if no user found
  }

  const apiUrlWithUserId = `${this.API_URL}/myproject/${currentUserId}`;
  return this.httpClient.get<MyProjects[]>(apiUrlWithUserId).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Error fetching projects:', error.message);
      return of([]); // Return empty array on error
    })
  );
}


  getProjectTeam(): Observable<any[]> {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const currentUserId = currentUser.id;

    if (!currentUserId) {
      console.error('No logged-in user found.');
      return new Observable<any[]>(); // Return an empty observable if no user ID is found
    }

    const apiUrlWithUserId = `${this.API_URL}/my-team/${currentUserId}`;
    
    return this.httpClient.get<any[]>(apiUrlWithUserId); // Ensure this returns an observable
  }
  getallProjectTeam(): Observable<any[]> {
    const apiUrlWithUserId = `${this.API_URL}/team-details`;
    
    return this.httpClient.get<any[]>(apiUrlWithUserId); // Ensure this returns an observable
  }
  addMyProjects(myProjects: MyProjects): void {
    this.dialogData = myProjects;

    // this.httpClient.post(this.API_URL, myProjects)
    //   .subscribe({
    //     next: (data) => {
    //       this.dialogData = myProjects;
    //     },
    //     error: (error: HttpErrorResponse) => {
    //        // error code here
    //     },
    //   });
  }
  updateMyProjects(myProjects: MyProjects): void {
    this.dialogData = myProjects;
    // this.httpClient.put(this.API_URL + myProjects.id, myProjects)
    //     .subscribe({
    //       next: (data) => {
    //         this.dialogData = myProjects;
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
  deleteMyProjects(id: number): void {
    console.log(id);

    // this.httpClient.delete(this.API_URL + id)
    //     .subscribe({
    //       next: (data) => {
    //         console.log(id);
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
  getProjectsByEmployeeId(employeeId: number): Observable<any[]> {
    return this.httpClient.get<any[]>(`${this.API_URL}/myproject/${employeeId}`);
  }
  
}
