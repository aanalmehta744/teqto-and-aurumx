import { Component } from '@angular/core';
import { UntypedFormBuilder, UntypedFormGroup, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { EmployeesService } from '../allEmployees/employees.service';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import Swal from 'sweetalert2';
import { MatIconModule } from '@angular/material/icon';
import { formatDate } from '@angular/common';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { Router } from '@angular/router';

@Component({
  selector: 'app-add-employee',
  templateUrl: './add-employee.component.html',
  styleUrls: ['./add-employee.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    CommonModule,
    FormsModule,
    ReactiveFormsModule,  // ✅ Make sure this is included
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    FileUploadComponent,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY'], // Acceptable input formats
        },
        display: {
          dateInput: 'YYYY-MM-DD', // Display format in input box
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
  ]
})
export class AddEmployeeComponent {
  docForm: UntypedFormGroup;
  hidePassword = true;
  hideConfirmPassword = true;


  constructor(private fb: UntypedFormBuilder, private employeeService: EmployeesService, private router: Router) {
    this.docForm = this.fb.group({
      fullName: ['', [Validators.required, Validators.pattern('^[a-zA-Z ]+$')]], // ✅ Allow spaces in names
      role: ['', Validators.required],
      gender: ['', Validators.required],
      mobile: ['', [Validators.required, Validators.pattern('^[0-9]{10}$')]], // ✅ 10-digit validation
      password: ['', [Validators.required, Validators.minLength(6)]], // ✅ At least 6 chars
      conformPassword: ['', Validators.required], // ✅ Needs confirmation check
      department: ['', Validators.required],
      address: [''],
      joining_date: ['', Validators.required],
      salary: ['', [Validators.required, Validators.min(1)]], // ✅ Salary must be > 0
      email: ['', [Validators.required, Validators.email, Validators.minLength(5)]],
      dob: ['', Validators.required],
      uploadImg: [null],
      panCard: [
        '',
        [Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')],
      ],
      aadharCard: [
        '',
        [Validators.pattern('^[0-9]{12}$')],
      ],
      status: [true],  // true = Active, false = Inactive
      employment_type: [true],  // true = Active, false = Inactive
      termination_date: ['']
    }, { validator: this.passwordMatchValidator }); // ✅ Add validator for password matching
  }

  passwordMatchValidator(form: UntypedFormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('conformPassword');

    if (password && confirmPassword) {
      const mismatch = password.value !== confirmPassword.value;

      if (mismatch) {
        confirmPassword.setErrors({ mismatch: true });
      } else {
        // ✅ Clear mismatch error if they match
        if (confirmPassword.hasError('mismatch')) {
          confirmPassword.setErrors(null);
        }
      }
    }

    return null; // Don't set error on the group
  }


  onSubmit() {
    if (this.docForm.valid) {
      const employeeData = this.docForm.value;
      employeeData.dob = this.formatDateForDB(employeeData.dob);
      employeeData.joining_date = this.formatDateForDB(employeeData.joining_date);
      employeeData.termination_date = this.formatDateForDB(employeeData.termination_date);
      console.log('Form Data:', employeeData);
      this.employeeService.addEmployees(employeeData).subscribe(
        (response) => {
          console.log('Employee Added:', response);
          Swal.fire({
            icon: 'success',
            title: 'Success!',
            text: 'Employee saved successfully!',
            confirmButtonColor: '#3085d6',
          }).then(() => {
            // window.location.reload();
            // Redirect based on role
            if (employeeData.role?.toLowerCase() === 'bde') {
              this.router.navigate(['/employee/employee-list/bde-employee']);
            } else {
              this.router.navigate(['/employee/employee-list/allEmployees']);
            }

          });
        },
        (error) => {
          console.error('Error adding employee:', error);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to add employee. Please try again!',
          });
        }
      );
    } else {
      Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please fill in all required fields correctly.',
      });
    }
  }
  /**
* Utility function to format the date for database storage
*/
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
}
