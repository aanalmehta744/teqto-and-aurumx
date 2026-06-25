import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatDialog } from '@angular/material/dialog';
import { SelectionModel } from '@angular/cdk/collections';
import { fromEvent, merge, BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatMenuTrigger, MatMenuModule } from '@angular/material/menu';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement } from '@shared';
import { formatDate, NgClass, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { AttendancesService } from '../../../employee/attendance/attendance.service';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule } from '@angular/material/sort';
import { ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgScrollbar } from 'ngx-scrollbar';
import { FormDialogComponent } from './dialog/form-dialog/form-dialog.component';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import {
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';

export interface EmployeeAttendance {
  id: number;
  employee_name: string;
  date: string; // YYYY-MM-DD format
  check_in: string;  // e.g. "09:00"
  check_out: string; // e.g. "18:00"
  hours: number;
  status: string; // Present, Absent, On Leave
  role?: string;
}

@Component({
  selector: 'app-employee-attendance',
  templateUrl: './employee-attendance.component.html',
  standalone: true,
  styleUrls: ['./employee-attendance.component.scss'],
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
    DatePipe,
    CommonModule,
    NgScrollbar,
  ]
})
export class EmployeeAttendanceComponent extends UnsubscribeOnDestroyAdapter
  implements OnInit, AfterViewInit {
  displayedColumns = [
    'name',
    'date',
    'check_in',
    'check_out',
    'hours',
    'break',
    'status',
    'actions',
  ];

  dataSource!: AttendanceDataSource;
  selection = new SelectionModel<EmployeeAttendance>(true, []);
  groupedAttendance: { date: string; records: EmployeeAttendance[] }[] = [];
  exampleDatabase?: AttendancesService;
  employeeAttendanceData: EmployeeAttendance[] = [];
  terminatedAttendanceData: EmployeeAttendance[] = [];
  option: number = 0;
  id?: number;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter') filter!: ElementRef;

  constructor(
    public dialog: MatDialog,
    public attendanceService: AttendancesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {
    super()
  }

  ngOnInit() {
    this.loadData();
  }
  ngAfterViewInit() {
    fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
      const filterValue = this.filter.nativeElement.value.trim().toLowerCase();
      this.dataSource.filter = filterValue;

      // After filter changes, update groupedAttendance accordingly
      this.updateGroupedAttendance(filterValue);
    });
  }
  // updateGroupedAttendance(filter: string) {
  //   const filtered = this.employeeAttendanceData.filter(att => {
  //     const formattedDate = formatDate(att.date, 'yyyy-MM-dd', 'en');
  //     const dateFormatted1 = formatDate(att.date, 'dd-MM-yyyy', 'en');
  //     const dateFormatted2 = formatDate(att.date, 'MMM d, y', 'en');
  //     const monthShort = formatDate(att.date, 'MMM', 'en');
  //     const monthFull = formatDate(att.date, 'MMMM', 'en');
  //     const checkInFormatted = att.check_in
  //       ? formatDate(att.check_in, 'hh:mm:ss a', 'en')
  //       : '';

  //     const checkOutFormatted = att.check_out
  //       ? formatDate(att.check_out, 'hh:mm:ss a', 'en')
  //       : '';


  //     const searchStr = (
  //       att.employee_name +
  //       att.status +
  //       formattedDate +
  //       dateFormatted1 +
  //       dateFormatted2 +
  //       monthShort +
  //       monthFull +
  //       checkInFormatted +
  //       checkOutFormatted
  //     ).toLowerCase();

  //     return searchStr.includes(filter.toLowerCase());
  //   });

  //   this.groupDataByDate(filtered);
  // }


  // loadData() {
  //   this.exampleDatabase = this.attendanceService;

  //   this.exampleDatabase.getEmployeeAttendance().subscribe(data => {
  //     this.employeeAttendanceData = data
  //       // 🔥 filter out Admins
  //       .filter(item => item.role?.toLowerCase() !== 'admin')
  //       .map(item => ({
  //         id: item.id,
  //         employee_name: item.employee_name || 'Unknown',
  //         date: item.date,
  //         check_in: item.check_in,
  //         check_out: item.check_out,
  //         hours: item.hours,
  //         status: item.status,
  //         final_status: item.final_status,
  //         break: item.break,
  //         role: item.role,
  //       }));

  //     this.groupDataByDate(this.employeeAttendanceData);

  //     this.dataSource = new AttendanceDataSource(
  //       this.employeeAttendanceData,
  //       this.paginator,
  //       this.sort
  //     );

  //     // Fix ExpressionChangedAfterItHasBeenCheckedError
  //     this.cdr.detectChanges();
  //   });
  // }

  // loadData() {
  //   this.exampleDatabase = this.attendanceService;

  //   this.exampleDatabase.getEmployeeAttendance().subscribe(data => {
  //     this.employeeAttendanceData = data
  //       // 🔥 filter out Admins
  //       .filter(item =>
  //         item.role?.toLowerCase() !== 'admin' &&
  //         (!item.termination_date || item.termination_date === null)
  //       )

  //       .map(item => ({
  //         id: item.id,
  //         employee_name: item.employee_name || 'Unknown',
  //         date: item.date,
  //         check_in: item.check_in,
  //         check_out: item.check_out,
  //         hours: item.hours,
  //         status: item.status,
  //         final_status: item.final_status,
  //         break: item.break,
  //         role: item.role,
  //         termination_date: item.termination_date,
  //       }));

  //     this.groupDataByDate(this.employeeAttendanceData);

  //     this.dataSource = new AttendanceDataSource(
  //       this.employeeAttendanceData,
  //       this.paginator,
  //       this.sort
  //     );

  //     // Fix ExpressionChangedAfterItHasBeenCheckedError
  //     this.cdr.detectChanges();
  //   });
  // }

  loadData() {
    this.exampleDatabase = this.attendanceService;

    this.exampleDatabase.getEmployeeAttendance().subscribe(data => {
      const allData = data.map(item => ({
        id: item.id,
        employee_name: item.employee_name || 'Unknown',
        date: item.date,
        check_in: item.check_in,
        check_out: item.check_out,
        hours: item.hours,
        status: item.status,
        final_status: item.final_status,
        break: item.break,
        role: item.role,
        termination_date: item.termination_date // 👈 important
      }));

      // ✅ Step 1: Always remove Admin users
      const nonAdminData = allData.filter(
        item => item.role?.toLowerCase() !== 'admin'
      );

      // ✅ Step 2: Separate active and terminated employees
      this.employeeAttendanceData = nonAdminData.filter(
        item => !item.termination_date
      );

      this.terminatedAttendanceData = nonAdminData.filter(
        item => !!item.termination_date
      );

      // ✅ Step 3: Show only active (non-admin) employees initially
      this.groupDataByDate(this.employeeAttendanceData);

      this.dataSource = new AttendanceDataSource(
        this.employeeAttendanceData,
        this.paginator,
        this.sort
      );

      this.cdr.detectChanges();
    });
  }

  updateGroupedAttendance(filter: string) {
    const isSearching = filter && filter.trim().length > 0;

    // ✅ Include terminated employees only while searching (never admins)
    const baseData = isSearching
      ? [...this.employeeAttendanceData, ...this.terminatedAttendanceData]
      : this.employeeAttendanceData;

    const filtered = baseData.filter(att => {
      // ✅ Skip Admins even if they match search
      if (att.role?.toLowerCase() === 'admin') {
        return false;
      }

      const formattedDate = formatDate(att.date, 'yyyy-MM-dd', 'en');
      const dateFormatted1 = formatDate(att.date, 'dd-MM-yyyy', 'en');
      const dateFormatted2 = formatDate(att.date, 'MMM d, y', 'en');
      const monthShort = formatDate(att.date, 'MMM', 'en');
      const monthFull = formatDate(att.date, 'MMMM', 'en');
      const checkInFormatted = att.check_in
        ? formatDate(att.check_in, 'hh:mm:ss a', 'en')
        : '';
      const checkOutFormatted = att.check_out
        ? formatDate(att.check_out, 'hh:mm:ss a', 'en')
        : '';

      const searchStr = (
        att.employee_name +
        att.status +
        formattedDate +
        dateFormatted1 +
        dateFormatted2 +
        monthShort +
        monthFull +
        checkInFormatted +
        checkOutFormatted
      ).toLowerCase();

      return searchStr.includes(filter.toLowerCase());
    });

    // ✅ Update grouped and table data
    this.groupDataByDate(filtered);
    this.dataSource = new AttendanceDataSource(filtered, this.paginator, this.sort);
    this.cdr.detectChanges();
  }

  groupDataByDate(data: EmployeeAttendance[]) {
    const grouped = new Map<string, EmployeeAttendance[]>();
    data.forEach(record => {
      const date = this.formatDateForDB(record.date);
      if (!date) return; // Skip if date is null or undefined
      if (!grouped.has(date)) {
        grouped.set(date, []);
      }
      grouped.get(date)!.push(record);
    });
    this.groupedAttendance = Array.from(grouped.entries()).map(([date, records]) => ({ date, records }));
  }
  editCall(row: EmployeeAttendance) {
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        attendance: row,
        action: 'edit',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {

      console.log(result);
      if (result === 1) {
        // When using an edit things are little different, firstly we find record inside DataService by id
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        // Then you update that record using data from dialogData (values you enetered)
        if (foundIndex != null && this.exampleDatabase) {
          this.exampleDatabase.dataChange.value[foundIndex] =
            this.attendanceService.getDialogData();
          this.loadData();
          this.showNotification(
            'snackbar-success',
            'Update Record Successfully...!!!',
            'bottom',
            'center'
          );
        }
      }
    });
  }

  deleteItem(row: EmployeeAttendance) { }


  refresh() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.renderedData.length;
    return numSelected === numRows;
  }
  exportExcel() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeName = currentUser.fullName || 'Employee';

    // ✅ Get all rows from datasource (all data, not just current page)
    const allData: EmployeeAttendance[] = this.dataSource.data;

    const exportData: Partial<TableElement>[] = allData.map((x) => ({
      'Employee Name': x.employee_name || employeeName,
      'Date': new Date(x.date).toISOString().split('T')[0],
      'Punch In': x.check_in
        ? new Date(x.check_in).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
        : '-',
      'Punch Out': x.check_out
        ? new Date(x.check_out).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
        : '-',
      'Break Time': (x as any).break || '00:00:00',
      'Total Hours': x.hours || '00:00:00',
      'Status': x.status || '-',
    }));

    TableExportUtil.exportToExcel(exportData, 'Attendance_Report');
  }

  masterToggle() {
    this.isAllSelected() ?
      this.selection.clear() :
      this.dataSource.renderedData.forEach(row => this.selection.select(row));
  }

  removeSelectedRows() {
    const totalSelect = this.selection.selected.length;
    // implement batch delete logic here or update datasource accordingly
    this.selection.clear();
    this.snackBar.open(`${totalSelect} Records Deleted`, '', { duration: 2000 });
    this.refresh();
  }
  private formatDateForDB(date: any): string | null {
    if (!date) return null;
    return formatDate(date, 'yyyy-MM-dd', 'en'); // Format using Angular's formatDate
  }
  showNotification(
    colorName: string,
    text: string,
    placementFrom: MatSnackBarVerticalPosition,
    placementAlign: MatSnackBarHorizontalPosition
  ) {
    this.snackBar.open(text, '', {
      duration: 2000,
      verticalPosition: placementFrom,
      horizontalPosition: placementAlign,
      panelClass: colorName,
    });
  }
}

