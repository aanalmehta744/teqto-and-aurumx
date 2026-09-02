import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject, OnInit } from '@angular/core';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AllTasksService } from '../../all-tasks.service';
import { MyTasks } from '../../all-tasks.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from 'environments/environment';
import Swal from 'sweetalert2';

export interface DialogData {
  id: number;
  action: string;
  myTasks: MyTasks;
  currentUser?: any;
}

@Component({
  selector: 'app-form-dialog:not(p)',
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
export class FormDialogComponent implements OnInit {
  action: string;
  dialogTitle!: string;
  myTasksForm: UntypedFormGroup;
  myTasks: MyTasks;
  isDetails = false;
  employees: any[] = [];
  projects: any[] = [];
  assignableEmployees: any[] = [];

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public myTasksService: AllTasksService,
    private fb: UntypedFormBuilder,
    private http: HttpClient
  ) {
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.myTasks.title;
      this.myTasks = data.myTasks;
    } else if (this.action === 'details') {
      this.myTasks = data.myTasks;
      this.isDetails = true;
    } else {
      this.dialogTitle = 'Add New Task';
      const blankObject = {} as MyTasks;
      this.myTasks = new MyTasks(blankObject);
    }
    this.myTasksForm = this.createTaskForm();
  }

  ngOnInit(): void {
    if (this.action === 'add' || this.action === 'edit') {
      this.http.get<any[]>(`${environment.apiUrl}/employees`).subscribe({
        next: (data) => { this.employees = data; this.assignableEmployees = this.getAssignableEmployees(data); },
        error: () => {}
      });
      this.http.get<any[]>(`${environment.apiUrl}/projects`).subscribe({
        next: (data) => { this.projects = data; },
        error: () => {}
      });
    }
  }

  getAssignableEmployees(data: any[]): any[] {
    const user = this.data?.currentUser || JSON.parse(localStorage.getItem('currentUser') || 'null');
    const role = (user?.role || '').toLowerCase().trim();
    const userDept = (user?.department || '').toLowerCase().trim();

    // BDE (identified by DEPARTMENT, not role) → can assign to anyone
    // EXCEPT Admin, HR, HR Coordinator, and himself.
    if (userDept === 'bde') {
      return data.filter(e => {
        const r = (e.role || '').toLowerCase().trim();
        const d = (e.department || '').toLowerCase().trim();
        return e.id !== user?.id && r !== 'admin' && d !== 'hr' && d !== 'hr coordinator';
      });
    }

    // HR / HR Coordinator (by DEPARTMENT) → can assign to everyone except Admin.
    if (userDept === 'hr' || userDept === 'hr coordinator') {
      return data.filter(e => (e.role || '').toLowerCase().trim() !== 'admin' && e.id !== user?.id);
    }

    // Senior employee → can assign only to Junior / Intern.
    if (role === 'employee' && user?.employee_level === 'Senior') {
      return data.filter(e => e.employee_level === 'Junior' || e.employee_level === 'Intern');
    }

    // Everyone else (BA / Admin) → all non-admin employees.
    return data.filter(e => (e.role || '').toLowerCase() !== 'admin');
  }

  createTaskForm(): UntypedFormGroup {
    const raw = this.myTasks as any;
    return this.fb.group({
      id: [raw?.id || null],
      employee_id: [raw?.employee_id || null, Validators.required],
      project_id: [raw?.project_id || null],
      title: [this.myTasks.title || '', Validators.required],
      priority: [this.myTasks.priority || 'Normal', Validators.required],
      due_date: [this.myTasks.due_date || null, Validators.required],
      note: [this.myTasks.note || ''],
      done: [raw?.done ?? 0],
      employee_type: [raw?.employee_type || 'Employee'],
      trainer_project_name: [raw?.trainer_project_name || null],
    });
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  public confirmAdd(): void {
    if (this.myTasksForm.invalid) return;
    const payload = this.myTasksForm.getRawValue();
    payload.assigned_by = this.data?.currentUser?.id || JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null;
    if (payload.due_date) {
      const d = new Date(payload.due_date);
      payload.due_date = d.toISOString().slice(0, 10);
    }
    this.myTasksService.addMyTasks(payload).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Task Added!', text: 'Task assigned successfully.', timer: 1500, showConfirmButton: false });
        this.dialogRef.close(1);
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to add task.' });
      }
    });
  }

  public confirmEdit(): void {
    if (this.myTasksForm.invalid) return;
    const payload = this.myTasksForm.getRawValue();
    payload.assigned_by = this.data?.currentUser?.id || JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null;
    if (payload.due_date) {
      const d = new Date(payload.due_date);
      payload.due_date = d.toISOString().slice(0, 10);
    }
    this.myTasksService.updateMyTasks(payload).subscribe({
      next: () => {
        Swal.fire({ icon: 'success', title: 'Updated!', text: 'Task updated successfully.', timer: 1500, showConfirmButton: false });
        this.dialogRef.close(1);
      },
      error: () => {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update task.' });
      }
    });
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
    today.setHours(0, 0, 0, 0);
    date.setHours(0, 0, 0, 0);
    return date < today;
  }
}
