import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { JobsListService } from '../../jobs-list.service';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { JobsList } from '../../jobs-list.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';

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
    CommonModule
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
      this.dialogTitle = `${data.jobsList.title}`;
      this.jobsList = data.jobsList;
    } else {
      this.dialogTitle = 'Add New Job';
      const blankObject = {} as JobsList;
      this.jobsList = new JobsList(blankObject);
    }

    this.jobsListForm = this.createContactForm();
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


  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    if (this.jobsListForm.invalid) {
      this.jobsListForm.markAllAsTouched();
      return;
    }

    const formValue = this.jobsListForm.getRawValue();

    // Auto-close when all filled
    if (formValue.closedVacancies === formValue.vacancies) {
      formValue.status = 'Closed';
    }

    if (this.action === 'edit') {
      this.jobsListService.updateJobsList(formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Job Updated',
            text: `${formValue.title} was updated successfully.`,
            confirmButtonText: 'OK'
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Update failed', err);
          Swal.fire({
            icon: 'error',
            title: 'Update Failed',
            text: 'There was a problem updating the job.',
          });
        },
      });
    } else {
      this.jobsListService.addJobsList(formValue).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Job Added',
            text: `${formValue.title} was added successfully.`,
            confirmButtonText: 'OK'
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Add failed', err);
          Swal.fire({
            icon: 'error',
            title: 'Add Failed',
            text: 'There was a problem adding the job.',
          });
        },
      });
    }
  }
  submit() {

  }
}
