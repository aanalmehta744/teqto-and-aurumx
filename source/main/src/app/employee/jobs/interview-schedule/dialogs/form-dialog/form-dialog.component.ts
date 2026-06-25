import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import {
  Validators,
  UntypedFormGroup,
  UntypedFormBuilder,
  FormsModule,
  ReactiveFormsModule
} from '@angular/forms';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import Swal from 'sweetalert2';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { InterviewService } from '../../interview.service';
import { CandidatesService } from 'app/employee/jobs/candidates/candidates.service';
import { JobsListService } from 'app/employee/jobs/jobs-list/jobs-list.service';
import { formatDate, DatePipe } from '@angular/common';
import { EmployeesService } from 'app/admin/employees/allEmployees/employees.service';

@Component({
  selector: 'app-form-dialog',
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
    MatDatepickerModule,
    MatNativeDateModule
  ]
})
export class FormDialogComponent implements OnInit {
  interviewForm: UntypedFormGroup;
  dialogTitle = 'Schedule Interview';
  action: string = 'add';

  candidates: any[] = [];
  jobs: any[] = [];
  employees: any[] = [];

  constructor(
    private fb: UntypedFormBuilder,
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private interviewService: InterviewService,
    private candidatesService: CandidatesService,
    private jobsService: JobsListService,
    private employeesService: EmployeesService
  ) {
    this.action = data?.action || 'add';
    this.dialogTitle = this.action === 'edit' ? 'Edit Interview' : 'Schedule Interview';

    this.interviewForm = this.fb.group({
      id: [data?.schedule?.id || null],
      candidate_id: [data?.schedule?.candidate_id || null, Validators.required],
      job_id: [data?.schedule?.job_id || null, Validators.required],
      interview_date: [data?.schedule?.interview_date || null, Validators.required],
      // interview_time: [data?.schedule?.interview_time || null, Validators.required],
      interview_time: [
        data?.schedule?.interview_time
          ? this.convertTo24Hour(data.schedule.interview_time)
          : null,
        Validators.required
      ],
      interview_type: [data?.schedule?.interview_type || null, Validators.required],
      mode: [data?.schedule?.mode || null, Validators.required],
      location: [data?.schedule?.location || ''],
      status: [data?.schedule?.status || 'Scheduled'],
      remarks: [data?.schedule?.remarks || ''],
      assigned_to: [data?.schedule?.employee_id || null, Validators.required]
    });
    console.log("Edit recode", data.schedule);
  }
  ngOnInit(): void {
    this.loadCandidates();
    this.loadJobs();
    this.loadEmployees();
  }
  loadCandidates() {
    this.candidatesService.getAllCandidates().subscribe({
      next: (res: any) => {
        this.candidates = res;
      },
      error: (err: any) => {
        console.error('Error fetching candidates', err);
      }
    });
  }

  loadJobs() {
    this.jobsService.getAllJobsLists().subscribe({
      next: (res: any) => {
        this.jobs = res;
      },
      error: (err: any) => {
        console.error('Error fetching jobs', err);
      }
    });
  }
  loadEmployees() {
    this.employeesService.getAllEmployeess().subscribe({
      next: (res: any) => this.employees = res,
      error: (err: any) => console.error('Error fetching employees', err)
    });
  }
  submit() {
    if (this.interviewForm.invalid) return;

    const payload = this.interviewForm.value;

    // Convert interview_date
    const formattedDate = formatDate(payload.interview_date, 'yyyy-MM-dd', 'en');

    // Convert interview_time (24h -> 12h with AM/PM)
    const formattedTime = this.formatTo12Hour(payload.interview_time);

    const interviewData = {
      ...payload,
      interview_date: formattedDate,
      interview_time: formattedTime   // <-- now in AM/PM format
    };

    console.log("Submit data", interviewData);

    if (this.action === 'edit') {
      this.interviewService.updateInterview(interviewData.id, interviewData).subscribe({
        next: () => {
          Swal.fire('Updated!', 'Interview has been updated successfully.', 'success')
            .then(() => this.dialogRef.close(true));
        },
        error: (err: any) => {
          console.error('Update error:', err);
          Swal.fire('Oops...', 'Something went wrong while updating!', 'error');
        }
      });
    } else {
      this.interviewService.createInterview(interviewData).subscribe({
        next: () => {
          Swal.fire('Added!', 'Interview has been scheduled successfully.', 'success')
            .then(() => this.dialogRef.close(true));
        },
        error: (err: any) => {
          console.error('Add error:', err);
          Swal.fire('Oops...', 'Something went wrong while adding!', 'error');
        }
      });
    }
  }

  /** Convert "hh:mm AM/PM" -> "HH:mm" (for <input type="time">) */
  private convertTo24Hour(time12h: string): string {
    if (!time12h) return '';

    const [time, modifier] = time12h.split(' ');
    let [hours, minutes] = time.split(':');

    let hrs = parseInt(hours, 10);
    if (modifier?.toUpperCase() === 'PM' && hrs < 12) {
      hrs += 12;
    }
    if (modifier?.toUpperCase() === 'AM' && hrs === 12) {
      hrs = 0;
    }

    return `${hrs.toString().padStart(2, '0')}:${minutes}`;
  }

  /** Convert "HH:mm" -> "hh:mm AM/PM" */
  private formatTo12Hour(time: string): string {
    if (!time) return '';
    const [hours, minutes] = time.split(':').map(Number);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const adjHours = hours % 12 || 12;
    return `${adjHours}:${minutes.toString().padStart(2, '0')} ${suffix}`;
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
}
