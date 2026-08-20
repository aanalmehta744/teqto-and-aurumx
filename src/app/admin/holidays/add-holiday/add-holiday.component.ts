// import { Component } from '@angular/core';
// import {
//   UntypedFormBuilder,
//   UntypedFormGroup,
//   Validators,
//   FormsModule,
//   ReactiveFormsModule,
// } from '@angular/forms';
// import { MatButtonModule } from '@angular/material/button';
// import { MatDatepickerModule } from '@angular/material/datepicker';
// import { MatInputModule } from '@angular/material/input';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
// @Component({
//   selector: 'app-add-holiday',
//   templateUrl: './add-holiday.component.html',
//   styleUrls: ['./add-holiday.component.scss'],
//   standalone: true,
//   imports: [
//     BreadcrumbComponent,
//     FormsModule,
//     ReactiveFormsModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatDatepickerModule,
//     MatButtonModule,
//   ],
// })
// export class AddHolidayComponent {
//   holidayForm: UntypedFormGroup;
//   constructor(private fb: UntypedFormBuilder) {
//     this.holidayForm = this.fb.group({
//       hNo: ['', [Validators.required]],
//       hName: ['', [Validators.required]],
//       date: ['', [Validators.required]],
//       location: ['', [Validators.required]],
//       shift: ['', [Validators.required]],
//       details: ['', [Validators.required]],
//     });
//   }
//   onSubmit() {
//     console.log('Form Value', this.holidayForm.value);
//   }
// }

import { Component } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { formatDate } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { HolidayService } from '../all-holidays/all-holidays.service'; // adjust path if your folder structure differs

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
  isSubmitting = false;

  constructor(
    private fb: UntypedFormBuilder,
    private holidayService: HolidayService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.holidayForm = this.fb.group({
      hNo: ['', [Validators.required]],
      hName: ['', [Validators.required]],
      date: ['', [Validators.required]],
      location: ['', [Validators.required]],
      shift: ['', [Validators.required]],
      details: ['', [Validators.required]],
    });
  }

  onSubmit(): void {
    if (this.holidayForm.invalid) {
      this.holidayForm.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;

    const formValue = this.holidayForm.value;

    // Format date as plain yyyy-MM-dd to avoid timezone shift issues
    // (matches the fix already applied on the calendar side)
    const payload = {
      ...formValue,
      date: formatDate(formValue.date, 'yyyy-MM-dd', 'en'),
    };

    this.holidayService.addHoliday(payload).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.snackBar.open('Holiday added successfully', '', {
          duration: 2000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
        });
        this.holidayForm.reset();
        this.router.navigate(['/calendar']); // adjust route if your calendar path differs
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('Failed to add holiday:', err);
        this.snackBar.open('Failed to add holiday', '', {
          duration: 2000,
          verticalPosition: 'bottom',
          horizontalPosition: 'center',
        });
      },
    });
  }
}