export class AttendanceDataSource extends BehaviorSubject<EmployeeAttendance[]> {
  filterChange = new BehaviorSubject('');
  filteredData: EmployeeAttendance[] = [];
  renderedData: EmployeeAttendance[] = [];

  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }

  constructor(
    public data: EmployeeAttendance[],
    public paginator: MatPaginator,
    public sort: MatSort
  ) {
    super([]);
    this.data = data;
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }

  connect(): Observable<EmployeeAttendance[]> {
    const displayDataChanges = [
      this.sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];

    return merge(...displayDataChanges).pipe(
      map(() => {
        this.filteredData = this.data.slice().filter(att => {
          const formattedDate = formatDate(att.date, 'yyyy-MM-dd', 'en');
          const dateFormatted1 = formatDate(att.date, 'dd-MM-yyyy', 'en');       // 02-06-2025
          const dateFormatted2 = formatDate(att.date, 'MMM d, y', 'en');         // Jun 2, 2025
          const monthShort = formatDate(att.date, 'MMM', 'en');                  // Jun
          const monthFull = formatDate(att.date, 'MMMM', 'en');                  // June
          const checkInFormatted = att.check_in
            ? formatDate(att.check_in, 'hh:mm:ss a', 'en')
            : '';

          const checkOutFormatted = att.check_out
            ? formatDate(att.check_out, 'hh:mm:ss a', 'en')
            : '';


          const searchStr = (
            att.employee_name +
            att.status +
            formattedDate +
            dateFormatted1 +
            dateFormatted2 +
            monthShort +
            monthFull +
            checkInFormatted +
            checkOutFormatted
          ).toLowerCase();

          return searchStr.includes(this.filter.toLowerCase());
        });


        const sortedData = this.sortData(this.filteredData.slice());

        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
        this.renderedData = sortedData.splice(startIndex, this.paginator.pageSize);

        return this.renderedData;
      })
    );
  }

  disconnect() { }

  sortData(data: EmployeeAttendance[]): EmployeeAttendance[] {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }

    return data.sort((a, b) => {
      let valueA: string | number = '';
      let valueB: string | number = '';

      switch (this.sort.active) {
        case 'employee_name':
          [valueA, valueB] = [a.employee_name, b.employee_name];
          break;
        case 'date':
          valueA = new Date(a.date).getTime();
          valueB = new Date(b.date).getTime();
          break;
        case 'status':
          [valueA, valueB] = [a.status, b.status];
          break;
        case 'hours':
          [valueA, valueB] = [a.hours, b.hours];
          break;
      }

      return (valueA < valueB ? -1 : 1) * (this.sort.direction === 'asc' ? 1 : -1);
    });
  }

}

