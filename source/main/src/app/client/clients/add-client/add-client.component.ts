import { Component } from '@angular/core';
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
  ],
})
export class AddClientComponent {
  clientForm: UntypedFormGroup;
  // countryList: string[] = ['USA', 'UK', 'Canada', 'India', 'Australia'];
  bdeName: string = '';
  bdeEmail: string = '';

  clientConnectType: string[] = ['Call', 'Whatsapp', 'Email', 'Linkedin', 'Other'];
  clientTypes: string[] = ['Cold', 'Hot', 'Close'];
  prizeTags: string[] = ['Hourly', 'Monthly'];
  showPrizeInput: boolean = false;
  selectedPrizeTag: string = '';
  countryList: { name: string }[] = [];

  countries: { name: string, flag: string, dialCode: string }[] = [];
  selectedCountry = this.countries[66]; // Default India

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
      bdeAccountId: [''],
      bdeAccountEmail: [''],
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
      platform: [''],
      technology: [''],
      address: [''],
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
        this.selectedCountry = this.countries[66]; // Default India
      });
  }
  onCountryDropdown(opened: boolean) {
    if (opened) {
      this.clientForm.get('mobile')?.setValue('');
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
