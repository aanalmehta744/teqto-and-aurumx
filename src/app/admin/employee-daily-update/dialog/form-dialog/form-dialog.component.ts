import { Component, Inject, OnInit, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MyProjectsService } from 'app/employee/my-projects/my-projects.service';
import { MyTasksService } from 'app/employee/my-tasks/my-tasks.service';
import { EmployeeDailyUpdateService } from '../../employee-daily-update.service';
import { NgScrollbar } from 'ngx-scrollbar';
@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule,
    NgScrollbar
  ],
  templateUrl: './form-dialog.component.html',
  styleUrl: './form-dialog.component.scss'
})
export class FormDialogComponent implements OnInit {
  dailyUpdateForm!: FormGroup;
  projects: any[] = [];
  tasks: any[] = [];
  dialogTitle = 'New Daily Update';
  action = 'new';
  updateId: number | null = null;
  isDetails = false;
  update_details: any;

  // Inject services  
  private fb = inject(FormBuilder);
  public dialogRef = inject(MatDialogRef<FormDialogComponent>);

  constructor(
    public myProjectsService: MyProjectsService,
    public myTasksService: MyTasksService,
    public dailyUpdateService: EmployeeDailyUpdateService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.action = data?.action || 'new';
    if (this.action === 'edit') {
      this.dialogTitle = 'Edit Daily Update';
      this.isDetails = false;
      this.updateId = data?.updateData?.project_id || null;
      console.log(this.data);
    }
    else if (this.action === 'details') {
      this.update_details = data.updateData;
      console.log(this.update_details);
      this.isDetails = true;
    }
  }

  ngOnInit(): void {
    const isHR = this.isHrDepartment();

    this.dailyUpdateForm = this.fb.group({
      project_id: ['', Validators.required],
      progress: [null, [Validators.required, Validators.min(0), Validators.max(100)]],
    });


    if (!isHR) {
      this.loadProjects();
      this.loadTasks();
    }

    if (this.action === 'edit' && this.data?.updateData) {
      const updateData = this.data.updateData;
      this.dailyUpdateForm.patchValue({

        project_id: updateData.project_id,
        progress: updateData.progress,
      });
    }
  }

  isHrDepartment(): boolean {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        return user.department?.toLowerCase() === 'hr';
      } catch {
        return false;
      }
    }
    return false;
  }

  getLoggedInUserId(): number {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        return user.id;
      } catch (error) {
        console.error('Invalid JSON in localStorage for currentUser');
        return 0;
      }
    }
    return 0;
  }

  loadProjects(): void {
    this.myProjectsService.getAllMyProjectss().subscribe((res) => {
      this.projects = res;
    });
  }

  loadTasks(): void {
    this.myTasksService.getAllMyTaskss().subscribe((res) => {
      this.tasks = res;
    });
  }

  onSubmit(): void {
    if (this.dailyUpdateForm.valid) {
      const rawData = this.dailyUpdateForm.value;
      const formData = {
        project_id: rawData.project_id,
        progress: rawData.progress,
      };

      const request$ = this.action === 'edit' && this.updateId !== null
        ? this.dailyUpdateService.updateDailyUpdate(this.updateId, formData)
        : this.dailyUpdateService.addUpdate(formData);

      request$.subscribe({
        next: (res) => this.dialogRef.close(res),
        error: (err) => console.error('Error submitting daily update:', err),
      });
    }
  }


  formatDate(date: Date): string {
    const d = new Date(date);
    const month = `${d.getMonth() + 1}`.padStart(2, '0');
    const day = `${d.getDate()}`.padStart(2, '0');
    const year = d.getFullYear();
    return `${year}-${month}-${day}`;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  isToday(dateString: string): boolean {
    const today = new Date();
    const taskDate = new Date(dateString);
    return (
      taskDate.getFullYear() === today.getFullYear() &&
      taskDate.getMonth() === today.getMonth() &&
      taskDate.getDate() === today.getDate()
    );
  }
}
