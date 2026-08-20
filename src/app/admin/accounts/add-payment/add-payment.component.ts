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
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-add-payment',
  templateUrl: './add-payment.component.html',
  styleUrls: ['./add-payment.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatButtonModule,
  ],
})
export class AddPaymentComponent {
  paymentForm: UntypedFormGroup;
  constructor(private fb: UntypedFormBuilder) {
    this.paymentForm = this.fb.group({
      bNo: ['', [Validators.required]],
      cName: ['', [Validators.required]],
      eName: ['', [Validators.required]],
      pDate: ['', [Validators.required]],
      dDate: ['', [Validators.required]],
      discount: [''],
      total: [''],
      pMethod: ['', [Validators.required]],
      pStatus: ['', [Validators.required]],
    });
  }
  onSubmit() {
    console.log('Form Value', this.paymentForm.value);
  }
}
