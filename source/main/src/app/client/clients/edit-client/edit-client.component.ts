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
@Component({
  selector: 'app-edit-client',
  templateUrl: './edit-client.component.html',
  styleUrls: ['./edit-client.component.scss'],
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
  ],
})
export class EditClientComponent {
  clientForm: UntypedFormGroup;
  formdata = {
    name: 'Pooja Sarma',
    mobile: '123456789',
    email: 'test@example.com',
    date: '1987-02-17T14:22:18Z',
    company_name: 'ABC Infotech',
    currency: 'rupee',
    billing_method: 'Fixed Price',
    uploadImg: '',
  };

  constructor(private fb: UntypedFormBuilder) {
    this.clientForm = this.createContactForm();
  }
  onSubmit() {
    console.log('Form Value', this.clientForm.value);
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      name: [this.formdata.name, [Validators.required]],
      mobile: [this.formdata.mobile, [Validators.required]],
      email: [
        this.formdata.email,
        [Validators.required, Validators.email, Validators.minLength(5)],
      ],
      date: [this.formdata.date, [Validators.required]],
      company_name: [this.formdata.company_name],
      currency: [this.formdata.currency],
      billing_method: [this.formdata.billing_method],
      uploadImg: [this.formdata.uploadImg],
    });
  }
}
