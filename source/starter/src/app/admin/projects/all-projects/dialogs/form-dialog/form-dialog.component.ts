import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxEditorModule, Toolbar } from 'ngx-editor';
import { Editor } from 'ngx-editor';
import { ReactiveFormsModule } from '@angular/forms';
import { ProjectService } from '../../core/project.service';
import Swal from 'sweetalert2';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { formatDate } from '@angular/common';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';

@Component({
  selector: 'app-form-dialog',
  templateUrl: './form-dialog.component.html',
  styleUrl: './form-dialog.component.scss',
  standalone: true,
  imports: [
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatRadioModule,
    NgxEditorModule,
    MatFormFieldModule,
    ReactiveFormsModule,
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
  ],
  providers: [
    {
      provide: DateAdapter,
      useClass: MomentDateAdapter,
      deps: [MAT_DATE_LOCALE, MAT_MOMENT_DATE_ADAPTER_OPTIONS],
    },
    {
      provide: MAT_DATE_FORMATS,
      useValue: {
        parse: {
          dateInput: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY'],
        },
        display: {
          dateInput: 'YYYY-MM-DD',
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
  ],
})
export class FormDialogComponent implements OnInit, OnDestroy {
  projectForm!: FormGroup;
  action: string = 'add';
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

  constructor(
    private fb: FormBuilder,
    private projectService: ProjectService,
    private dialogRef: MatDialogRef<FormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit(): void {
    this.action = this.data?.action || 'add';

    this.projectForm = this.fb.group({
      projectTitle: [this.data?.project?.projectTitle || '', Validators.required],
      department: [this.data?.project?.department || '', Validators.required],
      priority: [this.data?.project?.priority || '', Validators.required],
      client: [this.data?.project?.client || ''],
      startDate: [this.formatDateDefault(this.data?.project?.startDate) || '', Validators.required],
      endDate: [this.formatDateDefault(this.data?.project?.endDate) || '', Validators.required],
      team: [this.data?.project?.team || ''],
      status: [this.data?.project?.status || ''],
      description: [this.data?.project?.description || ''],
    });
  }

  ngOnDestroy(): void {
    this.editor.destroy();
  }

  private formatDateDefault(dateString: string): string {
    return dateString ? formatDate(dateString, 'yyyy-MM-dd', 'en') : '';
  }

  onSubmit(): void {
    if (this.projectForm.valid) {
      const formData = this.projectForm.value;
      formData.startDate = this.formatToLocalDate(formData.startDate);
      formData.endDate = this.formatToLocalDate(formData.endDate);

      if (formData.description && typeof formData.description !== 'string') {
        formData.description = JSON.stringify(formData.description);
      }

      if (this.action === 'edit') {
        this.projectService.updateProject(this.data.project.id, formData).subscribe({
          next: () => {
            Swal.fire({
              title: 'Success!',
              text: 'Project updated successfully!',
              icon: 'success',
              confirmButtonText: 'OK',
            }).then(() => {
              this.dialogRef.close(formData);
            });
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update project. Please try again.' });
            console.error('Update error:', err);
          },
        });
      } else {
        this.projectService.createProject(formData).subscribe({
          next: () => {
            Swal.fire({
              title: 'Success!',
              text: 'Project added successfully!',
              icon: 'success',
              confirmButtonText: 'OK',
            }).then(() => {
              this.dialogRef.close(formData);
            });
          },
          error: (err) => {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to add project. Please try again.' });
            console.error('Create error:', err);
          },
        });
      }
    }
  }

  onNoClick(): void {
    this.dialogRef.close();
  }

  formatToLocalDate(dateString: string): string | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
