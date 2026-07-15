import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { environment } from 'environments/environment';
import { AuthService } from '@core';

@Component({
  selector: 'app-login-settings',
  standalone: true,
  templateUrl: './login-settings.component.html',
  imports: [
    CommonModule,
    FormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
  ],
})
export class LoginSettingsComponent implements OnInit {
  heading = '';
  description = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  currentImage: string | null = null;
  loading = false;
  private apiBase = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private cd: ChangeDetectorRef,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.http
      .get<{ image_path: string | null; heading: string | null; description: string | null }>(
        `${this.apiBase}/login-settings`
      )
      .subscribe({
        next: (s) => {
          this.heading = s.heading || '';
          this.description = s.description || '';
          if (s.image_path) {
            this.currentImage = `${this.apiBase.replace('/api', '')}/uploads/login-settings/${s.image_path}`;
          }
          this.cd.detectChanges();
        },
      });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl = e.target?.result as string;
        this.cd.detectChanges();
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  save() {
    this.loading = true;
    const currentUser = this.authService.currentUserValue;
    const formData = new FormData();
    formData.append('heading', this.heading);
    formData.append('description', this.description);
    formData.append('updated_by', String(currentUser?.id || ''));
    if (this.selectedFile) {
      formData.append('image', this.selectedFile);
    }

    this.http.post(`${this.apiBase}/login-settings`, formData).subscribe({
      next: () => {
        this.loading = false;
        this.snackBar.open('Login page updated successfully!', 'Close', { duration: 3000 });
        if (this.previewUrl) {
          this.currentImage = this.previewUrl;
          this.previewUrl = null;
          this.selectedFile = null;
        }
        this.cd.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.snackBar.open('Failed to update. Please try again.', 'Close', { duration: 3000 });
        this.cd.detectChanges();
      },
    });
  }
}
