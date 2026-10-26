import { Component, OnDestroy, OnInit, ViewEncapsulation } from '@angular/core';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { dateRangeValidator } from '@shared/validators/date-range.validator';
import { MatButtonModule } from '@angular/material/button';
import { FileUploadComponent } from '@shared/components/file-upload/file-upload.component';
import { MatRadioModule } from '@angular/material/radio';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatOptionModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgxEditorModule, Toolbar } from 'ngx-editor';
import { Editor } from 'ngx-editor';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ProjectService } from '../all-projects/core/project.service';
import { Project } from '../all-projects/core/project.model';
import { ContentObserver } from '@angular/cdk/observers';
import Swal from 'sweetalert2';
import { formatDate } from '@angular/common';
import { ClientsService } from 'app/admin/clients/all-clients/clients.service';
import { EmployeesService } from 'app/admin/employees/allEmployees/employees.service';
import { DepartmentsService, Department } from 'app/departments/departments.service';
import { CommonModule } from '@angular/common';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { Subscription } from 'rxjs';
import { MatCommonModule } from '@angular/material/core';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
// import { MatChipList } from '@angular/material/chips';
import { MatChipGrid } from '@angular/material/chips';
import { ViewChild } from '@angular/core';
import {
  MAT_DATE_FORMATS,
  DateAdapter,
  MAT_DATE_LOCALE,
} from '@angular/material/core';
import {
  MomentDateAdapter,
  MAT_MOMENT_DATE_ADAPTER_OPTIONS,
} from '@angular/material-moment-adapter';
import { Router } from '@angular/router';


@Component({
  selector: 'app-add-project',
  templateUrl: './add-project.component.html',
  styleUrls: ['./add-project.component.scss'],
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [
    BreadcrumbComponent,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule,
    MatDatepickerModule,
    MatRadioModule,
    FileUploadComponent,
    MatButtonModule,
    NgxEditorModule,
    CommonModule,
    MatChipsModule,
    MatIconModule,
    MatAutocompleteModule,
    MatCommonModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
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
          dateInput: ['YYYY-MM-DD', 'DD-MM-YYYY', 'DD/MM/YYYY'], // Acceptable input formats
        },
        display: {
          dateInput: 'YYYY-MM-DD', // Display format in input box
          monthYearLabel: 'MMM YYYY',
          dateA11yLabel: 'LL',
          monthYearA11yLabel: 'MMMM YYYY',
        },
      },
    },
  ]
})
export class AddprojectsComponent implements OnInit, OnDestroy {

  @ViewChild('chipList') chipList!: MatChipGrid;
  projectForm: UntypedFormGroup;
  hide3 = true;
  agree3 = false;
  selectedFile!: File; // Change from string to File
  clients: any[] = []; // Store clients from API
  employees: any[] = []; // Store employees from API
  projects: any[] = []; // NEW CODE: existing projects, used to hide already-assigned clients
  departments: Department[] = []; // NEW CODE: departments managed from admin/HR side

  // NEW CODE: Clients that are not yet assigned to any project
  get availableClients(): any[] {
    const usedClientIds = new Set(
      this.projects
        .map((p) => p.client)
        .filter((c) => c !== null && c !== undefined && c !== '')
        .map((c) => String(c))
    );
    return this.clients.filter((c) => !usedClientIds.has(String(c.id)));
  }

  editor: Editor = new Editor(); // Ensure it is always initialized
  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  tagList: string[] = [];
  selectable = true;
  removable = true;


  html = '';
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
  private subs = new Subscription();
  constructor(
    private fb: UntypedFormBuilder,
    private projectService: ProjectService,
    private clientsService: ClientsService,
    private employeesService: EmployeesService,
    private departmentsService: DepartmentsService,
    private router: Router
  ) {
    this.projectForm = this.fb.group({
      // projectID: ['', [Validators.required]],
      projectTitle: ['', [Validators.required]],
      // NEW CODE: department holds an array (multiple selection)
      department: [[], [Validators.required]],
      priority: ['', [Validators.required]],
      client: ['', [Validators.required]],
      // price: ['', [Validators.required]],
      startDate: [null, [Validators.required]],
      endDate: [null, [Validators.required]],
      team: [[]], // Team is optional at creation; can assign later via edit
      status: ['', [Validators.required]],
      description: [''],
      tags: [[]],
    }, { validators: dateRangeValidator('startDate', 'endDate') });

  }
  ngOnInit(): void {
    this.editor = new Editor();
    this.getClients(); // Fetch clients from API
    this.getEmployees(); // Fetch employees from API
    this.getProjects(); // NEW CODE: fetch existing projects to filter out used clients
    this.getDepartments(); // NEW CODE: fetch admin/HR-managed departments
  }

