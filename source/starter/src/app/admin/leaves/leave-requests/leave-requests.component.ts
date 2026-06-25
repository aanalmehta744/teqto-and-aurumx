import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LeavesService } from './leaves.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { Leaves } from './leaves.model';
import { DataSource } from '@angular/cdk/collections';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatMenuTrigger, MatMenuModule } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { FormComponent } from './form/form.component';
import { DeleteComponent } from './delete/delete.component';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement } from '@shared';
import { formatDate, NgClass, DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule } from '@angular/common';
import { environment } from 'environments/environment';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { AuthService } from '@core/service/auth.service';

@Component({
  selector: 'app-leave-requests',
  templateUrl: './leave-requests.component.html',
  styleUrls: ['./leave-requests.component.scss'],
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
    MatMenuModule,
    MatRippleModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    DatePipe,
    CommonModule,
  ],
})
export class LeaveRequestsComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  filterToggle = false;
  displayedColumns = [
    'name',
    'type',
    'from',
    'leaveTo',
    'noOfDays',
    'halfDay',
    'status',
    'reason',
    'actions',
  ];
  exampleDatabase?: LeavesService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<Leaves>(true, []);
  id?: number;
  leaves?: Leaves;

  // Logged-in user info
  loggedUser: any = null;
  loggedUserRole = '';

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public leavesService: LeavesService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    super();
  }

  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
  @ViewChild(MatMenuTrigger)
  contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  ngOnInit() {
    // Get logged-in user from auth service or localStorage
    this.loggedUser = this.authService.currentUserValue
      || JSON.parse(localStorage.getItem('currentUser') || 'null');
    this.loggedUserRole = this.loggedUser?.role || '';
    this.loadData();
  }

  refresh() {
    this.loadData();
  }

  // Only Admin and HR can add new leave requests for others
  canManageLeaves(): boolean {
    return this.loggedUserRole === 'Admin' || this.loggedUserRole === 'HR';
  }

  addNew() {
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    const dialogRef = this.dialog.open(FormComponent, {
      data: {
        leaves: this.leaves,
        action: 'add',
        loggedUser: this.loggedUser,
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        this.exampleDatabase?.dataChange.value.unshift(
          this.leavesService.getDialogData()
        );
        this.refreshTable();
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  detailsCall(row: Leaves) {
    this.dialog.open(FormComponent, {
      data: {
        leaves: row,
        action: 'details',
        loggedUser: this.loggedUser,
      },
      height: '70%',
      width: '45%',
    });
  }

  editCall(row: Leaves) {
    // Non-admin/HR users cannot edit leave status - open as details instead
    if (!this.canManageLeaves()) {
      this.detailsCall(row);
      return;
    }
    this.id = row.id;
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    const dialogRef = this.dialog.open(FormComponent, {
      data: {
        leaves: row,
        action: 'edit',
        loggedUser: this.loggedUser,
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        if (foundIndex !== undefined && this.exampleDatabase) {
          this.exampleDatabase!.dataChange.value[foundIndex] =
            this.leavesService.getDialogData();
          this.refreshTable();
        }
      }
    });
  }

  deleteItem(i: number, row: Leaves) {
    this.id = row.id;
    const tempDirection: Direction = localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';
    const dialogRef = this.dialog.open(DeleteComponent, {
      height: '270px',
      width: '330px',
      data: row,
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        if (foundIndex !== undefined && this.exampleDatabase) {
          this.exampleDatabase.dataChange.value.splice(foundIndex, 1);
          this.refreshTable();
          this.showNotification('snackbar-danger', 'Delete Record Successfully...!!!', 'bottom', 'center');
        }
      }
    });
  }

  getImageURL(filename: string | null | undefined): string {
    return filename
      ? `${environment.apiUrl.replace('/api', '')}/uploads/employees/${filename}`
      : 'assets/images/default-profile.png';
  }

  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }

  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource?.renderedData.length;
    return numSelected === numRows;
  }

  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource?.renderedData.forEach((row) => this.selection.select(row));
  }

  removeSelectedRows() {
    const totalSelect = this.selection.selected.length;
    this.selection.selected.forEach((item) => {
      const index = this.dataSource?.renderedData.findIndex((d) => d === item);
      this.exampleDatabase?.dataChange.value.splice(index, 1);
      this.refreshTable();
      this.selection = new SelectionModel<Leaves>(true, []);
    });
    this.showNotification('snackbar-danger', totalSelect + ' Record Delete Successfully...!!!', 'bottom', 'center');
  }

  public loadData() {
    this.exampleDatabase = new LeavesService(this.httpClient);
    this.dataSource = new ExampleDataSource(
      this.exampleDatabase,
      this.paginator,
      this.sort,
      this.loggedUser
    );
    this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(
      () => {
        if (!this.dataSource) return;
        this.dataSource.filter = this.filter.nativeElement.value;
      }
    );
  }

  exportExcel() {
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        Name: x.employee_name,
        'Leave Type': x.leave_type,
        'Leave From': formatDate(new Date(x.start_date), 'yyyy-MM-dd', 'en') || '',
        'Leave To': formatDate(new Date(x.end_date), 'yyyy-MM-dd', 'en') || '',
        'No Of Days': x.no_of_days,
        Status: x.status,
        Reason: x.reason,
      }));
    TableExportUtil.exportToExcel(exportData, 'excel');
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

