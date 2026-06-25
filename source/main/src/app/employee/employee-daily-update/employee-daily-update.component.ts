import { Component, OnInit, ViewChild, AfterViewInit, ViewChildren, QueryList } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { EmployeeDailyUpdateService } from './employee-daily-update.service';
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
  templateUrl: './employee-daily-update.component.html',
  styleUrls: ['./employee-daily-update.component.scss'] // <-- fixed styleUrls here
})
export class EmployeeDailyUpdateComponent implements OnInit, AfterViewInit {

  displayedColumns: string[] = ['project', 'taskTitle', 'taskDetails', 'update', 'status', 'actions'];
  dataSource = new MatTableDataSource<any>();
  isTblLoading = true;
  expandedRows: { [id: number]: boolean } = {};
  expandedTaskDetails: { [key: number]: boolean } = {};

  toggleExpand(id: number) {
    this.expandedRows[id] = !this.expandedRows[id];
  }
  toggleTaskDetails(rowId: number): void {
  this.expandedTaskDetails[rowId] = !this.expandedTaskDetails[rowId];
}
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
      if (this.userData?.department === 'HR') {
        this.ishr = 'true';
        this.displayedColumns = ['update', 'actions']; // Show only update column for HR
      } else {
        this.ishr = 'false';
        this.displayedColumns = ['project', 'taskTitle', 'taskDetails', 'update', 'status', 'actions'];
      }

      this.fetchDailyUpdates();
    } else {
      console.warn('No logged-in user found in localStorage');
      this.isTblLoading = false;
    }
  }

  fetchDailyUpdates(): void {
    if (!this.userData?.id) {
      this.isTblLoading = false;
      return;
    }

    this.isTblLoading = true;

    this.dailyUpdateService.getUpdates(this.userData.id).subscribe((res) => {
      this.isTblLoading = false;

      // Group by date
      const grouped: { [key: string]: any[] } = {};
      res.forEach((item: any) => {
        const date = formatDate(item.update_date, 'yyyy-MM-dd', 'en-IN');
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(item);
      });

      // Convert to array format and create MatTableDataSource for each group
      this.groupedData = Object.keys(grouped).map(date => ({
        date,
        updates: grouped[date],
        dataSource: new MatTableDataSource(grouped[date])
      }));

      // Initially filteredGroupedData = all groupedData
      this.filteredGroupedData = [...this.groupedData];

      // Assign paginators to data sources after data is set
      setTimeout(() => {
        this.assignPaginators();
      });

      console.log("Grouped Daily Updates:", this.groupedData);
    }, error => {
      console.error('Error fetching daily updates:', error);
      this.isTblLoading = false;
    });
  }

  applyFilter(filterValue: string): void {
    const filter = filterValue.trim().toLowerCase();

    this.filteredGroupedData = this.groupedData
      .map(group => {
        // Filter each update in the group manually
        const filteredUpdates = group.updates.filter(update => {
          const formattedDate = formatDate(update.update_date, 'dd-MM-yyyy', 'en-IN').toLowerCase();
          const monthNameShort = formatDate(update.update_date, 'MMM', 'en-IN').toLowerCase(); // jun
          const monthNameFull = formatDate(update.update_date, 'MMMM', 'en-IN').toLowerCase(); // june
          const mmmDy = formatDate(update.update_date, 'MMM d, y', 'en-IN').toLowerCase(); // e.g., "Jun 2, 2025"

          return (
            (update.projectTitle || '').toLowerCase().includes(filter) ||
            (update.title || '').toLowerCase().includes(filter) ||
            (update.note || '').toLowerCase().includes(filter) ||
            (update.update_details || '').toLowerCase().includes(filter) ||
            (update.status || '').toLowerCase().includes(filter) ||
            formattedDate.includes(filter) ||
            monthNameShort.includes(filter) ||
            monthNameFull.includes(filter) ||
            mmmDy.includes(filter)
          );
        });

        return {
          ...group,
          updates: filteredUpdates,
          dataSource: new MatTableDataSource(filteredUpdates)
        };
      })
      .filter(group => group.updates.length > 0);

    // Re-assign paginators for the filtered data sources
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
  detailsCall(row: any) {
    const direction: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        action: 'details',
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
}
