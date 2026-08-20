import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { MyTasks } from './all-tasks.model';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { environment } from 'environments/environment';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AllTasksService extends UnsubscribeOnDestroyAdapter {
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
    return this.httpClient.get<MyTasks[]>(this.API_URL).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error fetching tasks:', error.message);
        return of([]); // Return empty array on error
      })
    );
  }



  addMyTasks(myTasks: any): Observable<any> {
    this.dialogData = myTasks;
    return this.httpClient.post(this.API_URL, myTasks).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error adding task:', error.message);
        return of(null);
      })
    );
  }

  updateMyTasks(myTasks: MyTasks): Observable<any> {
    this.dialogData = myTasks;
    return this.httpClient.put(`${this.API_URL}/${myTasks.id}`, myTasks).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error updating task:', error.message);
        return of(null);
      })
    );
  }

  deleteMyTasks(id: number): Observable<any> {
    return this.httpClient.delete(`${this.API_URL}/${id}`).pipe(
      catchError((error: HttpErrorResponse) => {
        console.error('Error deleting task:', error.message);
        return of(null);
      })
    );
  }
}
