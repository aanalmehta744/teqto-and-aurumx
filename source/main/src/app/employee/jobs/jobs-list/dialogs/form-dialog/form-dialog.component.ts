import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { JobsListService } from '../../jobs-list.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JobsList } from '../../jobs-list.model';
import { formatDate } from '@angular/common';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';


export interface DialogData {
  id: number;
  action: string;
  jobsList: JobsList;
}

@Component({
  selector: 'app-form-dialog:not(f)',
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
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatDialogClose,
  ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  jobsListForm: UntypedFormGroup;
  jobsList: JobsList;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public jobsListService: JobsListService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.jobsList.title;
      this.jobsList = data.jobsList;
    } else {
      this.dialogTitle = 'New JobsList';
      const blankObject = {} as JobsList;
      this.jobsList = new JobsList(blankObject);
    }
    this.jobsListForm = this.createContactForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.status,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('status')
        ? 'Not a valid status'
        : '';
  }

  createContactForm(): UntypedFormGroup {
    const form = this.fb.group({
      id: [this.jobsList.id],
      title: [this.jobsList.title, Validators.required],
      status: [this.jobsList.status, Validators.required],
      vacancies: [this.jobsList.vacancies, [Validators.required, Validators.min(1)]],
      closedVacancies: [this.jobsList.closedVacancies || 0, [Validators.min(0)]],
      department: [this.jobsList.department, Validators.required],
      jobType: [this.jobsList.jobType, Validators.required],
      description: [this.jobsList.description, Validators.required]
    }, { validators: this.closedVacanciesValidator });

    // 🔑 Important: re-check when either field changes
    form.get('vacancies')?.valueChanges.subscribe(() => {
      form.get('closedVacancies')?.updateValueAndValidity({ onlySelf: true });
    });
    form.get('closedVacancies')?.valueChanges.subscribe(() => {
      form.updateValueAndValidity({ onlySelf: true });
    });

    return form;
  }
  // Cross-field validator
  closedVacanciesValidator(group: UntypedFormGroup) {
    const vacancies = group.get('vacancies')?.value || 0;
    const closed = group.get('closedVacancies')?.value || 0;

    const closedControl = group.get('closedVacancies');
    if (closed > vacancies) {
      closedControl?.setErrors({ closedExceeds: true });
    } else {
      if (closedControl?.hasError('closedExceeds')) {
        closedControl.setErrors(null); // clear error when valid
      }
    }
    return null;
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    const formValue = this.jobsListForm.getRawValue();

    if (this.action === 'edit') {
      // Update existing record
      this.jobsListService.updateJobsList(formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Job list has been updated successfully.',
            confirmButtonText: 'OK',
            showConfirmButton: true
          }).then(() => {
            this.dialogRef.close(true);
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Update failed',
            text: 'There was an error updating the job list.',
            confirmButtonText: 'OK',
            showConfirmButton: true
          });
          console.error('Update failed', err);
        },
      });
    } else {
      // Add new record
      this.jobsListService.addJobsList(formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Added!',
            text: 'Job list has been added successfully.',
            confirmButtonText: 'OK',
            showConfirmButton: true
          }).then(() => {
            this.dialogRef.close(true);
          });
        },
        error: (err) => {
          Swal.fire({
            icon: 'error',
            title: 'Add failed',
            text: 'There was an error adding the job list.',
            confirmButtonText: 'OK',
            showConfirmButton: true
          });
          console.error('Add failed', err);
        },
      });
    }
  }
}
