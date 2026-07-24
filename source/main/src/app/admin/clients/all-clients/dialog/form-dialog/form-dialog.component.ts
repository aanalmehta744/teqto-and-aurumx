import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { ClientsService } from '../../clients.service';
import { Clients } from '../../clients.model';
import { forkJoin } from 'rxjs';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { CommonModule } from '@angular/common';
// NEW CODE: MatCheckboxModule added for platform checkbox toggle
import { MatCheckboxModule } from '@angular/material/checkbox';
import Swal from 'sweetalert2';
import { formatDate } from '@angular/common';
import { HttpClient } from '@angular/common/http';

export interface DialogData {
  id: number;
  action: string;
  clients: Clients;
}

@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogClose,
    MatOptionModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    CommonModule,
    MatCheckboxModule, // NEW CODE: for platform checkbox
  ],
})
export class FormDialogComponent implements OnInit {
  action: string;
  id!: number;
  dialogTitle: string;
  clientForm: UntypedFormGroup;
  clients: Clients;
  showPrizeInput = false;
  countryList: { name: string }[] = [];
  clientConnectType: string[] = ['Call', 'Whatsapp', 'Email', 'Linkedin', 'Other'];
  clientTypes: string[] = ['Hot', 'Cold', 'Close'];
  prizeTags: string[] = ['Full Time', 'Part Time', 'Hourly', 'Project Based'];

  countries: { name: string, flag: string, dialCode: string }[] = [];
  selectedCountry = this.countries[66]; // Default India

  // NEW CODE: Controls visibility of "Where did you get client from?" box when "Other" is selected
  showConnectSource = false;

