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
import Swal from 'sweetalert2';


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
    MatNativeDateModule
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
      this.updateId = data?.updateData?.id || null;
    }
  }

  ngOnInit(): void {
    const isHR = this.isHrDepartment();

    this.dailyUpdateForm = isHR
      ? this.fb.group({
        employee_id: [this.getLoggedInUserId()],
        update_date: [new Date(), Validators.required],
        update_details: ['', Validators.required],
      })
      : this.fb.group({
        employee_id: [this.getLoggedInUserId()],
        project_id: ['', Validators.required],
        update_date: [new Date(), Validators.required],
        task_id: ['', Validators.required],
        update_details: ['', Validators.required],
        status: ['', Validators.required],
      });

    if (!isHR) {
      this.loadProjects();
      this.loadTasks();
    }

    if (this.action === 'edit' && this.data?.updateData) {
      const updateData = this.data.updateData;

      this.dailyUpdateForm.patchValue({
        employee_id: updateData.employee_id,
        update_date: new Date(updateData.update_date),
        update_details: updateData.update_details,
        ...(isHR
          ? {}
          : {
            project_id: updateData.project_id,
            task_id: updateData.task_id,
            status: updateData.status,
          }),
      });
    }
  }

  isHrDepartment(): boolean {
    const userString = localStorage.getItem('currentUser');
    if (userString) {
      try {
        const user = JSON.parse(userString);
        return user.department?.toLowerCase() === 'bde';
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
      const formData: any = {
        employee_id: rawData.employee_id,
        update_date: this.formatDate(rawData.update_date),
        update_details: rawData.update_details
      };

      if (!this.isHrDepartment()) {
        formData.project_id = rawData.project_id;
        formData.task_id = rawData.task_id;
        formData.status = rawData.status;
      }

      if (this.action === 'edit' && this.updateId !== null) {
        this.dailyUpdateService.updateDailyUpdate(this.updateId, formData).subscribe({
          next: (res) => {
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Daily update has been updated successfully.',
              timer: 2000,
              confirmButtonText: 'OK',
              confirmButtonColor: '#3085d6'
            });
            this.dialogRef.close(res);
          },
          error: (err) => console.error('Error updating daily update:', err)
        });
      } else {
        this.dailyUpdateService.addUpdate(formData).subscribe({
          next: (res) => {
            Swal.fire({
              icon: 'success',
              title: 'Added!',
              text: 'Daily update has been added successfully.',
              confirmButtonText: 'OK',
              confirmButtonColor: '#3085d6'
            });
            this.dialogRef.close(res);
          },
          error: (err) => console.error('Error saving daily update:', err)
        });
      }
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
