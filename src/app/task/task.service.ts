import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Task } from './task.model';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root'
})
export class TaskService {

  private API_URL = `${environment.apiUrl}/tasks`;

  constructor(private http: HttpClient) {}

  // Get all tasks
  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.API_URL);
  }

  // Get a single task by ID
  getTaskById(id: number): Observable<Task> {
    return this.http.get<Task>(`${this.API_URL}/${id}`);
  }

  // Create a new task
  addTask(task: Task): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(this.API_URL, task);
  }

  // Update an existing task
  updateTask(id: number, task: Task): Observable<{ message: string }> {
    return this.http.put<{ message: string }>(`${this.API_URL}/${id}`, task);
  }

  // Delete a task by ID
  deleteTask(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.API_URL}/${id}`);
  }

}
