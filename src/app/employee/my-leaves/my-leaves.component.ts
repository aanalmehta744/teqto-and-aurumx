import { Component, ElementRef, OnInit, ViewChild, } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataSource } from '@angular/cdk/collections';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialogs/delete/delete.component';
import { MatMenuTrigger, MatMenuModule } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { MyLeaves } from './my-leaves.model';
import { MyLeavesService } from './my-leaves.service';
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
import { Subscription } from 'rxjs';
import { ChangeDetectorRef } from '@angular/core';
@Component({
  selector: 'app-my-leaves',
  templateUrl: './my-leaves.component.html',
  styleUrls: ['./my-leaves.component.scss'],
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
    DatePipe,
  ],
})
export class MyLeavesComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  displayedColumns = [
    // 'select',
    'start_date',
    'end_date',
    'halfDay',
    'type',
    'status',
    'reason',
    'no_of_day',
    'actions',
  ];

  exampleDatabase?: MyLeavesService | null;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<MyLeaves>(true, []);
  id?: number;
  index?: number;
  filterSubscription!: Subscription;
  myLeaves?: MyLeaves | null;
  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public myLeavesService: MyLeavesService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
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
    this.loadData();
  }
  refresh() {
    this.loadData();
  }
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }
  addNew() {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        myLeaves: this.myLeaves,
        action: 'add',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // After dialog is closed we're doing frontend updates
        // For add we're just pushing a new row inside DataService
        this.exampleDatabase?.dataChange.value.unshift(
          this.myLeavesService.getDialogData()
        );
        this.refreshTable();

      }
    });
  }
  editCall(row: MyLeaves) {
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        myLeaves: row,
        action: 'edit',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // When using an edit things are little different, firstly we find record inside DataService by id
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        // Then you update that record using data from dialogData (values you enetered)
        if (foundIndex != null && this.exampleDatabase) {
          this.exampleDatabase.dataChange.value[foundIndex] =
            this.myLeavesService.getDialogData();
          // And lastly refresh table
          this.refreshTable();

        }
      }
    });
  }

  deleteItem(i: number, row: MyLeaves) {
    this.index = i;
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }

    const dialogRef = this.dialog.open(DeleteDialogComponent, {
      height: '260px',
      width: '300px',
      data: row,
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        // for delete we use splice in order to remove single object from DataService
        if (foundIndex !== undefined && this.exampleDatabase !== undefined) {
          this.exampleDatabase?.dataChange.value.splice(foundIndex, 1);
          this.refreshTable();
          this.showNotification(
            'snackbar-danger',
            'Delete Record Successfully...!!!',
            'bottom',
            'center'
          );
        }
      }
    });
  }
  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource.renderedData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource.renderedData.forEach((row) =>
        this.selection.select(row)
      );
  }
  removeSelectedRows() {
    const totalSelect = this.selection.selected.length;
    this.selection.selected.forEach((item) => {
      const index: number = this.dataSource.renderedData.findIndex(
        (d) => d === item
      );
      // console.log(this.dataSource.renderedData.findIndex((d) => d === item));
      this.exampleDatabase?.dataChange.value.splice(index, 1);
      this.refreshTable();
      this.selection = new SelectionModel<MyLeaves>(true, []);
    });
    this.showNotification(
      'snackbar-danger',
      totalSelect + ' Record Delete Successfully...!!!',
      'bottom',
      'center'
    );
  }
  public loadData(): void {
    this.exampleDatabase = this.myLeavesService;

    // First, fetch the data
    this.subs.sink = this.exampleDatabase.getAllMyLeaves().subscribe(() => {
      this.dataSource = new ExampleDataSource(this.exampleDatabase!, this.paginator, this.sort);

      if (this.filterSubscription) {
        this.filterSubscription.unsubscribe();
      }

      this.filterSubscription = fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
        if (this.dataSource) {
          this.dataSource.filter = this.filter.nativeElement.value.trim().toLowerCase();
        }
      });

      this.refreshTable();

      this.cdr.detectChanges();  // <-- manually update view to avoid ExpressionChangedAfterItHasBeenCheckedError
    });


  }
  // export table data in excel file
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        'From Date': formatDate(new Date(x.start_date), 'yyyy-MM-dd', 'en') || '',
        'To Date': formatDate(new Date(x.end_date), 'yyyy-MM-dd', 'en') || '',
        'Half Day': x.halfDay,
        Type: x.leave_type,
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
  // context menu
  onContextMenu(event: MouseEvent, item: MyLeaves) {
    event.preventDefault();
    this.contextMenuPosition.x = event.clientX + 'px';
    this.contextMenuPosition.y = event.clientY + 'px';
    if (this.contextMenu !== undefined && this.contextMenu.menu !== null) {
      this.contextMenu.menuData = { item: item };
      this.contextMenu.menu.focusFirstItem('mouse');
      this.contextMenu.openMenu();
    }
  }
}
export class ExampleDataSource extends DataSource<MyLeaves> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: MyLeaves[] = [];
  renderedData: MyLeaves[] = [];
  constructor(
    public exampleDatabase: MyLeavesService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<MyLeaves[]> {
    // Listen for any changes in the base data, sorting, filtering, or pagination
    const displayDataChanges = [
      this.exampleDatabase.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];
    // this.exampleDatabase.getAllMyLeaves();
    return merge(...displayDataChanges).pipe(
      map(() => {
        // Filter data with additional checks for undefined/empty properties
        this.filteredData = this.exampleDatabase.data
          .slice()
          .filter((myLeaves: MyLeaves) => {
            // Use optional chaining (?.) to avoid accessing undefined properties
            const leaveType = myLeaves?.leave_type || '';
            const halfDay = myLeaves?.halfDay || '';
            const reason = myLeaves?.reason || '';
            const status = myLeaves?.status || '';
            // Raw dates
            const start_date = myLeaves?.start_date || '';
            const end_date = myLeaves?.end_date || '';

            // Also format dates as "MMM dd, yyyy" (e.g., "Aug 26, 2025")
            const formattedStart = start_date
              ? formatDate(start_date, 'MMM dd, yyyy', 'en')
              : '';
            const formattedEnd = end_date
              ? formatDate(end_date, 'MMM dd, yyyy', 'en')
              : '';
            // Format 2: "dd-MM-yyyy" (e.g., "26-08-2025")
            const formattedStart2 = start_date ? formatDate(start_date, 'dd-MM-yyyy', 'en') : '';
            const formattedEnd2 = end_date ? formatDate(end_date, 'dd-MM-yyyy', 'en') : '';
            // Create a search string from the available properties
            const searchStr = (leaveType + halfDay + status + reason + start_date + end_date + formattedStart +
              formattedEnd + formattedStart2 + formattedEnd2).toLowerCase();
            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });

        // Sort filtered data
        const sortedData = this.sortData(this.filteredData.slice());

        // Grab the page's slice of the filtered sorted data.
        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
        this.renderedData = sortedData.splice(startIndex, this.paginator.pageSize);
        return this.renderedData;
      })
    );

  }
  disconnect() {
    //disconnect
  }
  /** Returns a sorted copy of the database data. */
  sortData(data: MyLeaves[]): MyLeaves[] {
    if (!this._sort.active || this._sort.direction === '') {
      return data;
    }
    return data.sort((a, b) => {
      let propertyA: number | string = '';
      let propertyB: number | string = '';
      switch (this._sort.active) {
        case 'id':
          [propertyA, propertyB] = [a.id, b.id];
          break;
        case 'type':
          [propertyA, propertyB] = [a.leave_type, b.leave_type];
          break;
        case 'status':
          [propertyA, propertyB] = [a.status, b.status];
          break;
        case 'applyDate':
          [propertyA, propertyB] = [a.applyDate, b.applyDate];
          break;
        case 'start_date':
          [propertyA, propertyB] = [a.start_date, b.start_date];
          break;
      }
      const valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      const valueB = isNaN(+propertyB) ? propertyB : +propertyB;
      return (
        (valueA < valueB ? -1 : 1) * (this._sort.direction === 'asc' ? 1 : -1)
      );
    });
  }
}
