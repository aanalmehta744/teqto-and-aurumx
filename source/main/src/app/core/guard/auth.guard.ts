// import { Injectable } from '@angular/core';
// import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

// import { AuthService } from '../service/auth.service';

// @Injectable({
//   providedIn: 'root',
// })
// export class AuthGuard  {
//   constructor(private authService: AuthService, private router: Router) {}

//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
//     if (this.authService.currentUserValue) {
//       const userRole = this.authService.currentUserValue.role;
//       if (route.data['role'] && route.data['role'].indexOf(userRole) === -1) {
//         this.router.navigate(['/authentication/login']);
//         return false;
//       }
//       return true;
//     }

//     this.router.navigate(['/authentication/login']);
//     return false;
//   }
// }

import { Injectable } from '@angular/core';
import {
  Router,
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
} from '@angular/router';

import { AuthService } from '../service/auth.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ) {
    const currentUser = this.authService.currentUserValue;

    if (!currentUser) {
      this.router.navigate(['/authentication/login']);
      return false;
    }

    const userRole = currentUser.role;
    const userDepartment = currentUser.department;

    // Get allowed roles from route
    const allowedRoles = route.data['role'];

    // Get allowed departments from route
    const allowedDepartments = route.data['department'];

    // Check role access
    const hasRoleAccess =
      !allowedRoles ||
      allowedRoles.length === 0 ||
      allowedRoles.includes(userRole);

    // Check department access
    const hasDepartmentAccess =
      !allowedDepartments ||
      allowedDepartments.length === 0 ||
      allowedDepartments.includes(userDepartment);

    /*
     * HR department employees can access Admin attendance
     * and leave management pages.
     */
    const isHR =
      userRole === 'Employee' &&
      userDepartment === 'HR';

    const isAttendanceRoute =
      state.url.includes('/admin/attendance');

    const isLeaveRoute =
      state.url.includes('/admin/leaves');

    if (isHR && (isAttendanceRoute || isLeaveRoute)) {
      return true;
    }

    // Normal role-based access
    if (!hasRoleAccess) {
      this.router.navigate(['/authentication/login']);
      return false;
    }

    // Department-based access
    if (allowedDepartments && !hasDepartmentAccess) {
      this.router.navigate(['/authentication/login']);
      return false;
    }

    return true;
  }
}