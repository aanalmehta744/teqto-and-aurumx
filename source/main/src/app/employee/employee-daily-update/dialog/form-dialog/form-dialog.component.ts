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
  isDetails = false;
  projects: any[] = [];
  tasks: any[] = [];
  dailyUpdate: any = {};
  dialogTitle = 'New Daily Update';
  action = 'new';
  updateId: number | null = null;
  selectedTrainerProject: string | null = null;

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
    if (this.action == 'details') {
      this.dailyUpdate = data.updateData
      this.isDetails = true;
      console.log("Edit recode", this.dailyUpdate);
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
        project_id: [''],
        update_date: [new Date(), Validators.required],
        task_id: [''],
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
      // 🔹 Set trainer project if it exists
      if (updateData.trainer_project_name) {
        this.selectedTrainerProject = updateData.trainer_project_name;

        // remove project_id validation if trainer project
        this.dailyUpdateForm.get('project_id')?.clearValidators();
        this.dailyUpdateForm.get('project_id')?.updateValueAndValidity();
      }
    }
    this.dailyUpdateForm.get('task_id')?.valueChanges.subscribe((taskId) => {
      const selectedTask = this.tasks.find(t => t.id === taskId);

      if (selectedTask) {
        if (selectedTask.trainer_project_name) {
          // Trainer task → Show trainer project
          this.selectedTrainerProject = selectedTask.trainer_project_name;
          this.dailyUpdateForm.get('project_id')?.clearValidators(); // not required
          this.dailyUpdateForm.get('project_id')?.updateValueAndValidity();
        } else {
          // Regular task → use project dropdown
          this.selectedTrainerProject = null;
          this.dailyUpdateForm.get('project_id')?.setValidators([Validators.required]);
          this.dailyUpdateForm.get('project_id')?.updateValueAndValidity();

          // Preselect project_id if task has a project_id
          if (selectedTask.project_id) {
            this.dailyUpdateForm.patchValue({ project_id: selectedTask.project_id });
          }
        }
      }
    });

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
      const formData: any = {
        employee_id: rawData.employee_id,
        update_date: this.formatDate(rawData.update_date),
        update_details: rawData.update_details,
        status: rawData.status,
        task_id: rawData.task_id
      };

      if (!this.isHrDepartment()) {
        if (this.selectedTrainerProject) {
          // Trainer task → save trainer_project_name instead of project_id
          formData.trainer_project_name = this.selectedTrainerProject;
          formData.project_id = null;  // or skip it completely
        } else {
          // Regular task → save project_id
          formData.project_id = rawData.project_id;
        }
      }

      console.log("Submit record", formData);

      if (this.action === 'edit' && this.updateId !== null) {
        this.dailyUpdateService.updateDailyUpdate(this.updateId, formData).subscribe({
          next: (res) => {
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Daily update has been updated successfully.',
              confirmButtonText: 'OK'
            }).then(() => {
              this.dialogRef.close(res);
            });
          },
          error: (err) => {
            console.error('Error updating daily update:', err);
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'Something went wrong while updating!',
              confirmButtonText: 'OK'
            });
          }
        });
      } else {
        this.dailyUpdateService.addUpdate(formData).subscribe({
          next: (res) => {
            Swal.fire({
              icon: 'success',
              title: 'Saved!',
              text: 'Daily update has been added successfully.',
              confirmButtonText: 'OK'
            }).then(() => {
              this.dialogRef.close(res);
            });
          },
          error: (err) => {
            console.error('Error saving daily update:', err);
            Swal.fire({
              icon: 'error',
              title: 'Oops...',
              text: 'Something went wrong while saving!',
              confirmButtonText: 'OK'
            });
          }
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
    const date = new Date(dateString);
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  }
  isOverdue(dateString: string): boolean {
    const today = new Date();
    const date = new Date(dateString);

    // Set both to start of the day for comparison
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);

    return date < today;
  }

}