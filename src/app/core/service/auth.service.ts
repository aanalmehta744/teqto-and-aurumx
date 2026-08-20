// import { Injectable } from '@angular/core';
// import { HttpClient, HttpHeaders } from '@angular/common/http';
// import { BehaviorSubject, Observable, throwError, of } from 'rxjs';
// import { catchError, tap } from 'rxjs/operators';
// import { environment } from 'environments/environment';
// import { User } from '../models/user';  // Update path as needed
// import { Role } from '@core/models/role';

// interface LogoutResponse {
//   success: boolean;
// }

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthService {
//   private currentUserSubject: BehaviorSubject<User | null>;
//   public currentUser: Observable<User | null>;
//   private apiUrl = `${environment.apiUrl}/authentication`;
//   // Define your API URL here

//   constructor(private http: HttpClient) {
//     // Initialize the current user from localStorage if available
//     this.currentUserSubject = new BehaviorSubject<User | null>(
//       JSON.parse(localStorage.getItem('currentUser') || 'null')
//     );
//     this.currentUser = this.currentUserSubject.asObservable();
//   }

//   // Getter for the current logged-in user
//   public get currentUserValue(): User | null {

//     return this.currentUserSubject.value;

//   }
//   getLoggedUser() {
//     return this.currentUserSubject.value;
//   }
//   // To login and get the token and user details from the backend
//   // login(username: string, password: string, role: string): Observable<any> {
//   //   const loginData = { username, password, role };
//   //   console.log("Login Data", loginData);

//   //   return this.http.post<any>(`${this.apiUrl}/login`, loginData).pipe(
//   //     catchError((error) => {
//   //       return throwError(error); // Return error if login fails
//   //     }),
//   //     tap((res) => {
//   //       if (res && res.token && res.user) {  // Ensure response contains user data
//   //         this.setUserData(res.user, res.token);
//   //         console.log("User data stored:", res.user);
//   //       } else {
//   //         console.error("Invalid response from server:", res);
//   //       }
//   //     })
//   //   );
//   // }
// login(username: string, password: string): Observable<any> {
//   const loginData = { username, password };

//   console.log('Login Data', loginData);

//   return this.http.post<any>(
//     `${this.apiUrl}/login`,
//     loginData
//   ).pipe(
//     catchError((error) => {
//       return throwError(() => error);
//     }),
//     tap((res) => {
//       if (res && res.token && res.user) {
//         this.setUserData(res.user, res.token);
//         console.log('User data stored:', res.user);
//       } else {
//         console.error('Invalid response from server:', res);
//       }
//     })
//   );
// }

//   // Store user data and JWT in localStorage or sessionStorage
//   setUserData(user: User, token: string): void {
//     localStorage.setItem('authToken', token);
//     localStorage.setItem('currentUser', JSON.stringify(user));
//     this.currentUserSubject.next(user);
//   }

//   // Retrieve JWT from storage
//   getToken(): string | null {
//     return localStorage.getItem('authToken');
//   }

//   // To logout and clear the session
//   logout(): void {
//     localStorage.removeItem('authToken');
//     localStorage.removeItem('currentUser');
//     this.currentUserSubject.next(null);
//     console.log('User logged out successfully');
//   }



//   // Use the token for making authenticated API calls
//   getAuthHeaders(): HttpHeaders {
//     const token = this.getToken();
//     let headers = new HttpHeaders();
//     if (token) {
//       headers = headers.set('Authorization', 'Bearer ' + token);
//     }
//     return headers;
//   }
//   sendPasswordResetEmail(email: string): Observable<{ message: string }> {
//     return this.http.post<{ message: string }>(
//       `${this.apiUrl}/forgot-password`,
//       { email }
//     );
//   }

//   /** Reset Password: Update password using token */
//   resetPassword(token: string, password: string): Observable<any> {
//     return this.http.post(`${this.apiUrl}/reset-password`, { token, password });
//   }
// }

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from 'environments/environment';
import { User } from '../models/user';

interface LogoutResponse {
  success: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private currentUserSubject: BehaviorSubject<User | null>;

  public currentUser: Observable<User | null>;

  private apiUrl = `${environment.apiUrl}/authentication`;

  constructor(private http: HttpClient) {

    this.currentUserSubject =
      new BehaviorSubject<User | null>(
        JSON.parse(
          localStorage.getItem('currentUser') || 'null'
        )
      );

    this.currentUser =
      this.currentUserSubject.asObservable();
  }

  // ==========================================
  // CURRENT USER
  // ==========================================

  public get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  getLoggedUser(): User | null {
    return this.currentUserSubject.value;
  }

  // ==========================================
  // LOGIN
  // ==========================================

login(username: string, password: string): Observable<any> {
  const loginData = { username, password };

  console.log('Login Data', loginData);

  return this.http.post<any>(`${this.apiUrl}/login`, loginData).pipe(
    catchError((error) => {
      return throwError(error);
    }),
    tap((res) => {
      if (res && res.token && res.user) {
        this.setUserData(res.user, res.token);
        console.log('User data stored:', res.user);
      } else {
        console.error('Invalid response from server:', res);
      }
    })
  );
}

  // ==========================================
  // STORE USER DATA
  // ==========================================

  setUserData(
    user: User,
    token: string
  ): void {

    localStorage.setItem(
      'authToken',
      token
    );

    localStorage.setItem(
      'currentUser',
      JSON.stringify(user)
    );

    this.currentUserSubject.next(user);

    console.log(
      'User data stored successfully'
    );
  }

  // ==========================================
  // GET TOKEN
  // ==========================================

  getToken(): string | null {

    return localStorage.getItem(
      'authToken'
    );

  }

  // ==========================================
  // LOGOUT
  // ==========================================

  logout(): void {

    localStorage.removeItem(
      'authToken'
    );

    localStorage.removeItem(
      'currentUser'
    );

    this.currentUserSubject.next(
      null
    );

    console.log(
      'User logged out successfully'
    );

  }

  // ==========================================
  // AUTH HEADERS
  // ==========================================

  getAuthHeaders(): HttpHeaders {

    const token =
      this.getToken();

    let headers =
      new HttpHeaders();

    if (token) {

      headers =
        headers.set(
          'Authorization',
          'Bearer ' + token
        );

    }

    return headers;
  }

  // ==========================================
  // FORGOT PASSWORD
  // ==========================================

  sendPasswordResetEmail(
    email: string
  ): Observable<{ message: string }> {

    return this.http.post<{ message: string }>(
      `${this.apiUrl}/forgot-password`,
      { email }
    );

  }

  // ==========================================
  // RESET PASSWORD
  // ==========================================

  resetPassword(
    token: string,
    password: string
  ): Observable<any> {

    return this.http.post(
      `${this.apiUrl}/reset-password`,
      {
        token,
        password
      }
    );

  }

}