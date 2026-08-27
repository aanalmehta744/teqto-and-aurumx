import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, ChangeDetectorRef, inject } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { ActivatedRoute } from '@angular/router';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule } from '@angular/common';
import { EmployeesService } from './employees.service';
import { AttendancesService } from 'app/employee/attendance/attendance.service';
import { MyLeavesService } from 'app/employee/my-leaves/my-leaves.service';
import { EmployeeSalaryService } from 'app/admin/payroll/employee-salary/employee-salary.service';
import { MatTableModule } from '@angular/material/table';
import { MyProjectsService } from 'app/employee/my-projects/my-projects.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { AddTargetDialogComponent } from './add-target-dialog/add-target-dialog.component';
import { DeleteTargetDialogComponent } from './delete-target-dialog/delete-target-dialog.component';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatMenuTrigger } from '@angular/material/menu';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { AuthService } from '@core';

@Component({
  selector: 'app-employee-profile',
  templateUrl: './employee-profile.component.html',
  styleUrls: ['./employee-profile.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTabsModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    CommonModule,
    MatProgressSpinnerModule,
    NgScrollbarModule,
    MatPaginatorModule,
    MatTableModule,
    MatPaginator,
    MatPaginatorModule,
    FeatherIconsComponent,
  ],
})
export class EmployeeProfileComponent implements OnInit, AfterViewInit {
  employeeId!: number;
  employee: any;
  isLoading = true;
  errorMessage: string | null = null;

  attendanceRecords = new MatTableDataSource<any>();
  leaveRecords = new MatTableDataSource<any>();
  projects = new MatTableDataSource<any>();
  payrollRecords = new MatTableDataSource<any>();
  monthlyTargets = new MatTableDataSource<any>();

  attendanceColumns = ['date', 'check_in', 'check_out', 'hours', 'status'];
  leaveColumns = ['startDate', 'endDate', 'halfDay', 'leaveType', 'reason', 'status'];
  payrollColumns = ['month', 'salary', 'unpaid', 'bonus'];
  projectColumns = ['name', 'status', 'startDate', 'endDate', 'teamName'];
  targetColumns = ['amount', 'targetDate', 'achieved_amount', 'actions'];

  @ViewChild('attendancePaginator') attendancePaginator!: MatPaginator;
  @ViewChild('leavePaginator') leavePaginator!: MatPaginator;
  @ViewChild('projectPaginator') projectPaginator!: MatPaginator;
  @ViewChild('payrollPaginator') payrollPaginator!: MatPaginator;
  @ViewChild('targetPaginator') targetPaginator!: MatPaginator;


  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
  @ViewChild(MatMenuTrigger)
  contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  photoUploading = false;
  photoUploadError = '';

  private authService = inject(AuthService);

  constructor(
    private route: ActivatedRoute,
    private employeesService: EmployeesService,
    private attendancesService: AttendancesService,
    private myLeavesService: MyLeavesService,
    private employeeSalaryService: EmployeeSalaryService,
    private myProjectsService: MyProjectsService,
    private dialog: MatDialog,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.employeeId = currentUser?.id; // adjust key if different

    if (!this.employeeId) {
      this.errorMessage = 'Employee ID not found in local storage';
      this.isLoading = false;
      return;
    }
    this.loadEmployee();
    this.loadAttendanceRecords();
    this.loadLeaveRecords();
    this.loadPayrollRecords();
    this.loadProjects();
    this.loadMonthlyTargets();
  }

  ngAfterViewInit(): void {
    Promise.resolve().then(() => {
      this.attendanceRecords.paginator = this.attendancePaginator;
      this.leaveRecords.paginator = this.leavePaginator;
      this.projects.paginator = this.projectPaginator;
      this.payrollRecords.paginator = this.payrollPaginator;
      this.monthlyTargets.paginator = this.targetPaginator;
    });
  }

  loadEmployee() {
    this.isLoading = true;
    this.employeesService.getEmployeeById(this.employeeId).subscribe({
      next: (data) => {
        this.employee = data;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load employee data';
        this.isLoading = false;
      }
    });
  }

  loadAttendanceRecords(): void {
    this.attendancesService.getAttendanceRecords(this.employeeId).subscribe({
      next: (response) => {
        this.attendanceRecords.data = response;
      },
      error: (error) => {
        console.error('Error loading attendance records:', error);
      }
    });
  }

  loadLeaveRecords(): void {
    this.myLeavesService.getLeaveRecords(this.employeeId).subscribe({
      next: (data) => {
        this.leaveRecords.data = data;
      },
      error: (error) => {
        console.error('Error loading leave records:', error);
      }
    });
  }

  loadPayrollRecords(): void {
    this.employeeSalaryService.getPayrollRecords(this.employeeId).subscribe({
      next: (data) => {
        this.payrollRecords.data = data;
      },
      error: (error) => {
        console.error('Error loading payroll records:', error);
      }
    });
  }

  loadProjects(): void {
    this.myProjectsService.getProjectsByEmployeeId(this.employeeId).subscribe({
      next: (data) => {
        this.projects.data = data;
      },
      error: (error) => {
        console.error('Error loading projects:', error);
      }
    });
  }

  loadMonthlyTargets(): void {
    this.employeesService.getMonthlyTargets(this.employeeId).subscribe({
      next: (targets) => {
        this.monthlyTargets.data = targets;
      },
      error: (error) => {
        console.error('Error loading monthly targets:', error);
      }
    });
  }

