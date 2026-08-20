import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MyTasks } from './my-tasks.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class MyTasksService extends UnsubscribeOnDestroyAdapter {
  private API_URL = `${environment.apiUrl}/tasks`;
  isTblLoading = true;
  dataChange: BehaviorSubject<MyTasks[]> = new BehaviorSubject<MyTasks[]>([]);
  // Temporarily stores data from dialogs
  dialogData!: MyTasks;
  constructor(private httpClient: HttpClient) {
    super();
  }
  get data(): MyTasks[] {
    return this.dataChange.value;
  }
  getDialogData() {
    return this.dialogData;
  }
  /** CRUD METHODS */
 getAllMyTaskss(): Observable<MyTasks[]> {
  const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  const currentUserId = currentUser.id;

  if (!currentUserId) {
    console.error('No logged-in user found.');
    return of([]); // Return empty observable array if no user found
  }

  const apiUrlWithUserId = `${this.API_URL}/mytask/${currentUserId}`;

  return this.httpClient.get<MyTasks[]>(apiUrlWithUserId).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('Error fetching tasks:', error.message);
      return of([]); // Return empty array on error
    })
  );
}

  
  addMyTasks(myTasks: MyTasks): void {
    this.dialogData = myTasks;

    // this.httpClient.post(this.API_URL, myTasks)
    //   .subscribe({
    //     next: (data) => {
    //       this.dialogData = myTasks;
    //     },
    //     error: (error: HttpErrorResponse) => {
    //        // error code here
    //     },
    //   });
  }
  updateMyTasks(myTasks: MyTasks): void {
    this.dialogData = myTasks;

    // this.httpClient.put(this.API_URL + myTasks.id, myTasks)
    //     .subscribe({
    //       next: (data) => {
    //         this.dialogData = myTasks;
    //       },
    //       error: (error: HttpErrorResponse) => {
    //          // error code here
    //       },
    //     });
  }
  deleteMyTasks(id: number): void {
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
}