  // NEW CODE: Controls visibility of platform ID/password fields when checkbox is ticked
  showPlatformFields = false;


  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public clientService: ClientsService,
    private fb: UntypedFormBuilder,
    private http: HttpClient
  ) {
    this.action = data.action;

    if (this.action === 'edit') {
      this.dialogTitle = data.clients.fullName;
      this.clients = data.clients;
    } else {
      this.dialogTitle = 'New Client';
      this.clients = new Clients({} as Clients);
    }

    this.clientForm = this.createContactForm();
  }

  createContactForm(): UntypedFormGroup {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    return this.fb.group({
      // bde_name: [this.clients.bde_name || ''],
      // bde_email: [this.clients.bde_email || ''],
      bde_name: [this.clients?.bde_name || currentUser.fullName || ''],
      bde_email: [this.clients?.bde_email || currentUser.email || ''],

      // OLD: bdeAccountId: [this.clients.bde_account_id || ''],
      // OLD: bdeAccountEmail: [this.clients.bde_account_email || ''],
      // NEW CODE: Bank details replace BDE account fields
      bankName: [this.clients.bank_name || ''],
      bankAccountNumber: [this.clients.bank_account_number || ''],
      ifscCode: [this.clients.ifsc_code || ''],

      fullName: [this.clients.fullName || '', [Validators.required]],
      mobile: [this.clients.mobile || ''],
      email: [this.clients.email || '', [Validators.required, Validators.email]],
      linkedinId: [this.clients.linkedin_id || ''],
      websiteLink: [this.clients.website_link || ''],
      clientNote: [this.clients.client_note || ''],
      country: [this.clients.country || '', [Validators.required]],
      prizeTag: [this.clients.prize_tag || ''],
      prizeAmount: [
        this.clients.prize_amount ? Math.floor(this.clients.prize_amount) : '',
        [Validators.required, Validators.pattern('^[0-9]+$'), Validators.min(1)]
      ],

      clientConnectType: [this.clients.client_Connect_Type || '', [Validators.required]],
      clientType: [this.clients.client_type || '', [Validators.required]],
      date: [this.clients.date || '', [Validators.required]],
      // NEW CODE: platform is now optional — shown only when platform checkbox is checked
      // OLD: platform: [this.clients.platform || '', [Validators.required]],
      platform: [this.clients.platform || ''],
      technology: [this.clients.technology || ''],
      address: [this.clients.address || ''],
      tag: [this.clients.tag || ''],
      // NEW CODE: "Where did you get client from?" — shown only when Connect Type = Other
      clientConnectSource: [this.clients.client_connect_source || ''],
      // NEW CODE: Platform login details — shown only when platform checkbox is ticked
      platformId: [this.clients.platform_id || ''],
      platformPassword: [this.clients.platform_password || '']
    });
  }

  ngOnInit(): void {
    this.loadCountries();
    this.onPrizeTagChange(this.clientForm.get('prizeTag')?.value);
    this.clientForm.statusChanges.subscribe(status => {
      console.log('Form Status:', status, 'Valid:', this.clientForm.valid);
    });

    // NEW CODE: Restore "Other" connect source visibility in edit mode
    if (this.clients.client_Connect_Type === 'Other') {
      this.showConnectSource = true;
    }

    // NEW CODE: Restore platform fields visibility in edit mode if platform was already set
    if (this.clients.platform) {
      this.showPlatformFields = true;
    }
  }

  // loadCountries(): void {
  //   this.http.get<{ name: string }[]>('/assets/data/countries.json').subscribe(data => {
  //     this.countryList = data;
  //   });

  //   this.http
  //     .get<{ name: string, flag: string, dialCode: string }[]>('/assets/data/selectCountries.json')
  //     .subscribe(data => {
  //       this.countries = data;
  //       this.selectedCountry = this.countries[66]; // Default India
  //     });
  // }

  loadCountries(): void {
    forkJoin({
      countryList: this.http.get<{ name: string }[]>('/assets/data/countries.json'),
      selectList: this.http.get<{ name: string; flag: string; dialCode: string }[]>('/assets/data/selectCountries.json')
    }).subscribe(({ countryList, selectList }) => {
      this.countryList = countryList;
      this.countries = selectList;

      const selectedCountryName = this.clientForm.get('country')?.value;

      if (selectedCountryName) {
        const match = this.countries.find(c => c.name.toLowerCase() === selectedCountryName.toLowerCase());
        if (match) this.selectedCountry = match;
      } else {
        this.selectedCountry = this.countries.find(c => c.name === 'India')!;
        if (this.selectedCountry) {
          const defaultMatch = this.countryList.find(c => c.name.toLowerCase() === this.selectedCountry.name.toLowerCase());
          if (defaultMatch) this.clientForm.get('country')?.setValue(defaultMatch.name);
        }
      }
    });
  }

  confirmAdd(): void {
    if (this.clientForm.valid) {
      const formData = this.clientForm.getRawValue();
      formData.date = this.formatDateForDB(formData.date);
      if (this.action === 'edit') {
        // Update existing client
        this.clientService.updateClient(this.clients.id, formData).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Client details updated successfully!',
              confirmButtonColor: '#3085d6',
            });
            this.dialogRef.close(this.clientForm.value);
            location.reload(); // reloads the page
          },
          error: (error) => {
            console.error('Error updating client:', error);
            Swal.fire({
              icon: 'error',
              title: 'Failed!',
              text: 'Failed to update client. Try again later.',
            });
          },
        });
      } else {
        // Add new client
        this.clientService.addClient(formData).subscribe({
          next: () => {
            Swal.fire({
              icon: 'success',
              title: 'Success!',
              text: 'Client added successfully!',
              confirmButtonColor: '#3085d6',
            });
            this.dialogRef.close(this.clientForm.value);
            location.reload(); // reloads the page
          },
          error: (error) => {
            console.error('Error adding client:', error);
            Swal.fire({
              icon: 'error',
              title: 'Failed!',
              text: 'Failed to add client. Try again later.',
            });
          },
        });
      }
    } else {
      console.log("Form is invalid", this.clientForm.errors);
    }
  }


  submit(): void {
    if (this.clientForm.valid) {
      this.confirmAdd();
    }
  }

  onPrizeTagChange(selectedTag: string): void {
    console.log("Prize Tag Changed:", selectedTag);
    this.showPrizeInput = selectedTag === 'Hourly' || selectedTag === 'Monthly';

    const prizeAmountControl = this.clientForm.get('prizeAmount');
    if (this.showPrizeInput) {
      prizeAmountControl?.setValidators([Validators.required, Validators.pattern('^[0-9]*$'), Validators.min(1)]);
    } else {
      prizeAmountControl?.clearValidators();
    }
    prizeAmountControl?.updateValueAndValidity();
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

  // NEW CODE: Auto-fill Country field when a dial code / flag is selected from phone picker
  onDialCodeChange(country: { name: string; flag: string; dialCode: string }): void {
    const match = this.countryList.find(c => c.name.toLowerCase() === country.name.toLowerCase());
    if (match) {
      this.clientForm.get('country')?.setValue(match.name);
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
  /**
 * Utility function to format the date for database storage
 */
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
}