  getProfileImage(): string {
    const img = this.employee?.uploadImg;
    if (img?.startsWith('http')) return img;
    const gender = this.employee?.gender?.toLowerCase();
    if (gender === 'female') return 'assets/images/female-profile.png';
    if (gender === 'male') return 'assets/images/male-profile.png';
    return 'assets/images/user/default.jpg';
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;
    const file = input.files[0];
    this.photoUploading = true;
    this.photoUploadError = '';
    this.employeesService.uploadPhoto(this.employeeId, file).subscribe({
      next: (res) => {
        this.employee.uploadImg = res.filename;
        this.photoUploading = false;
        // Sync to localStorage so header/sidebar reflect the new photo
        const stored = JSON.parse(localStorage.getItem('currentUser') || '{}');
        stored.img = res.filename;
        stored.uploadImg = res.filename;
        localStorage.setItem('currentUser', JSON.stringify(stored));
        this.authService.setUserData({ ...stored }, stored.token ?? localStorage.getItem('authToken') ?? '');
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.photoUploadError = err?.error?.error || 'Upload failed';
        this.photoUploading = false;
      }
    });
  }

  // =====================================================
  // EMPLOYEE DOCUMENTS (self-service)
  // =====================================================

  // Each document the employee can upload. `required` drives the
  // reminder banner; `doc_current_sem` is optional.
  documentDefs: {
    field: string;
    label: string;
    required: boolean;
  }[] = [
    { field: 'doc_tenth', label: '10th Marksheet', required: true },
    { field: 'doc_twelfth', label: '12th Marksheet', required: true },
    { field: 'doc_aadhar', label: 'Aadhaar Card', required: true },
    { field: 'doc_pan', label: 'PAN Card', required: true },
    { field: 'doc_passbook', label: 'Bank Passbook Copy', required: true },
    { field: 'doc_current_sem', label: 'Current Sem Marksheet (optional)', required: false }
  ];

  // Per-document upload state.
  docUploading: { [field: string]: boolean } = {};
  docError: { [field: string]: string } = {};

  docReminderDismissed = false;

  hasDoc(field: string): boolean {
    return !!this.employee?.[field];
  }

  getDocUrl(field: string): string {
    return this.employee?.[field] || '';
  }

  // Required documents the employee still needs to upload.
  get missingRequiredDocs(): string[] {
    return this.documentDefs
      .filter(d => d.required && !this.hasDoc(d.field))
      .map(d => d.label);
  }

  get showDocReminder(): boolean {
    return !this.docReminderDismissed && this.missingRequiredDocs.length > 0;
  }

  dismissDocReminder(): void {
    this.docReminderDismissed = true;
  }

  onDocumentSelected(field: string, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    this.docUploading[field] = true;
    this.docError[field] = '';

    this.employeesService
      .uploadDocuments(this.employeeId, { [field]: file })
      .subscribe({
        next: (res) => {
          // Backend returns { documents: { <column>: url } }.
          const url = res?.documents?.[field];
          if (url) {
            this.employee[field] = url;
          }
          this.docUploading[field] = false;
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.docError[field] =
            err?.error?.error || 'Upload failed. Please try again.';
          this.docUploading[field] = false;
        }
      });

    // Reset so the same file can be re-selected.
    input.value = '';
  }

  getMonthName(month: number): string {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return months[month - 1];
  }

  addTarget(): void {
    // const dialogRef = this.dialog.open(AddTargetDialogComponent, {
    //   width: '400px',
    //   data: {
    //     employees: this.employee,
    //     dialogTitle: 'Add Monthly Target',
    //     action: 'add'
    //   }
    // });

    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.loadMonthlyTargets();
    //   }
    // });
  }

  editTarget(target: any): void {
    console.log(target);
    // const dialogRef = this.dialog.open(AddTargetDialogComponent, {
    //   width: '400px',
    //   data: {
    //     employees: this.employee,
    //     dialogTitle: 'Edit Monthly Target',
    //     action: 'edit',
    //     target
    //   }
    // });

    // dialogRef.afterClosed().subscribe(result => {
    //   if (result) {
    //     this.loadMonthlyTargets();
    //   }
    // });
  }

  // deleteTarget(target: any): void {
  //   const dialogRef = this.dialog.open(DeleteTargetDialogComponent, {
  //     width: '400px',
  //     data: {
  //       employees: this.employee,
  //       dialogTitle: 'Edit Monthly Target',
  //       action: 'edit',
  //       target
  //     }
  //   });

  //   dialogRef.afterClosed().subscribe(result => {
  //     if (result) {
  //       this.loadMonthlyTargets();
  //     }
  //   });
  //   if (confirm('Are you sure you want to delete this target?')) {
  //     this.employeesService.deleteMonthlyTarget(target.id).subscribe(() => {
  //       this.loadMonthlyTargets();
  //     });
  //   }
  // }
  deleteTarget(target: any): void {
    console.log(target);
    const dialogRef = this.dialog.open(DeleteTargetDialogComponent, {
      width: '400px',
      data: {
        dialogTitle: 'Delete Monthly Target',
        action: 'delete',
        target
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'confirm') {
        this.loadMonthlyTargets(); // or refresh data
      }
    });

  }

}
