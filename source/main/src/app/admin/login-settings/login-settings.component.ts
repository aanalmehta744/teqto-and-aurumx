import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';


import {
  MatSnackBar,
  MatSnackBarModule,
} from '@angular/material/snack-bar';

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

  ngOnInit(): void {
    this.loadSettings();
  }

  /**
   * Load current login page settings
   */
  loadSettings(): void {
    this.http
      .get<{
        image_path: string | null;
        heading: string | null;
        description: string | null;
      }>(`${this.apiBase}/login-settings`)
      .subscribe({
        next: (settings) => {
          this.heading = settings.heading || '';
          this.description = settings.description || '';

          if (settings.image_path?.startsWith('http')) {
            this.currentImage = settings.image_path;
          } else {
            this.currentImage = null;
          }

          this.cd.detectChanges();
        },

        error: (error) => {
          console.error(
            '❌ Failed to load login settings:',
            error
          );
        },
      });
  }

  /**
   * Select login page image
   */
  onFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;

    if (!input.files || input.files.length === 0) {
      return;
    }

    const file = input.files[0];

    this.selectedFile = file;

    console.log('====================================');
    console.log('📷 FILE SELECTED');
    console.log('Name:', file.name);
    console.log('Size:', file.size);
    console.log('Type:', file.type);
    console.log('File object:', file);
    console.log('====================================');

    const reader = new FileReader();

    reader.onload = (e) => {
      this.previewUrl = e.target?.result as string;
      this.cd.detectChanges();
    };

    reader.onerror = (error) => {
      console.error('❌ FileReader error:', error);
    };

    reader.readAsDataURL(file);
  }

  /**
   * Save login page settings
   */
  save(): void {
    if (this.loading) {
      return;
    }

    this.loading = true;

    const currentUser = this.authService.currentUserValue;

    const formData = new FormData();

    // Text fields
    formData.append('heading', this.heading || '');
    formData.append('description', this.description || '');
    formData.append(
      'updated_by',
      String(currentUser?.id || '')
    );

    // Image
    if (this.selectedFile) {
      console.log('====================================');
      console.log('📤 ADDING IMAGE TO FORMDATA');
      console.log('Name:', this.selectedFile.name);
      console.log('Size:', this.selectedFile.size);
      console.log('Type:', this.selectedFile.type);
      console.log('====================================');

      formData.append(
        'image',
        this.selectedFile,
        this.selectedFile.name
      );
    } else {
      console.log('ℹ️ No new image selected');
    }

    // Debug FormData
    console.log('====================================');
    console.log('📤 LOGIN SETTINGS FORMDATA');

    // for (const [key, value] of formData.entries()) {
    //   if (value instanceof File) {
    //     console.log(
    //       `${key}: FILE`,
    //       value.name,
    //       `${value.size} bytes`,
    //       value.type
    //     );
    //   } else {
    //     console.log(`${key}:`, value);
    //   }
    // }

    console.log('====================================');

    this.http
      .post(
        `${this.apiBase}/login-settings`,
        formData
      )
      .subscribe({
        next: (response) => {
          console.log(
            '✅ LOGIN SETTINGS SUCCESS:',
            response
          );

          this.loading = false;

          this.snackBar.open(
            'Login page updated successfully!',
            'Close',
            {
              duration: 3000,
            }
          );

          // Update preview/current image
          if (this.previewUrl) {
            this.currentImage = this.previewUrl;
            this.previewUrl = null;
          }

          this.selectedFile = null;

          this.cd.detectChanges();
        },

        error: (error) => {
          console.error(
            '❌ LOGIN SETTINGS ERROR:',
            error
          );

          console.error(
            '❌ SERVER RESPONSE:',
            error.error
          );

          console.error(
            '❌ STATUS:',
            error.status
          );

          console.error(
            '❌ STATUS TEXT:',
            error.statusText
          );

          this.loading = false;

          const message =
            error.error?.error ||
            'Failed to update login page settings.';

          this.snackBar.open(
            message,
            'Close',
            {
              duration: 5001,
            }
          );

          this.cd.detectChanges();
        },
      });
  }
}