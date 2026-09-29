import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';

export interface Department { id: number; name: string; employee_count?: number; employee_names?: string | null; created_at?: string; updated_at?: string; }

@Injectable({ providedIn: 'root' })
export class DepartmentsService {
  private apiUrl = `${environment.apiUrl}/departments`;
  constructor(private http: HttpClient) {}
  getAll(): Observable<Department[]> { return this.http.get<Department[]>(this.apiUrl); }
  create(name: string): Observable<Department> { return this.http.post<Department>(this.apiUrl, { name }); }
  update(id: number, name: string): Observable<Department> { return this.http.put<Department>(`${this.apiUrl}/${id}`, { name }); }
  delete(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/${id}`); }
}
