import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { formatDate } from '@angular/common';
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
export interface DialogData {
  id: number;
  action: string;
  myTasks: MyTasks;
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
export class FormDialogComponent {
  action: string;
  dialogTitle!: string;
  myTasksForm: UntypedFormGroup;
  myTasks: MyTasks;
  isDetails = false;

  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public myTasksService: AllTasksService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults

    this.action = data.action;
    console.log("Action", this.action);
    if (this.action === 'edit') {
      this.dialogTitle = data.myTasks.taskNo;
      this.myTasks = data.myTasks;
    } else if (this.action == 'details') {
      this.myTasks = data.myTasks
      this.isDetails = true;
    }
    else {
      this.dialogTitle = 'New MyTasks';
      const blankObject = {} as MyTasks;
      this.myTasks = new MyTasks(blankObject);
    }
    this.myTasksForm = this.createContactForm();
  }
  formControl = new UntypedFormControl('', [
    Validators.required,
    // Validators.email,
  ]);
  getErrorMessage() {
    return this.formControl.hasError('required')
      ? 'Required field'
      : this.formControl.hasError('email')
        ? 'Not a valid email'
        : '';
  }
  createContactForm(): UntypedFormGroup {
    return this.fb.group({
      id: [this.myTasks.id],
      taskNo: [this.myTasks.taskNo],
      project: [this.myTasks.projectTitle],
      client: [this.myTasks.client],
      status: [this.myTasks.status],
      priority: [this.myTasks.priority],
      type: [this.myTasks.type],
      executor: [this.myTasks.executor],
      details: [this.myTasks.details],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.myTasksService.addMyTasks(this.myTasksForm.getRawValue());
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
