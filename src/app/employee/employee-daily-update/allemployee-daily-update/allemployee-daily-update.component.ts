import { Component, OnInit, ViewChild, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { EmployeeDailyUpdateService } from './allemployee-daily-update.service';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule, formatDate } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { FormDialogComponent } from './dialog/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialog/delete/delete.component';
import { Direction } from '@angular/cdk/bidi';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-employee-daily-update',
  standalone: true,
  imports: [
    BreadcrumbComponent,
    CommonModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatIconModule,
    MatButtonModule,
    MatTooltipModule,
    FeatherIconsComponent,
    NgScrollbarModule
  ],
  templateUrl: './allemployee-daily-update.component.html',
  styleUrls: ['./allemployee-daily-update.component.scss'] // <-- fixed styleUrls here
})
export class AllEmployeeDailyUpdateComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['employee_name', 'department', 'project', 'taskTitle', 'actions'];
  dataSource = new MatTableDataSource<any>();
  isTblLoading = true;
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChildren(MatPaginator) paginators!: QueryList<MatPaginator>;
  userData: any;
  groupedData: { date: string, updates: any[], dataSource: MatTableDataSource<any> }[] = [];
  filteredGroupedData: { date: string, updates: any[], dataSource: MatTableDataSource<any> }[] = [];

  ishr: string = ''; // you may get this from auth service or localStorage

  constructor(private dailyUpdateService: EmployeeDailyUpdateService, public dialog: MatDialog) { }

  ngOnInit(): void {
    this.loadUserDataFromLocalStorage();
  }

  ngAfterViewInit() {
    // Assign paginators to grouped data sources on init
    this.assignPaginators();

    // Also listen for paginator changes (if any dynamic changes)
    this.paginators.changes.subscribe(() => {
      this.assignPaginators();
    });
  }

  assignPaginators() {
    this.paginators.forEach((paginator, index) => {
      if (this.filteredGroupedData[index]) {
        this.filteredGroupedData[index].dataSource.paginator = paginator;
      }
    });
  }

  loadUserDataFromLocalStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.userData = JSON.parse(userJson);
      console.log('Logged User Data:', this.userData);

      // Check if HR role (adjust property according to your actual user object structure)
      // if (this.userData?.department === 'HR') {
      //   this.ishr = 'true';
      //   this.displayedColumns = ['update']; // Show only update column for HR
      // } else {
      //   this.ishr = 'false';
      //   this.displayedColumns = ['project', 'taskTitle', 'taskDetails', 'update', 'status', 'actions'];
      // }

      this.fetchDailyUpdates();
    } else {
      console.warn('No logged-in user found in localStorage');
      this.isTblLoading = false;
    }
  }

  fetchDailyUpdates(): void {
    this.dailyUpdateService.getUpdates().subscribe((data) => {
      const grouped: { [key: string]: any[] } = {};

      data.forEach((update: any) => {
        const date = formatDate(update.update_date, 'yyyy-MM-dd', 'en-IN');
        if (!grouped[date]) {
          grouped[date] = [];
        }
        grouped[date].push(update);
      });

      this.groupedData = Object.keys(grouped).map((date) => {
        const ds = new MatTableDataSource(grouped[date]);
        ds.filterPredicate = (data: any, filter: string) => {
          const str = filter.trim().toLowerCase();
          const fullDate = formatDate(data.update_date, 'yyyy-MM-dd', 'en-IN');         // 2025-07-23
          const readableDate = formatDate(data.update_date, 'MMM d, y', 'en-US');       // Jul 23, 2025
          const altDate = formatDate(data.update_date, 'dd-MM-yyyy', 'en-IN');          // 23-07-2025
          const monthOnly = formatDate(data.update_date, 'MMMM', 'en-US').toLowerCase(); // july
          return (
            data.employee_name?.toLowerCase().includes(str) ||
            data.department?.toLowerCase().includes(str) ||
            data.projectTitle?.toLowerCase().includes(str) ||
            data.task_title?.toLowerCase().includes(str) ||
            fullDate.includes(str) ||
            readableDate.toLowerCase().includes(str) ||
            altDate.includes(str) ||
            monthOnly.includes(str) // match only month
          );
        };
        return {
          date,
          updates: grouped[date],
          dataSource: ds,
        };
      });

      this.filteredGroupedData = [...this.groupedData];

      setTimeout(() => {
        this.assignPaginators();
      });
    });
  }


  applyFilter(filterValue: string): void {
    const filter = filterValue.trim().toLowerCase();

    this.filteredGroupedData = this.groupedData
      .map((group) => {
        group.dataSource.filter = filter;
        const filteredData = group.dataSource.filteredData;

        const newDataSource = new MatTableDataSource(filteredData);
        newDataSource.filterPredicate = group.dataSource.filterPredicate;

        return {
          ...group,
          updates: filteredData,
          dataSource: newDataSource,
        };
      })
      .filter((group) => group.updates.length > 0);

    setTimeout(() => {
      this.assignPaginators();
    });
  }

  refresh() {
    this.fetchDailyUpdates();
  }

  addNew() {
    let tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        action: 'add',
      },
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('New Daily Update submitted:', result);
        this.fetchDailyUpdates();
      }
    });
  }

  editCall(row: any) {
    const direction: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        action: 'edit',
        updateData: row
      },
      direction: direction,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Edited Daily Update submitted:', result);
        this.fetchDailyUpdates();
      }
    });
  }

  deleteItem(row: any): void {
    let tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      data: row,
      direction: tempDirection,
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Deleted Daily Update confirmed:', result);
        this.fetchDailyUpdates();
      }
    });
  }
  viewCall(row: any) {
    let tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    console.log(row);
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        action: 'details',
        updateData: row // or whatever property your FormDialogComponent expects for detail data
      },
      direction: tempDirection,
      height: '600px',
      width: '700px',
      maxHeight: '70vh',
      panelClass: 'view-dialog'
    });

    dialogRef.afterClosed().subscribe((result) => {
      if (result) {
        console.log('Daily Update details dialog closed with:', result);
        this.fetchDailyUpdates();
      }
    });
  }


}
