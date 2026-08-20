import { Component } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-edit-holiday',
  templateUrl: './edit-holiday.component.html',
  styleUrls: ['./edit-holiday.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
})
export class EditHolidayComponent {
  holidayForm: UntypedFormGroup;
  formdata = {
    hNo: '01',
    hName: 'World Aids Day',
    date: '2021-12-10T14:22:18Z',
    location: 'All Locations',
    shift: 'All Shifts',
    details: 'This festival is celebrate for.',
  };
  constructor(private fb: UntypedFormBuilder) {
    this.holidayForm = this.createContactForm();
  }
  onSubmit() {
    console.log('Form Value', this.holidayForm.value);
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      hNo: [this.formdata.hNo, [Validators.required]],
      hName: [this.formdata.hName, [Validators.required]],
      date: [this.formdata.date, [Validators.required]],
      location: [this.formdata.location, [Validators.required]],
      shift: [this.formdata.shift, [Validators.required]],
      details: [this.formdata.details, [Validators.required]],
    });
  }
}
