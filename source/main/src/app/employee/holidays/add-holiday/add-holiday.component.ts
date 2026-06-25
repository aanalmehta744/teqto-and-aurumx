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
  selector: 'app-add-holiday',
  templateUrl: './add-holiday.component.html',
  styleUrls: ['./add-holiday.component.scss'],
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
export class AddHolidayComponent {
  holidayForm: UntypedFormGroup;
  constructor(private fb: UntypedFormBuilder) {
    this.holidayForm = this.fb.group({
      hNo: ['', [Validators.required]],
      hName: ['', [Validators.required]],
      date: ['', [Validators.required]],
      location: ['', [Validators.required]],
      shift: ['', [Validators.required]],
      details: ['', [Validators.required]],
    });
  }
  onSubmit() {
    console.log('Form Value', this.holidayForm.value);
  }
}