export class ExampleDataSource extends DataSource<Leaves> {
  filterChange = new BehaviorSubject('');
  get filter(): string { return this.filterChange.value; }
  set filter(filter: string) { this.filterChange.next(filter); }
  filteredData: Leaves[] = [];
  renderedData: Leaves[] = [];

  constructor(
    public exampleDatabase: LeavesService,
    public paginator: MatPaginator,
    public _sort: MatSort,
    private loggedUser: any
  ) {
    super();
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }

  connect(): Observable<Leaves[]> {
    const displayDataChanges = [
      this.exampleDatabase.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];

    // Role-based data loading
    const role = this.loggedUser?.role || '';
    if (role === 'Admin' || role === 'HR') {
      this.exampleDatabase.getAllLeaves();
    } else {
      // BA, BDE, Employee: only their own leaves
      const employeeId = this.loggedUser?.id;
      if (employeeId) {
        this.exampleDatabase.getMyLeaves(employeeId);
      } else {
        this.exampleDatabase.dataChange.next([]);
      }
    }

    return merge(...displayDataChanges).pipe(
      map(() => {
        this.filteredData = this.exampleDatabase.data
          .slice()
          .filter((leaves: Leaves) => {
            const fromDate = leaves.end_date
              ? formatDate(new Date(leaves.end_date), 'yyyy-MM-dd', 'en') : '';
            const toDate = leaves.start_date
              ? formatDate(new Date(leaves.start_date), 'yyyy-MM-dd', 'en') : '';
            const searchStr = (
              (leaves.employee_name || '') +
              (leaves.leave_type || '') +
              fromDate + toDate +
              (leaves.status || '') +
              (leaves.reason || '')
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

  sortData(data: Leaves[]): Leaves[] {
    if (!this._sort.active || this._sort.direction === '') return data;
    return data.sort((a, b) => {
      let propertyA: number | string = '';
      let propertyB: number | string = '';
      switch (this._sort.active) {
        case 'id': [propertyA, propertyB] = [a.id, b.id]; break;
        case 'name': [propertyA, propertyB] = [a.employee_name, b.employee_name]; break;
        case 'type': [propertyA, propertyB] = [a.leave_type, b.leave_type]; break;
        case 'leaveTo': [propertyA, propertyB] = [a.end_date, b.end_date]; break;
        case 'status': [propertyA, propertyB] = [a.status, b.status]; break;
        case 'reason': [propertyA, propertyB] = [a.reason, b.reason]; break;
      }
      const valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      const valueB = isNaN(+propertyB) ? propertyB : +propertyB;
      return (valueA < valueB ? -1 : 1) * (this._sort.direction === 'asc' ? 1 : -1);
    });
  }
}
