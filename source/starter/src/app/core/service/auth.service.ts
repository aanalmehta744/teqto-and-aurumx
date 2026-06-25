import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { User } from '../models/user';
import { environment } from 'environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSubject: BehaviorSubject<User | null>;
  public currentUser: Observable<User | null>;
  private apiUrl = `${environment.apiUrl}/authentication`;

  constructor(private http: HttpClient) {
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    // Clear stale sessions that don't have a real employee id (old mock format)
    if (storedUser && !storedUser.id) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('authToken');
    }
    this.currentUserSubject = new BehaviorSubject<User | null>(
      storedUser?.id ? storedUser : null
    );
    this.currentUser = this.currentUserSubject.asObservable();
  }

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  login(username: string, password: string, role?: string): Observable<any> {
    const loginData = { username, password, role: role || '' };
    return this.http.post<any>(`${this.apiUrl}/login`, loginData).pipe(
      catchError((error) => throwError(() => error)),
      tap((res) => {
        if (res && res.token && res.user) {
          this.setUserData(res.user, res.token);
        }
      })
    );
  }

  setUserData(user: User, token: string): void {
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  logout(): Observable<any> {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    return new Observable((obs) => { obs.next({ success: true }); obs.complete(); });
  }
}
