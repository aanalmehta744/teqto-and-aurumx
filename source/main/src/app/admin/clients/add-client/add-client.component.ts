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
  ],
})
export class AddClientComponent implements OnInit {
  clientForm: UntypedFormGroup;
  countryList: { name: string }[] = [];
  clientTypes: string[] = ['Hot', 'Cold', 'Clause'];
  prizeTags: string[] = ['Hourly', 'Monthly'];
  showPrizeInput: boolean = false;
  selectedPrizeTag: string = '';

  constructor(private fb: UntypedFormBuilder, private clientService: ClientsService, private http: HttpClient) {
    this.clientForm = this.fb.group({
      fullName: ['', [Validators.required]],
      mobile: ['', [Validators.required]],
      email: ['', [Validators.required, Validators.email]],
      linkedinId: ['', [Validators.required]],
      country: ['', [Validators.required]],
      prizeTag: ['', [Validators.required]],
      prizeAmount: ['', [Validators.required, Validators.pattern('^[0-9]*$'), Validators.min(1)]],
      clientType: ['', [Validators.required]],
      date: ['', [Validators.required]],
      platform: ['', [Validators.required]],
      technology: ['', [Validators.required]],
      address: [''],
    });
  }
  ngOnInit(): void {
    this.loadCountries();
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
