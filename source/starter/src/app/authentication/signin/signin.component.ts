import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Role, AuthService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

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
        MatSelectModule,
        MatOptionModule,
    ],
})
export class SigninComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit
{
  authForm!: UntypedFormGroup;
  submitted = false;
  loading = false;
  error = '';
  hide = true;

  roles = ['Admin', 'HR', 'BA', 'BDE', 'Employee', 'Client'];

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {
    super();
  }

  ngOnInit() {
    this.authForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required],
      role: ['', Validators.required],
    });
  }

  get f() {
    return this.authForm.controls;
  }

  adminSet() {
    this.authForm.patchValue({ username: 'admin@software.com', password: 'admin@123', role: 'Admin' });
  }
  hrSet() {
    this.authForm.patchValue({ role: 'HR' });
  }
  baSet() {
    this.authForm.patchValue({ role: 'BA' });
  }
  bdeSet() {
    this.authForm.patchValue({ role: 'BDE' });
  }
  employeeSet() {
    this.authForm.patchValue({ username: 'employee@software.com', password: 'employee@123', role: 'Employee' });
  }
  clientSet() {
    this.authForm.patchValue({ username: 'client@software.com', password: 'client@123', role: 'Client' });
  }

  onSubmit() {
    this.submitted = true;
    this.loading = true;
    this.error = '';
    if (this.authForm.invalid) {
      this.error = 'Username, Password, and Role are required!';
      this.loading = false;
      return;
    }

    this.subs.sink = this.authService
      .login(this.f['username'].value, this.f['password'].value, this.f['role'].value)
      .subscribe(
        (res) => {
          if (res) {
            setTimeout(() => {
              const role = this.authService.currentUserValue?.role;
              if (
                role === Role.Admin ||
                role === Role.HR ||
                role === Role.BA ||
                role === Role.BDE
              ) {
                this.router.navigate(['/admin/dashboard/main']);
              } else if (role === Role.Employee) {
                this.router.navigate(['/employee/dashboard']);
              } else if (role === Role.Client) {
                this.router.navigate(['/client/dashboard']);
              } else {
                this.router.navigate(['/authentication/signin']);
              }
              this.loading = false;
            }, 1000);
          } else {
            this.error = 'Invalid Login';
            this.loading = false;
          }
        },
        (error) => {
          this.error = error?.error?.message || 'Login failed. Please check your credentials and role.';
          this.submitted = false;
          this.loading = false;
        }
      );
  }
}
