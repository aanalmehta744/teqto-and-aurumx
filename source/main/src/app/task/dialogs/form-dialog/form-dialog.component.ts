import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { UntypedFormBuilder, UntypedFormGroup, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { NgxEditorModule, Editor, Toolbar } from 'ngx-editor';
import { TaskService } from '../../task.service';
import { formatDate } from '@angular/common';
import Swal from 'sweetalert2';


@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatCheckboxModule,
    MatDatepickerModule,
    NgxEditorModule,
    MatDialogModule
  ],
  templateUrl: './form-dialog.component.html',
  styleUrl: './form-dialog.component.scss'
})
export class FormDialogComponent {
  form: UntypedFormGroup;
  editor = new Editor();
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

  constructor(
    private fb: UntypedFormBuilder,
    private taskService: TaskService,
    private dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      id: [data?.task?.id],
      title: [data?.task?.title || ''],
      employee_type: [data?.task?.employee_type || ''],
      project_id: [data?.task?.project_id || null],
      trainer_project_name: [data?.task?.trainer_project_name || ''],
      employee_id: [data?.task?.employee_id || null],
      priority: [data?.task?.priority || 'Normal'],
      due_date: [data?.task?.due_date || null],
      note: [data?.task?.note || ''],
      done: [data?.task?.done || false],
      assigned_by: [JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null],
    });
  }
  ngOnInit(): void {

    this.editor = new Editor();
  }

  // make sure to destory the editor
  ngOnDestroy(): void {
    this.editor?.destroy();

  }
  save() {
    if (this.form.valid) {
      const task = this.form.value;
      task.due_date = this.formatDateForDB(task.due_date);

      // Normalize project fields based on type
      if (task.employee_type === 'regular') {
        task.trainer_project_name = null;
      } else {
        task.project_id = null;
      }

      console.log('Form Data:', task);

      if (task.id) {
        // Edit existing task
        this.taskService.updateTask(task.id, task).subscribe(() => {
          Swal.fire({
            icon: 'success',
            title: 'Updated!',
            text: 'Task has been updated successfully.',
            confirmButtonText: 'OK',   // 👈 Added OK button
            showConfirmButton: true
          }).then(() => {
            this.dialogRef.close(task);
          });
        });
      } else {
        // Add new task
        this.taskService.addTask(task).subscribe(() => {
          Swal.fire({
            icon: 'success',
            title: 'Added!',
            text: 'Task has been added successfully.',
            confirmButtonText: 'OK',   // 👈 Added OK button
            showConfirmButton: true
          }).then(() => {
            this.dialogRef.close(task);
          });
        });
      }

    }
  }
  close() {
    this.dialogRef.close();
  }

  /**
* Utility function to format the date for database storage
*/
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
}
