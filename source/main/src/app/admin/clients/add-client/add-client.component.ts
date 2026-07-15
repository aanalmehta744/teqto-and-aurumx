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
import { CommonModule } from '@angular/common';
import { ClientsService } from '../all-clients/clients.service';
// NEW CODE: MatCheckboxModule added for platform checkbox toggle
import { MatCheckboxModule } from '@angular/material/checkbox';
// NEW CODE: MatIconModule added for mat-icon suffix icons in form fields
import { MatIconModule } from '@angular/material/icon';
import Swal from 'sweetalert2';
import { HttpClient } from '@angular/common/http';

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
export class AddClientComponent implements OnInit {
  clientForm: UntypedFormGroup;
  countryList: { name: string }[] = [];
  clientTypes: string[] = ['Hot', 'Cold', 'Clause'];
  prizeTags: string[] = ['Hourly', 'Monthly'];
  showPrizeInput: boolean = false;
  selectedPrizeTag: string = '';
  clientConnectType: string[] = ['Call', 'Whatsapp', 'Email', 'Linkedin', 'Other'];

  // NEW CODE: Controls visibility of "Where did you get client from?" box when "Other" is selected
  showConnectSource = false;
  // NEW CODE: Controls visibility of platform ID/password fields when checkbox is ticked
  showPlatformFields = false;

  // NEW CODE: Flag/dial-code picker for mobile field — auto-fills country on selection
  countries: { name: string; flag: string; dialCode: string }[] = [];
  selectedCountry!: { name: string; flag: string; dialCode: string };

  constructor(private fb: UntypedFormBuilder, private clientService: ClientsService, private http: HttpClient) {
    this.clientForm = this.fb.group({
      // NEW CODE: Bank details added to admin add-client form
      bankName: [''],
      bankAccountNumber: [''],
      ifscCode: [''],
      fullName: ['', [Validators.required]],
      mobile: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      // OLD: linkedinId: ['', [Validators.required]],
      // NEW CODE: LinkedIn removed — kept in form but no longer shown or required
      linkedinId: [''],
      country: ['', [Validators.required]],
      prizeTag: ['', [Validators.required]],
      prizeAmount: ['', [Validators.required, Validators.pattern('^[0-9]*$'), Validators.min(1)]],
      clientType: ['', [Validators.required]],
      clientConnectType: ['', [Validators.required]],
      date: ['', [Validators.required]],
      // OLD: platform: ['', [Validators.required]],
      // NEW CODE: platform is now optional — shown only when platform checkbox is checked
      platform: [''],
      technology: ['', [Validators.required]],
      address: [''],
      // NEW CODE: "Where did you get client from?" — shown only when Connect Type = Other
      clientConnectSource: [''],
      // NEW CODE: Platform login details — shown only when platform checkbox is ticked
      platformId: [''],
      platformPassword: [''],
    });
  }
  ngOnInit(): void {
    this.loadCountries();
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

  // Function to handle prize tag selection
  onPrizeTagChange(selectedTag: string) {
    this.selectedPrizeTag = selectedTag;
    this.showPrizeInput = !!selectedTag;

    if (this.showPrizeInput) {
      this.clientForm.get('prizeAmount')?.setValidators(Validators.required);
    } else {
      this.clientForm.get('prizeAmount')?.clearValidators();
    }
    this.clientForm.get('prizeAmount')?.updateValueAndValidity();
  }
  loadCountries(): void {
    this.http.get<{ name: string }[]>('/assets/data/countries.json').subscribe(data => {
      this.countryList = data;
    });
    // NEW CODE: Load dial-code list, default to India, auto-fill country field
    this.http.get<{ name: string; flag: string; dialCode: string }[]>('/assets/data/selectCountries.json')
      .subscribe(data => {
        this.countries = data;
        this.selectedCountry = this.countries.find(c => c.name === 'India') || this.countries[66];
        if (this.selectedCountry) {
          const match = this.countryList.find(c => c.name.toLowerCase() === this.selectedCountry.name.toLowerCase());
          if (match) this.clientForm.get('country')?.setValue(match.name);
        }
      });
  }

  // NEW CODE: Auto-fill Country field when flag/dial-code is selected from mobile picker
  onDialCodeChange(country: { name: string; flag: string; dialCode: string }): void {
    const match = this.countryList.find(c => c.name.toLowerCase() === country.name.toLowerCase());
    if (match) this.clientForm.get('country')?.setValue(match.name);
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

    this.clientService.addClient(this.clientForm.value).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Client added successfully!',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK', // 👈 Added OK button
        }).then(() => {
          window.location.reload();
        });
      },
      error: (error) => {
        console.error('Error adding client:', error);
        Swal.fire({
          icon: 'error',
          title: 'Failed!',
          text: 'Failed to add client. Try again later.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'OK', // 👈 Added OK button for error as well
        });
      },
    });

  }
}
