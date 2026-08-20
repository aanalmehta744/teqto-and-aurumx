import { MAT_DIALOG_DATA, MatDialogRef, MatDialogContent, MatDialogClose } from '@angular/material/dialog';
import { Component, Inject } from '@angular/core';
import { UntypedFormControl, Validators, UntypedFormGroup, UntypedFormBuilder, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { formatDate } from '@angular/common';
import { MyProjectsService } from '../../my-projects.service';
import { MyProjects } from '../../my-projects.model';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface DialogData {
  id: number;
  action: string;
  myProjects: MyProjects;
}

@Component({
    selector: 'app-form-dialog:not(m)',
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
    ],
})
export class FormDialogComponent {
  action: string;
  dialogTitle: string;
  myProjectsForm: UntypedFormGroup;
  myProjects: MyProjects;
  constructor(
    public dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: DialogData,
    public myProjectsService: MyProjectsService,
    private fb: UntypedFormBuilder
  ) {
    // Set the defaults
    this.action = data.action;
    if (this.action === 'edit') {
      this.dialogTitle = data.myProjects.pName;
      this.myProjects = data.myProjects;
    } else {
      this.dialogTitle = 'New Project';
      const blankObject = {} as MyProjects;
      this.myProjects = new MyProjects(blankObject);
    }
    this.myProjectsForm = this.createContactForm();
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
      id: [this.myProjects.id],
      pName: [this.myProjects.pName],
      type: [this.myProjects.type],
      open_task: [this.myProjects.open_task],
      last_modify: [
        formatDate(this.myProjects.last_modify, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      create_date: [
        formatDate(this.myProjects.create_date, 'yyyy-MM-dd', 'en'),
        [Validators.required],
      ],
      status: [this.myProjects.status],
      lead_name: [this.myProjects.lead_name],
    });
  }
  submit() {
    // emppty stuff
  }
  onNoClick(): void {
    this.dialogRef.close();
  }
  public confirmAdd(): void {
    this.myProjectsService.addMyProjects(this.myProjectsForm.getRawValue());
  }
}