  // NEW CODE: Fetch departments added from the admin/HR side
  getDepartments(): void {
    this.departmentsService.getAll().subscribe({
      next: (data) => (this.departments = data || []),
      error: (error) => console.error('Error fetching departments:', error),
    });
  }

  // NEW CODE: Fetch existing projects so already-assigned clients can be hidden
  getProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (data) => (this.projects = data || []),
      error: (error) => console.error('Error fetching projects:', error),
    });
  }

  // Fetch employee list from backend
  getEmployees(): void {
    this.employeesService.getAllEmployeess().subscribe({
      next: (data) => (
        this.employees = data

      ),
      error: (error) => console.error('Error fetching employees:', error),
    });
  }
  // Fetch client list from backend
  getClients(): void {
    this.clientsService.getAllClients().subscribe({
      next: (data) => (this.clients = data),
      error: (error) => console.error('Error fetching clients:', error),
    });
  }

  private formatDateDefault(dateString: string): string {
    return dateString ? formatDate(dateString, 'yyyy-MM-dd', 'en') : '';
  }
  // make sure to destory the editor
  ngOnDestroy(): void {
    this.editor?.destroy();
    this.subs?.unsubscribe();
  }
  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
    }
  }

  onSubmit(): void {
    if (!this.projectForm.valid) {
      this.projectForm.markAllAsTouched();
      Swal.fire({
        icon: 'warning',
        title: this.projectForm.hasError('dateRangeInvalid')
          ? 'Invalid Dates!'
          : 'Incomplete Form!',
        text: this.projectForm.hasError('dateRangeInvalid')
          ? 'End date cannot be before the start date.'
          : 'Please fill in all required fields.',
        confirmButtonColor: '#f39c12',
      });
      return;
    }

    const formData = { ...this.projectForm.value };
    formData.created_by = JSON.parse(localStorage.getItem('currentUser') || 'null')?.id || null;

    formData.startDate = this.formatDateDefault(formData.startDate);
    formData.endDate = this.formatDateDefault(formData.endDate);

    if (Array.isArray(formData.team)) {
      formData.team = formData.team.join(',');
    }

    // NEW CODE: department is multi-select — store as comma-separated string
    if (Array.isArray(formData.department)) {
      formData.department = formData.department.join(',');
    }

    if (formData.description && typeof formData.description !== 'string') {
      formData.description = JSON.stringify(formData.description);
    }

    this.projectService.createProject(formData as any).subscribe({
      next: (response) => {
        console.log('Project saved successfully', response);
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Project saved successfully!',
          confirmButtonColor: '#7c3aed',
        }).then(() => {
          this.projectForm.reset();
          // Navigate back to the projects list for whichever role is logged in
          const currentUrl = this.router.url;
          if (currentUrl.startsWith('/ba/')) {
            this.router.navigate(['/ba/projects/allProjects']);
          } else if (currentUrl.startsWith('/client/')) {
            this.router.navigate(['/client/projects/allProjects']);
          } else {
            this.router.navigate(['/admin/projects/allProjects']);
          }
        });
      },
      error: (error) => {
        console.error('Error saving project:', error);
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'Failed to save project. Please try again!',
          confirmButtonColor: '#d33',
        });
      },
    });
  }


  addTag(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    // Add our tag
    if (value && !this.tagList.includes(value)) {
      this.tagList.push(value);
      this.projectForm.get('tags')?.setValue(this.tagList);
    }

    // Clear the input
    event.chipInput!.clear();
  }

  removeTag(tag: string): void {
    const index = this.tagList.indexOf(tag);

    if (index >= 0) {
      this.tagList.splice(index, 1);
      this.projectForm.get('tags')?.setValue(this.tagList);
    }
  }
}
