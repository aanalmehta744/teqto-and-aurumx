import { Component, OnInit } from '@angular/core';
import { CdkDragDrop, moveItemInArray, CdkDropList, CdkDrag, CdkDragHandle, CdkDragPlaceholder } from '@angular/cdk/drag-drop';
import { UntypedFormGroup, UntypedFormControl, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { Task } from './task.model';
import { NgClass, DatePipe, CommonModule, formatDate } from '@angular/common';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { TaskService } from './task.service';
import { EmployeesService } from 'app/admin/employees/allEmployees/employees.service';
import { ProjectService } from 'app/admin/projects/all-projects/core/project.service';
import { NgxEditorModule, Toolbar } from 'ngx-editor';
import { Editor } from 'ngx-editor';
import { MatDialog } from '@angular/material/dialog';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteComponent } from './dialogs/delete/delete.component';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';

@Component({
  selector: 'app-task',
  templateUrl: './task.component.html',
  styleUrls: ['./task.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatSidenavModule,
    MatTooltipModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    NgScrollbar,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    CdkDragPlaceholder,
    NgClass,
    DatePipe,
    CommonModule,
    NgxEditorModule,
    MatDialogModule,
    FeatherIconsComponent
  ],
})
export class TaskComponent implements OnInit {
  mode = new UntypedFormControl('side');
  taskForm: UntypedFormGroup;
  isNewEvent = false;
  dialogTitle?: string;
  tasks: Task[] = [];
  employees: any[] = []; // Store employees from API
  assignableEmployees: any[] = [];
  projects: any[] = []; // Store employees from API
  editor: Editor = new Editor();
  toolbar: Toolbar = [
    ['bold', 'italic'],
    ['underline', 'strike'],
    ['code', 'blockquote'],
    ['ordered_list', 'bullet_list'],
    [{ heading: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] }],
    ['link', 'image'],
    ['text_color', 'background_color'],
    ['align_left', 'align_center', 'align_right', 'align_justify'],
  ];
  activeTab: 'pending' | 'completed' = 'pending';
  activePriority: 'All' | 'High' | 'Normal' | 'Low' = 'All';

  constructor(
    private fb: UntypedFormBuilder,
    private taskService: TaskService,
    private employeesService: EmployeesService,
    private projectService: ProjectService,
    private dialog: MatDialog,
  ) {
    this.taskForm = this.createFormGroup({} as Task);
    this.loadTasks();
  }
  ngOnInit(): void {
    this.loadTasks();
    this.loadEmployees();
    this.loadProjects();
    this.editor = new Editor();
  }

  setTab(tab: 'pending' | 'completed') {
    this.activeTab = tab;
    // Reset priority filter when switching tabs
    this.activePriority = 'All';
  }

  setPriorityFilter(priority: 'All' | 'High' | 'Normal' | 'Low') {
    this.activePriority = priority;
  }

  getFilteredTasks() {
    let filtered = [];

    if (this.activeTab === 'pending') {
      filtered = this.tasks.filter(task => !task.done);
    } else {
      filtered = this.tasks.filter(task => task.done);
    }

    // Apply priority filter only if we're in the pending tab
    if (this.activeTab === 'pending' && this.activePriority !== 'All') {
      filtered = filtered.filter(task => task.priority === this.activePriority);
    }

    return filtered;
  }

  // make sure to destory the editor
  ngOnDestroy(): void {
    this.editor?.destroy();

  }
  loadTasks() {
    this.taskService.getTasks().subscribe((data) => {
      this.tasks = data;
      console.log("Task List", this.tasks);
    });
  }
  loadEmployees() {
    // this.employeesService.getAllEmployeess().subscribe((data) => {
    //   this.employees = data;
    //   const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    //   this.assignableEmployees = (user?.role?.toLowerCase() === 'employee' && user?.employee_level === 'Senior')
    //     ? data.filter((e: any) => e.employee_level === 'Junior' || e.employee_level === 'Intern')
    //     : data;
    // });
  this.employeesService.getAllEmployeess().subscribe((data) => {
  this.employees = data;

  const currentUser = JSON.parse(
    localStorage.getItem('currentUser') || 'null'
  );

  const currentRole = String(currentUser?.role || '')
    .toLowerCase()
    .trim();

  const currentLevel = String(currentUser?.employee_level || '')
    .toLowerCase()
    .trim();

  const currentDepartment = String(currentUser?.department || '')
    .toLowerCase()
    .trim();

  const currentUserId = currentUser?.id;

  // Admin can assign to everyone
  if (currentRole === 'admin') {
    this.assignableEmployees = data;
    return;
  }

  // BDE (by department) → everyone EXCEPT Admin, HR, HR Coordinator, and self
  if (currentDepartment === 'bde') {
    this.assignableEmployees = data.filter((emp: any) => {
      const r = String(emp.role || '').toLowerCase().trim();
      const d = String(emp.department || '').toLowerCase().trim();
      return emp.id !== currentUserId && r !== 'admin' && d !== 'hr' && d !== 'hr coordinator';
    });
    return;
  }

  // HR / HR Coordinator (by department) → everyone EXCEPT Admin (and self)
  if (currentDepartment === 'hr' || currentDepartment === 'hr coordinator') {
    this.assignableEmployees = data.filter((emp: any) =>
      String(emp.role || '').toLowerCase().trim() !== 'admin' && emp.id !== currentUserId);
    return;
  }

  // Senior can assign ONLY to Junior and Intern
  // in the SAME department
  if (
    currentRole === 'employee' &&
    currentLevel === 'senior'
  ) {
    this.assignableEmployees = data.filter((emp: any) => {
      const employeeLevel = String(emp.employee_level || '')
        .toLowerCase()
        .trim();

      const employeeDepartment = String(emp.department || '')
        .toLowerCase()
        .trim();

      return (
        ['junior', 'intern'].includes(employeeLevel) &&
        employeeDepartment === currentDepartment
      );
    });

    return;
  }

  // Existing/default behavior for other users
  this.assignableEmployees = data;
});
  }
  loadProjects() {
    this.projectService.getAllProjects().subscribe((data) => {
      this.projects = data;

    });
  }

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.tasks, event.previousIndex, event.currentIndex);
  }
  // getProjectTitle(projectId: number): string {
  //   const project = this.projects.find(p => p.id == projectId);
  //   return project ? project.projectTitle : 'Unknown Project';
  // }
  getProjectTitle(projectId: number | null): string {
  if (projectId === null || projectId === undefined) {
    return 'No Project';
  }

  const project = this.projects.find(
    (p: any) => p.id === projectId
  );

  return project?.projectTitle || 'Unknown Project';
}

  /**
   * Project column display:
   *  - Regular task  → the project's title
   *  - Trainer task (no project) → "<trainer project name> (Trainer)"
   *  - Neither → "No Project"
   */
  getProjectDisplay(task: any): string {
    if (task?.project_id !== null && task?.project_id !== undefined) {
      const project = this.projects.find((p: any) => p.id === task.project_id);
      return project?.projectTitle || 'Unknown Project';
    }
    if (task?.trainer_project_name) {
      // Trainer tasks are tagged "(Trainer)"; a regular "Other" project shows the name as-is.
      const isTrainer = String(task?.employee_type || '').toLowerCase() === 'trainer';
      return isTrainer ? `${task.trainer_project_name} (Trainer)` : task.trainer_project_name;
    }
    return 'No Project';
  }
  getemployeeName(employeeId: number): string {
    const employee = this.employees.find(p => p.id == employeeId);
    return employee ? employee.fullName : 'Unknown employee';

  }
  selectedTask: Task | null = null;

  taskClick(task: Task) {
    this.selectedTask = task;
  }

  toggle(task: Task, nav: MatSidenav) {
    nav.close();
    task.done = !task.done;
    this.taskService.updateTask(task.id, task).subscribe();
  }

  // addNewTask(nav: MatSidenav) {
  //   this.resetFormField();
  //   this.isNewEvent = true;
  //   this.dialogTitle = 'New Task';

  //   nav.open();
  // }
  addNewTask() {
    const dialogRef = this.dialog.open(FormDialogComponent, {
      width: '600px',
      data: {
        isNew: true,
        employees: this.assignableEmployees,
        projects: this.projects
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadTasks();
        // this.taskService.addTask(result).subscribe(() => this.loadTasks());
      }
    });
  }
  editTask(task: Task) {
    const dialogRef = this.dialog.open(FormDialogComponent, {
      width: '600px',
      data: {
        isNew: false,
        task,
        employees: this.assignableEmployees,
        projects: this.projects
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.taskService.updateTask(result.id, result).subscribe(() => this.loadTasks());
      }
    });
  }
  deleteItem(task: Task | MatSidenav) {
    console.log('Delete Task:', task);


    const dialogRef = this.dialog.open(DeleteComponent, {
      height: '260px',
      width: '300px',
      data: task,

    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadTasks(); // Refresh the table after deletion
      }
    });
  }
  // taskClick(task: Task, nav: MatSidenav): void {
  //   this.isNewEvent = false;
  //   this.dialogTitle = 'Edit Task';
  //   this.taskForm = this.createFormGroup(task);
  //   nav.open();
  // }

  closeSlider(nav: MatSidenav) {
    nav.close();
  }

  createFormGroup(data: Task) {
    return this.fb.group({
      id: [data.id],
      employee_id: [data.employee_id],
      project_id: [data.project_id],
      title: [data.title || null],
      done: [data.done || false],
      priority: [data.priority || null],
      due_date: [data.due_date || null],
      note: [data.note || ''],

    });
  }

  saveTask() {
    const task = this.taskForm.value;
    console.log("Submited data", task);
    task.due_date = this.formatDateForDB(task.due_date);

    this.taskService.addTask(task).subscribe(() => {
      this.loadTasks();
      this.resetFormField();
    });
  }

  // editTask() {
  //   const task = this.taskForm.value;
  //   task.due_date = this.formatDateForDB(task.due_date);
  //   this.taskService.updateTask(task.id, task).subscribe(() => {
  //     this.loadTasks();
  //   });
  // }

  // deleteTask(nav: MatSidenav) {
  //   const taskId = this.taskForm.value.id;
  //   this.taskService.deleteTask(taskId).subscribe(() => {
  //     this.loadTasks();
  //     nav.close();
  //   });
  // }

  // deleteTask(arg: Task | MatSidenav) {
  //   if ((arg as Task)?.id) {
  //     // Case: from table
  //     const task = arg as Task;
  //     this.taskService.deleteTask(task.id).subscribe(() => this.loadTasks());
  //   } else {
  //     // Case: from sidenav
  //     const sidenav = arg as MatSidenav;
  //     if (this.selectedTask) {
  //       this.taskService.deleteTask(this.selectedTask.id).subscribe(() => {
  //         this.loadTasks();
  //         sidenav.close();
  //       });
  //     }
  //   }
  // }
  resetFormField() {
    this.taskForm.reset({

      done: false,
    });
  }
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
}
