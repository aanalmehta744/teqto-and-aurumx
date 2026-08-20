import { Component, OnInit, ViewEncapsulation } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role, AuthService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

@Component({
  selector: 'app-signin',
  templateUrl: './signin.component.html',
  styleUrls: ['./signin.component.scss'],
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    CommonModule,
  ],
})
export class SigninComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  authForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  error = '';
  hide = true;
  selectedRole = '';
  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private changeDetector: ChangeDetectorRef,
  ) {
    super();
  }

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      role: ['', Validators.required]
    });
  }
  get f() {
    return this.authForm.controls;
  }

  /** Dynamically update the role field */
  setRole(role: string) {
    this.selectedRole = role;
    this.authForm.patchValue({ role: role });
  }
  /** Handle form submission and navigation */
  onSubmit() {
    this.submitted = true;
    this.loading = true;
    this.error = '';

    if (this.authForm.invalid) {
      this.error = 'Username and Password are required!';
      this.loading = false;
      return;
    }

    this.authService
      .login(this.f['username'].value, this.f['password'].value)

      .subscribe(
        (res) => {
          if (res) {
            setTimeout(() => {
              const currentUser = this.authService.currentUserValue;
              console.log("current user value", currentUser);
              // if (currentUser) {
              //   const role = currentUser.role;
              //   console.log("Redirecting, Role:", role); // Debugging
              //   const department = currentUser.department?.toLowerCase();
              //   if (role === Role.Admin) {
              //     this.router.navigate(['/admin/dashboard/main']);
              //   } else if (role === Role.Employee) {
              //     this.router.navigate(['/employee/dashboard']);
              //   } else if (role === Role.BDE) {
              //     this.router.navigate(['/client/dashboard']);
              //   } else if (role === Role.BA) {
              //     this.router.navigate(['/ba/dashboard']);
              //   } else {
              //     this.router.navigate(['/authentication/signin']);
              //   }
              //   this.changeDetector.detectChanges();
              // }
              if (currentUser) {
  const role = currentUser.role;
  const department = currentUser.department?.toLowerCase();

  if (role === Role.All || role === Role.Admin) {
    this.router.navigate(['/admin/dashboard/main']);

  } else if (role === Role.Employee && department === 'bde') {
    this.router.navigate(['/client/dashboard']);

  } else if (role === Role.Employee && department === 'ba') {
    this.router.navigate(['/ba/dashboard']);

  } else if (role === Role.Employee) {
    this.router.navigate(['/employee/dashboard']);

  } else {
    this.router.navigate(['/authentication/signin']);
  }
}
              this.loading = false;
            }, 1000);
          } else {
            this.error = 'Invalid Login';
            this.loading = false;
          }
        },
        (error) => {
          this.error = error;
          this.submitted = false;
          this.loading = false;
        }
      );
  }
}
