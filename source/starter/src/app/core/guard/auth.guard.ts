import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const currentUser = this.authService.currentUserValue
      || JSON.parse(localStorage.getItem('currentUser') || 'null');

    if (!currentUser) {
      this.router.navigate(['/authentication/signin']);
      return false;
    }

    const userRole = currentUser.role;
    const allowedRoles = route.data['role'];

    if (allowedRoles) {
      // allowedRoles can be a string or an array
      const rolesArray: string[] = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

      if (!rolesArray.includes(userRole)) {
        this.router.navigate(['/authentication/signin']);
        return false;
      }
    }

    return true;
  }
}
