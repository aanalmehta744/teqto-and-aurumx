import { AuthService } from "../service/auth.service";
import { Injectable } from "@angular/core";
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(private authenticationService: AuthService) {}

  intercept(
    request: HttpRequest<any>,
    next: HttpHandler
  ): Observable<HttpEvent<any>> {
    return next.handle(request).pipe(
      catchError((err) => {
        // Auto-logout + reload ONLY for an expired session on an authenticated
        // request. Do NOT reload on the login attempt itself — a failed login
        // (401) should just surface the error and stay on the page.
        const isAuthRequest = request.url.includes('/authentication/');
        const hasToken = !!this.authenticationService.getToken();

        if (err.status === 401 && !isAuthRequest && hasToken) {
          this.authenticationService.logout();
          location.reload();
        }

        const error = err.error?.message || err.error?.error || err.message || err.statusText;
        return throwError(error);
      })
    );
  }
}
