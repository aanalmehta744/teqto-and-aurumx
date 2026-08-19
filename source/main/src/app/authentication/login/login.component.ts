import { Component, ChangeDetectionStrategy, OnInit } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { NgClass, NgIf, CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { Role, AuthService } from '@core';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { ChangeDetectorRef } from '@angular/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

@Component({
    selector: 'app-login',
    standalone: true,
    templateUrl: './login.component.html',
    styleUrls: ['./login.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ReactiveFormsModule,
        MatSnackBarModule,
        NgIf,
        NgClass,
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
    isDarkTheme = false;

    loginImage: string | null = null;
    loginHeading: string | null = null;
    loginDescription: string | null = null;

    /** Abstract gradient/dot placeholder — kept exactly as supplied, only
     *  overridden if an admin has set a custom image via login-settings. */
    readonly defaultImage =
        "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0' stop-color='%230F766E'/%3E%3Cstop offset='0.55' stop-color='%230EA5E9'/%3E%3Cstop offset='1' stop-color='%237C3AED'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='800' height='500' fill='url(%23g)'/%3E%3Cg fill='none' stroke='rgba(255,255,255,0.45)' stroke-width='4' stroke-linecap='round'%3E%3Cpath d='M90 400 L230 260 L410 320 L570 160 L720 230'/%3E%3C/g%3E%3Cg fill='%23ffffff'%3E%3Ccircle cx='90' cy='400' r='10'/%3E%3Ccircle cx='230' cy='260' r='10'/%3E%3Ccircle cx='410' cy='320' r='10'/%3E%3Ccircle cx='570' cy='160' r='10'/%3E%3Ccircle cx='720' cy='230' r='10'/%3E%3C/g%3E%3C/svg%3E";

    readonly defaultTitle = 'Sign in';
    readonly defaultLede = 'Enter your workspace credentials to reach your projects, clients and automations.';

    /** Currently displayed brand image. Starts as loginImage||defaultImage,
     *  can be swapped client-side via the file input (preview only, not
     *  persisted to the backend — matches the reference's own behavior). */
    mediaImage: string = this.defaultImage;
    mediaDimensions: string | null = null;

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
            role: ['Admin', Validators.required]
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
                    this.mediaImage = settings.image_path;
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

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;
    }

    /** Client-side preview only, same as the reference implementation —
     *  does not upload/persist anywhere. */
    onMediaFileChange(event: Event) {
        const input = event.target as HTMLInputElement;
        const file = input.files && input.files[0];
        if (!file) { return; }

        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
            this.mediaImage = e.target?.result as string;
            this.changeDetector.detectChanges();
        };
        reader.readAsDataURL(file);
    }

    onMediaImageLoad(img: HTMLImageElement) {
        if (!img.naturalWidth || !img.naturalHeight) { return; }
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const orientation = w > h ? 'landscape' : (w < h ? 'portrait' : 'square');
        this.mediaDimensions = `${w} \u00d7 ${h} \u00b7 ${orientation}`;
        this.changeDetector.detectChanges();
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

        this.authService.login(username, password).subscribe(
            (res) => {
                if (res) {
                    const currentUser = this.authService.currentUserValue;
                    const userRole = currentUser?.role;

                    Swal.fire({
                        icon: 'success',
                        title: 'Login Successful',
                        text: `Welcome back, ${username}!`,
                        confirmButtonText: 'Okay',
                        confirmButtonColor: '#3085d6',
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