import { Component, ChangeDetectionStrategy, signal, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NgClass, NgIf } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Role, AuthService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { CommonModule } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';


@Component({
    selector: 'app-login',
    standalone: true,
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss', './login-tailwind.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatButtonModule,
        MatSnackBarModule,
        NgIf,
        CommonModule,
        RouterLink
    ]
})
export class LoginComponent extends UnsubscribeOnDestroyAdapter
    implements OnInit {

    authForm!: UntypedFormGroup;
    submitted = false;
    loading = false;
    error = '';
    hide = true;
    selectedRole = '';
    loginImage: string | null = null;
    loginHeading: string | null = null;
    loginDescription: string | null = null;
    readonly defaultImage = '../../../assets/images/Professional Businesswoman Portrait _ Corporate Headshot Photography for Personal Branding.jpeg';
    private apiBase = environment.apiUrl;

    constructor(
        private formBuilder: UntypedFormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private authService: AuthService,
        private changeDetector: ChangeDetectorRef,
        private snackBar: MatSnackBar,
        private http: HttpClient
    ) {
        super();
    }
    ngOnInit() {
        this.authForm = this.formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required],
            role: ['', Validators.required]
        });
        this.loadLoginSettings();
    }

    private loadLoginSettings() {
        this.http.get<{ image_path: string | null; heading: string | null; description: string | null }>(
            `${this.apiBase}/login-settings`
        ).subscribe({
            next: (settings) => {
                if (settings.image_path?.startsWith('http')) {
                    this.loginImage = settings.image_path;
                }
                this.loginHeading = settings.heading || null;
                this.loginDescription = settings.description || null;
                this.changeDetector.detectChanges();
            },
            error: () => { /* silently fall back to defaults */ }
        });
    }
    get f() {
        return this.authForm.controls;
    }
    toggleHide() {
        this.hide = !this.hide;
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
            this.snackBar.open('Username and Password are required!', 'Close', {
                duration: 3000,
                panelClass: ['bg-red-600', 'text-white']
            });
            this.loading = false;
            return;
        }

        const { username, password, role } = this.authForm.value;

        this.authService.login(username, password, role).subscribe(
            (res) => {
                if (res) {
                    const currentUser = this.authService.currentUserValue;
                    const userRole = currentUser?.role;
                    const department = currentUser?.department?.toLowerCase();

                    // this.snackBar.open('Login successful', 'Close', {
                    //     duration: 3000,
                    //     panelClass: ['custom-snackbar-success']
                    // });
                    Swal.fire({
                        icon: 'success',
                        title: 'Login Successful',
                        text: `Welcome back, ${username}!`,
                        confirmButtonText: 'Okay',
                        confirmButtonColor: '#3085d6', // optional styling
                        allowOutsideClick: false
                    }).then(() => {
                        if (userRole === Role.Admin) {
                            this.router.navigate(['/admin/dashboard/main']);
                        } else if (userRole === Role.Employee) {
                            this.router.navigate(['/employee/dashboard']);
                        } else if (userRole === Role.BDE) {
                            this.router.navigate(['/client/dashboard']);
                        } else if (userRole === Role.BA) {
                            this.router.navigate(['/ba/dashboard']);
                        } else {
                            this.router.navigate(['/authentication/login']);
                        }
                    });
                } else {
                    this.snackBar.open('Invalid login', 'Close', {
                        duration: 3000,
                        panelClass: ['custom-snackbar-error']
                    });
                }

                this.loading = false;
                this.changeDetector.detectChanges();
            },
            (err) => {
                console.log(err);
                const errorMessage = err?.error?.message || err?.message;

                // SnackBar toast for all errors including inactive account
                this.snackBar.open(err, 'Close', {
                    duration: 4000,
                    panelClass: ['bg-red-600', 'text-white']
                });

                this.submitted = false;
                this.loading = false;
                this.changeDetector.detectChanges();
            }

        );
    }
    goToForgot() {
        this.router.navigate(['/authentication/forgot-password']);
    }
}