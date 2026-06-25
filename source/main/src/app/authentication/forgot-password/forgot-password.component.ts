import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AuthService } from '@core';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
  standalone: true,
  imports: [
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
    CommonModule,
  ],
})
export class ForgotPasswordComponent implements OnInit {
  forgotForm!: UntypedFormGroup;        // <-- renamed from authForm
  submitted = false;
  loadingForgot = false;                // <-- loading state
  returnUrl!: string;

  constructor(
    private formBuilder: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
  ) { }

  ngOnInit() {
    this.forgotForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email, Validators.minLength(5)]],
    });

    // get return url from route parameters or default to '/'
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
  }

  // getter for form controls
  get f() {
    return this.forgotForm.controls;
  }

  onForgotSubmit() {
    this.submitted = true;

    if (this.forgotForm.invalid) {
      return;
    }

    this.loadingForgot = true;
    const email = this.forgotForm.value.email;

    this.authService.sendPasswordResetEmail(email).subscribe({
      next: (res) => {
        this.loadingForgot = false;
        Swal.fire({
          icon: 'success',
          title: 'Email Sent!',
          text: res.message,
          confirmButtonColor: '#00383F',
        }).then(() => {
          this.router.navigate(['authentication/login']); // ✅ fixed "authenticationc"
        });
      },
      error: (err) => {
        this.loadingForgot = false;
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: err?.error?.message || 'Failed to send reset link',
          confirmButtonColor: '#d33',
        });
      }
    });
  }

}
