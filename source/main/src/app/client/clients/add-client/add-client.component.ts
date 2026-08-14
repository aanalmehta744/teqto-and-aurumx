import { Component, OnInit } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule, formatDate } from '@angular/common';
import { ClientsService } from '../all-clients/clients.service';
// NEW CODE: MatCheckboxModule added for platform checkbox toggle
import { MatCheckboxModule } from '@angular/material/checkbox';
// NEW CODE: MatIconModule added for mat-icon suffix icons in form fields
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-client',
  templateUrl: './add-client.component.html',
  styleUrls: ['./add-client.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatSelectModule,
    MatOptionModule,
    FileUploadComponent,
    MatButtonModule,
    CommonModule,
    MatCheckboxModule, // NEW CODE: for platform checkbox
    MatIconModule, // NEW CODE: for mat-icon suffix icons in form fields
  ],
})
export class AddClientComponent {
  clientForm: UntypedFormGroup;
  // countryList: string[] = ['USA', 'UK', 'Canada', 'India', 'Australia'];
  bdeName: string = '';
  bdeEmail: string = '';

  clientConnectType: string[] = ['Call', 'Whatsapp', 'Email', 'Linkedin', 'Other'];
  clientTypes: string[] = ['Cold', 'Hot', 'Close'];
  prizeTags: string[] = ['Full Time', 'Part Time', 'Hourly', 'Project Based'];
  showPrizeInput: boolean = false;
  selectedPrizeTag: string = '';
  countryList: { name: string }[] = [];

  countries: { name: string, flag: string, dialCode: string }[] = [];
  selectedCountry = this.countries[66]; // Default India

  // NEW CODE: Controls visibility of "Where did you get client from?" box when "Other" is selected
  showConnectSource = false;
  // NEW CODE: Controls visibility of platform ID/password fields when checkbox is ticked
  showPlatformFields = false;

  // countries = [
  //   { name: 'India', flag: '🇮🇳', dialCode: '+91' },
  //   { name: 'USA', flag: '🇺🇸', dialCode: '+1' },
  //   { name: 'UK', flag: '🇬🇧', dialCode: '+44' }
  // ];

  constructor(
    private fb: UntypedFormBuilder,
    private clientService: ClientsService,
    private http: HttpClient,
    private router: Router
  ) {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    this.bdeName = user.fullName || '-';
    this.bdeEmail = user.email || '-';

    this.clientForm = this.fb.group({
      // OLD: bdeAccountId: [''],
      // OLD: bdeAccountEmail: [''],
      // NEW CODE: Bank details replace BDE account fields
      bankName: [''],
      bankAccountNumber: [''],
      ifscCode: [''],
      fullName: ['', [Validators.required]],
      mobile: ['', [
        Validators.required,
        Validators.pattern('^[0-9]{10}$')
      ]],
      email: ['', [Validators.required, Validators.email]],
      linkedinId: [''],
      websiteLink: [''],
      clientNote: [''],
      country: ['', [Validators.required]],
      prizeTag: ['', [Validators.required]],
      prizeAmount: [''],
      clientType: ['', [Validators.required]],
      clientConnectType: ['', [Validators.required]],
      date: ['', [Validators.required]],
      // OLD: platform: [''],
      // NEW CODE: platform is now optional — shown only when platform checkbox is checked
      platform: [''],
      technology: [''],
      address: [''],
      // NEW CODE: "Where did you get client from?" — shown only when Connect Type = Other
      clientConnectSource: [''],
      // NEW CODE: Platform login details — shown only when platform checkbox is ticked
      platformId: [''],
      platformPassword: [''],
    });
    this.loadCountries();
    
  }
  loadCountries(): void {
    this.http.get<{ name: string }[]>('/assets/data/countries.json').subscribe(data => {
      this.countryList = data;
    });

    this.http
      .get<{ name: string, flag: string, dialCode: string }[]>('/assets/data/selectCountries.json')
      .subscribe(data => {
        this.countries = data;
        // NEW CODE: Find India by name instead of hardcoded index (index can shift)
        this.selectedCountry = this.countries.find(c => c.name === 'India') || this.countries[66];
        // NEW CODE: Auto-fill Country field with default dial code country on load
        if (this.selectedCountry) {
          const match = this.countryList.find(c => c.name.toLowerCase() === this.selectedCountry.name.toLowerCase());
          if (match) this.clientForm.get('country')?.setValue(match.name);
        }
      });
  }
  onCountryDropdown(opened: boolean) {
    if (opened) {
      this.clientForm.get('mobile')?.setValue('');
    }
  }

  // NEW CODE: Show/hide "Where did you get this client?" input when "Other" is selected
  onConnectTypeChange(value: string): void {
    this.showConnectSource = value === 'Other';
    if (!this.showConnectSource) {
      this.clientForm.get('clientConnectSource')?.setValue('');
    }
  }

  // NEW CODE: Show/hide platform ID & password fields when checkbox is toggled
  onPlatformToggle(checked: boolean): void {
    this.showPlatformFields = checked;
    if (!checked) {
      this.clientForm.get('platform')?.setValue('');
      this.clientForm.get('platformId')?.setValue('');
      this.clientForm.get('platformPassword')?.setValue('');
    }
  }

  // NEW CODE: Auto-fill Country field when a dial code / flag is selected
  onDialCodeChange(country: { name: string; flag: string; dialCode: string }): void {
    const match = this.countryList.find(c => c.name.toLowerCase() === country.name.toLowerCase());
    if (match) {
      this.clientForm.get('country')?.setValue(match.name);
    }
  }

  onPrizeTagChange(selectedTag: string) {
    this.selectedPrizeTag = selectedTag;
    this.showPrizeInput = !!selectedTag;

    if (this.showPrizeInput) {
      this.clientForm.get('prizeAmount')?.setValidators([
        Validators.required,
        Validators.pattern('^[0-9]*$'),
        Validators.min(1)
      ]);
    } else {
      this.clientForm.get('prizeAmount')?.clearValidators();
      this.clientForm.get('prizeAmount')?.setValue('');
    }
    this.clientForm.get('prizeAmount')?.updateValueAndValidity();
  }

  onSubmit() {
    if (this.clientForm.invalid) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'Please fill all required fields correctly!',
      });
      return;
    }

    const formData = { ...this.clientForm.value };
    if (formData.date) {
      formData.date = formatDate(formData.date, 'yyyy-MM-dd', 'en');
    }

    this.clientService.addClient(formData).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Client added successfully!',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK',
        }).then(() => {
          this.router.navigate(['/client/clients/all-clients']);
        });
      },
      error: (error) => {
        console.error('Error adding client:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed!',
          text: 'Failed to add client. Try again later.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK',
        });
      },
    });
  }
}
