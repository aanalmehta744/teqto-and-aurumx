import { Component, ViewChild, OnInit, AfterViewInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSortModule } from '@angular/material/sort';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatRippleModule } from '@angular/material/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgClass } from '@angular/common';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteComponent } from './dialogs/delete/delete.component';
import { InterviewService } from './interview.service';
import { TableExportUtil, TableElement } from '@shared';
@Component({
  selector: 'app-interview-schedule',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTooltipModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSortModule,
    NgClass,
    MatCheckboxModule,
    FeatherIconsComponent,
    MatRippleModule,
    MatProgressSpinnerModule,
    MatMenuModule,
    MatPaginatorModule,
    CommonModule
  ],
  templateUrl: './interview-schedule.component.html',
  styleUrl: './interview-schedule.component.scss'
})
export class InterviewScheduleComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = [
    'candidate',
    'job',
    'date',
    'time',
    'assigned_employee',
    'type',
    'mode',
    'status',
    'actions'
  ];

  dataSource = new MatTableDataSource<any>([]);
  loading = false;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild('filter') filterInput: any; // get search input reference
  constructor(
    private dialog: MatDialog,
    private interviewService: InterviewService
  ) { }

  ngOnInit(): void {
    this.loadInterviews();

    // Set filter predicate to handle text, date, and time formats
    this.dataSource.filterPredicate = (data: any, filter: string): boolean => {
      const transformedFilter = filter.trim().toLowerCase();

      // --- Date formats ---
      const interviewDate = new Date(data.interview_date);
      const formattedDate1 = interviewDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toLowerCase();
      const formattedDate2 = interviewDate.toISOString().split('T')[0]; // "YYYY-MM-DD"
      const formattedDate3 = ('0' + interviewDate.getDate()).slice(-2) + '-' + ('0' + (interviewDate.getMonth() + 1)).slice(-2) + '-' + interviewDate.getFullYear(); // "DD-MM-YYYY"

      // --- Time formats ---
      let times: string[] = [];
      if (data.time) {
        const timeStr = data.time.toLowerCase();
        times.push(timeStr); // original like "12:00 AM" or "10:30 PM"

        // convert to 24-hour format "HH:MM"
        const [hourMin, ampm] = timeStr.split(' ');
        if (hourMin && ampm) {
          let [hour, min] = hourMin.split(':').map(Number);
          if (ampm === 'pm' && hour < 12) hour += 12;
          if (ampm === 'am' && hour === 12) hour = 0;
          times.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
        }
      }

      // --- Full search string ---
      const searchStr = (
        data.candidate_name + ' ' +
        data.job_name + ' ' +
        data.interview_type + ' ' +
        data.mode + ' ' +
        data.status + ' ' +
        formattedDate1 + ' ' +
        formattedDate2 + ' ' +
        formattedDate3 + ' ' +
        times.join(' ')
      ).toLowerCase();

      return searchStr.includes(transformedFilter);
    };
  }
  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }


  // ✅ Load interviews dynamically
  loadInterviews() {
    this.loading = true;
    this.interviewService.getInterviews().subscribe({
      next: (res) => {
        console.log("interview liast", res);
        this.dataSource.data = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching interviews:', err);
        this.loading = false;
      }
    });
  }

  scheduleNew() {
    const dialogRef = this.dialog.open(FormDialogComponent, {
      width: '600px',
      data: { action: 'add' }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadInterviews(); // ✅ reload after adding
      }
    });
  }

  editSchedule(row: any) {
    const dialogRef = this.dialog.open(FormDialogComponent, {
      width: '600px',
      data: { action: 'edit', schedule: row }
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadInterviews(); // ✅ reload after update
      }
    });
  }

  cancelSchedule(row: any) {
    const dialogRef = this.dialog.open(DeleteComponent, {
      height: '260px',
      width: '300px',
      data: row,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        this.loadInterviews(); // ✅ reload after update
      }
    });
  }

  viewDetails(row: any) {
    console.log('Viewing details:', row);
  }
  refresh() {
    this.loadInterviews
  }
  // ✅ Apply filter when user types
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  // ✅ Export table data including interview details to Excel
  exportExcel() {
    // Prepare the data for export
    const exportData = this.dataSource.filteredData.map((x) => ({
      CandidateName: x.candidate_name,
      Job: x.job_name,
      InterviewDate: x.interview_date
        ? new Date(x.interview_date).toLocaleDateString('en-US', {
          month: 'short',
          day: '2-digit',
          year: 'numeric',
        })
        : '',
      InterviewTime: x.interview_time || '',
      Type: x.interview_type || '',
      Mode: x.mode || '',
      Status: x.status || '',
    }));

    // Call your utility to export
    TableExportUtil.exportToExcel(exportData, 'InterviewDetails');
  }

}