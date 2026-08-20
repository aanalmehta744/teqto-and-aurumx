import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { EmployeesService } from '../../employees.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Employees } from '../../employees.model';
import { formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import Swal from 'sweetalert2';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';

export interface DialogData {
  id: number;
  action: string;
  employees: Employees;
}
@Component({
  selector: 'app-form-dialog:not(c)',
  templateUrl: './form-dialog.component.html',
  styleUrls: ['./form-dialog.component.scss'],
  standalone: true,
  imports: [
    MatButtonModule,
    CommonModule,
    MatIconModule,
    MatDialogContent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatDialogClose,
    MatOptionModule,
    MatSelectModule,
    MatDialogModule,
    MatSlideToggleModule
  ],
})
export class FormDialogComponent implements OnInit {
  action: string;
  dialogTitle: string;
  employeesForm: UntypedFormGroup;
  employees: Employees;
  hidePassword: boolean = true;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public employeesService: EmployeesService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.employees.fullName;
      this.employees = data.employees;
    } else {
      this.dialogTitle = 'New Employees';
      const blankObject = {} as Employees;
      this.employees = new Employees(blankObject);
    }
    this.employeesForm = this.createContactForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.employees.id || ''],
      fullName: [
        this.employees.fullName || '',
        [Validators.required, Validators.pattern('^[a-zA-Z ]+$')],
      ],
      role: [this.employees.role || '', Validators.required],
      gender: [this.employees.gender || '', Validators.required],
      mobile: [
        this.employees.mobile || '',
        [Validators.required, Validators.pattern('^[0-9]{10}$')],
      ],
      email: [
        this.employees.email || '',
        [Validators.required, Validators.email, Validators.minLength(5)],
      ],
      dob: [
        this.employees.dob ? formatDate(this.employees.dob, 'yyyy-MM-dd', 'en') : null,
        Validators.required,
      ],
      joining_date: [
        this.employees.joining_date ? formatDate(this.employees.joining_date, 'yyyy-MM-dd', 'en') : null,
        Validators.required,
      ],
      salary: [
        this.employees.salary || '',
        [Validators.required, Validators.min(1)],
      ],
      address: [this.employees.address || ''],
      department: [this.employees.department || '', Validators.required],
      panCard: [
        this.employees.panCard || '',
        [Validators.pattern('^[A-Z]{5}[0-9]{4}[A-Z]{1}$')],
      ],
      aadharCard: [
        this.employees.aadharCard || '',
        [Validators.pattern('^[0-9]{12}$')],
      ],
      status: [this.employees.status === 0 ? false : true],
      employment_type: [this.employees.employment_type || ''],
      termination_date: [
        this.employees.termination_date
          ? formatDate(this.employees.termination_date, 'yyyy-MM-dd', 'en')
          : null
      ]
    });

  }
  ngOnInit() {
    this.employeesForm.get('status')?.valueChanges.subscribe(status => {
      const terminationControl = this.employeesForm.get('termination_date');
      if (status === 0) {
        terminationControl?.setValidators([Validators.required]);
      } else {
        terminationControl?.clearValidators();
        terminationControl?.reset(); // clear if switched back to Active
      }
      terminationControl?.updateValueAndValidity();
    });
  }

  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    const formData = this.employeesForm.getRawValue();
    formData.dob = this.formatDateForDB(formData.dob);
    formData.joining_date = this.formatDateForDB(formData.joining_date);
    formData.termination_date = this.formatDateForDB(formData.termination_date);
    console.log("submited value", formData);
    if (this.action === 'edit') {
      this.employeesService.updateEmployees(this.employees.id, formData).subscribe(
        (response) => {
          Swal.fire({
            title: 'Success!',
            text: 'Employee updated successfully',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.dialogRef.close(true);
            window.location.reload();
          });
        },
        (error) => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to update employee',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          console.error('Error updating employee:', error);
        }
      );
    } else {
      this.employeesService.addEmployees(formData).subscribe(
        (response) => {
          Swal.fire({
            title: 'Success!',
            text: 'Employee added successfully',
            icon: 'success',
            confirmButtonText: 'OK'
          }).then(() => {
            this.dialogRef.close(true);
            window.location.reload();
          });
        },
        (error) => {
          Swal.fire({
            title: 'Error!',
            text: 'Failed to add employee',
            icon: 'error',
            confirmButtonText: 'OK'
          });
          console.error('Error adding employee:', error);
        }
      );
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
