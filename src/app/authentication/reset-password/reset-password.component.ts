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
  selector: 'app-reset-password',
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
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {

  resetForm!: UntypedFormGroup;
  hidePassword = true;
  hideConfirm = true;
  loadingReset = false;
  token!: string;

  constructor(
    private fb: UntypedFormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) { }

  ngOnInit() {
    this.token = this.route.snapshot.params['token'];

    this.resetForm = this.fb.group({
      email: [{ value: '', disabled: true }],
      password: ['', [Validators.required, Validators.minLength(6)]],
      conformPassword: ['', Validators.required]
    }, { validators: [this.passwordMatchValidator] });

    // Decode token to get email
    const decodedToken: any = this.decodeToken(this.token);
    this.resetForm.patchValue({ email: decodedToken.email });
  }

  togglePassword() { this.hidePassword = !this.hidePassword; }
  toggleConfirm() { this.hideConfirm = !this.hideConfirm; }


  passwordMatchValidator(form: UntypedFormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('conformPassword');

    if (password && confirmPassword) {
      const mismatch = password.value !== confirmPassword.value;

      if (mismatch) {
        confirmPassword.setErrors({ mismatch: true });
      } else {
        // ✅ Clear mismatch error if they match
        if (confirmPassword.hasError('mismatch')) {
          confirmPassword.setErrors(null);
        }
      }
    }
    return null; // Don't set error on the group
  }
  onResetSubmit() {
    if (this.resetForm.invalid) {
      this.resetForm.get('conformPassword')?.markAsTouched();
      this.resetForm.get('password')?.markAsTouched();
      return;
    }

    this.loadingReset = true;

    this.authService.resetPassword(this.token, this.resetForm.get('password')?.value).subscribe({
      next: res => {
        this.loadingReset = false;
        Swal.fire({
          icon: 'success',
          title: 'Password Reset Successful!',
          text: res.message,
          confirmButtonColor: '#00383F',
        }).then(() => {
          this.router.navigate(['/authentication/login']);
        });
      },
      error: err => {
        this.loadingReset = false;
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err.error.message || 'Error resetting password',
          confirmButtonColor: '#d33',
        });
      }
    });
  }

  // Simple JWT decode (for frontend display only)
  decodeToken(token: string) {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch (e) {
      return {};
    }
  }
}
