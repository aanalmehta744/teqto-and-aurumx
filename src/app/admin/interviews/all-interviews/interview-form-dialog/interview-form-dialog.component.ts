import {
  Component,
  Inject,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  Interview,
  InterviewStatus
} from '../../interview.model';

import {
  InterviewService
} from '../../interview.service';


export interface InterviewFormDialogData {
  mode: 'add' | 'edit';
  interview: Interview | null;
  hrName: string;
}


// Result handed back to the list component when the dialog is saved.
export type InterviewFormResult = Partial<Interview>;


@Component({
  selector: 'app-interview-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl:
    './interview-form-dialog.component.html',
  styleUrls: [
    './interview-form-dialog.component.scss'
  ]
})
export class InterviewFormDialogComponent implements OnInit {

  // Working copy bound to the form.
  model: Interview;

  mode: 'add' | 'edit';

  // Inline field errors shown to the user.
  errors: { [key: string]: string } = {};

  // Profile options (department names).
  departments: string[] = [];


  constructor(
    private dialogRef:
      MatDialogRef<InterviewFormDialogComponent>,

    private interviewService: InterviewService,

    @Inject(MAT_DIALOG_DATA)
    public data: InterviewFormDialogData
  ) {

    this.mode = data.mode;

    const existing = data.interview;

    this.model = {
      id: existing?.id,
      hr_name: existing?.hr_name || data.hrName || '',
      candidate_name: existing?.candidate_name || '',
      candidate_number: existing?.candidate_number || '',
      candidate_email: existing?.candidate_email || '',
      profile: existing?.profile || '',
      linkedin_link: existing?.linkedin_link || '',
      resume: existing?.resume || '',
      interview_date: this.toDateInput(existing?.interview_date),
      hr_call_details: existing?.hr_call_details || '',
      hr_call_status: existing?.hr_call_status || 'pending',
      joined_status: existing?.joined_status || 'pending',
      joining_note: existing?.joining_note || '',
      final_call_notes: existing?.final_call_notes || '',
      final_call_status: existing?.final_call_status || 'pending',
      status: (existing?.status as InterviewStatus) || 'upcoming'
    };
  }


  ngOnInit(): void {
    this.interviewService.getDepartments().subscribe({
      next: (data) => {
        this.departments = (data || [])
          .map((d: any) => d?.name)
          .filter((n: any) => !!n);
      },
      error: () => { this.departments = []; }
    });
  }


  // Convert an ISO / DB date string into yyyy-MM-dd for <input type="date">.
  private toDateInput(value?: string): string {
    if (!value) {
      return '';
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }
    const d = new Date(value);
    if (isNaN(d.getTime())) {
      return '';
    }
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${month}-${day}`;
  }


  private validate(): boolean {
    this.errors = {};

    if (!this.model.hr_name?.trim()) {
      this.errors['hr_name'] = 'HR name is required.';
    }
    if (!this.model.candidate_name?.trim()) {
      this.errors['candidate_name'] = 'Candidate name is required.';
    }
    if (!this.model.candidate_number?.trim()) {
      this.errors['candidate_number'] = 'Candidate number is required.';
    }
    if (!this.model.interview_date?.trim()) {
      this.errors['interview_date'] = 'Interview date is required.';
    }

    return Object.keys(this.errors).length === 0;
  }


  save(): void {
    if (!this.validate()) {
      return;
    }

    const payload: InterviewFormResult = {
      hr_name: this.model.hr_name.trim(),
      candidate_name: this.model.candidate_name.trim(),
      candidate_number: this.model.candidate_number.trim(),
      candidate_email: this.model.candidate_email?.trim() || null,
      profile: this.model.profile?.trim() || null,
      linkedin_link: this.model.linkedin_link?.trim() || null,
      resume: this.model.resume?.trim() || null,
      interview_date: this.model.interview_date,
      hr_call_details: this.model.hr_call_details?.trim() || null,
      hr_call_status: this.model.hr_call_status || 'pending',
      final_call_notes: this.model.final_call_notes?.trim() || null,
      final_call_status: this.model.final_call_status || 'pending',
      joined_status: this.model.joined_status || 'pending',
      joining_note: this.model.joining_note?.trim() || null,
      status: this.model.status
    };

    this.dialogRef.close(payload);
  }


  cancel(): void {
    this.dialogRef.close();
  }
}
