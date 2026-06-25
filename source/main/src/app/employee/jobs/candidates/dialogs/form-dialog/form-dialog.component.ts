import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import {
  UntypedFormControl,
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { CandidatesService } from '../../candidates.service';
import { Candidates } from '../../candidates.model';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
// import { JobsListService } from 'app/employee/jobs/jobs-list/jobs-list.service';
import { JobsListService } from 'app/admin/jobs/jobs-list/jobs-list.service';
import Swal from 'sweetalert2';

export interface DialogData {
  id: number;
  action: string;
  candidates: Candidates;
}

@Component({
  selector: 'app-form-dialog:not(e)',
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
    MatDialogClose,
    CommonModule,
  ],
})
export class FormDialogComponent implements OnInit {
  action: string;
  dialogTitle: string;
  candidatesForm: UntypedFormGroup;
  candidates: Candidates;
  selectedResumeFileName: string = '';
  selectedResumeFile: File | null = null;

  jobs: any[] = [];
  experienceLevels: string[] = ['Fresher', '1-3 Years', '3-5 Years', '5+ Years'];
  genders: string[] = ['Male', 'Female', 'Other'];

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public candidatesService: CandidatesService,
    private fb: UntypedFormBuilder,
    private jobsListService: JobsListService
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.candidates.full_name;
      this.candidates = data.candidates;
    } else {
      this.dialogTitle = 'New Candidate';
      const blankObject = {} as Candidates;
      this.candidates = new Candidates(blankObject);
    }

    this.candidatesForm = this.createContactForm();
  }

  ngOnInit(): void {

    this.joblist();
  }
  joblist(): void {
    this.jobsListService.getAllJobsLists().subscribe({
      next: (data) => (
        this.jobs = data
      ),
      error: (error) => console.error('Error fetching employees:', error),
    });
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.candidates.id],
      full_name: [this.candidates.full_name, Validators.required],
      mobile: [this.candidates.mobile, [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: [this.candidates.email, [Validators.required, Validators.email]],
      linkedin: [this.candidates.linkedin],
      address: [this.candidates.address],
      gender: [this.candidates.gender, Validators.required],
      experience: [this.candidates.experience],
      last_company: [this.candidates.last_company],
      last_ctc: [this.candidates.last_ctc],
      job_id: [this.candidates.job_id || null, Validators.required],
      resume: [this.candidates.resume],
      status: [this.candidates.status || 'New', Validators.required],
      remarks: [this.candidates.remarks]

    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.selectedResumeFile = file;
      this.selectedResumeFileName = file.name;
      this.candidatesForm.patchValue({ resume: file.name });
    }
  }

  submit() {
    if (this.candidatesForm.invalid) return;

    const formData = new FormData();

    Object.entries(this.candidatesForm.value).forEach(([key, value]) => {
      if (key !== 'resume') {
        let valToAppend: string;
        if (value === null || value === undefined) {
          valToAppend = '';
        } else if (typeof value === 'object') {
          valToAppend = JSON.stringify(value);
        } else {
          valToAppend = String(value);
        }
        formData.append(key, valToAppend);
      }
    });

    if (this.selectedResumeFile) {
      formData.append('resume', this.selectedResumeFile, this.selectedResumeFile.name);
    }

    if (this.action === 'edit') {
      this.candidatesService.updateCandidate(formData).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Candidate data has been updated successfully.',
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          console.error('Update error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong while updating!',
          });
        },
      });
    } else {
      this.candidatesService.addCandidates(formData).subscribe({
        next: () => {
          Swal.fire({
            icon: 'success',
            title: 'Added!',
            text: 'New candidate has been added successfully.',
          }).then(() => this.dialogRef.close(true));
        },
        error: (err) => {
          console.error('Add error:', err);
          Swal.fire({
            icon: 'error',
            title: 'Oops...',
            text: 'Something went wrong while adding!',
          });
        },
      });
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }
}
