import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { TodayService } from './today.service';
import { HttpClient } from '@angular/common/http';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataSource } from '@angular/cdk/collections';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatMenuTrigger } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { Today } from './today.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { NgClass } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule } from '@angular/common';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PauseHistoryDialogComponent } from '@shared/pause-history-dialog/pause-history-dialog.component';
@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTableModule,
    MatSortModule,
    NgClass,
    MatRippleModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    CommonModule,
    MatIcon,
    MatDialogModule
  ],
})
export class TodayComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  filterToggle = false;
  displayedColumns = [

    'name',
    'first_in',
    'last_out',
    'total',
    'break',
    'status',
      'pause_history'
  ];
  exampleDatabase?: TodayService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<Today>(true, []);
  id?: number;
  today?: Today;
  constructor(
    public httpClient: HttpClient,
    public todayService: TodayService,
      private dialog: MatDialog

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
  toggleStar(row: Today) {
    console.log(row);
  }
openPauseHistory(row: Today) {

  const currentUser = JSON.parse(
    localStorage.getItem('currentUser') || '{}'
  );

  const department = (
    currentUser.department || ''
  ).toLowerCase();

  const isHR = department === 'hr';

  // HR can see all employees.
  if (isHR) {

    this.todayService.getAllPauseHistory().subscribe({
      next: (history: any[]) => {

        this.dialog.open(PauseHistoryDialogComponent, {
          width: '700px',
          maxWidth: '95vw',
          data: {
            employeeName: 'All Employees',
            history: history
          }
        });

      },

      error: (error: any) => {
        console.error(
          'Error loading all pause history:',
          error
        );
      }
    });

    return;
  }

  // Normal Employee / BDE / BA
  // Only their own pause history.
  this.todayService.getPauseHistory(row.id).subscribe({

    next: (history: any[]) => {

      this.dialog.open(PauseHistoryDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        data: {
          employeeName: row.fullName || row.name,
          history: history
        }
      });

    },

    error: (error: any) => {
      console.error(
        'Error loading pause history:',
        error
      );
    }

  });
}
  // public loadData() {
  //   this.exampleDatabase = new TodayService(this.httpClient);
  public loadData() {
  this.exampleDatabase = this.todayService;

  this.dataSource = new ExampleDataSource(
    this.exampleDatabase,
    this.paginator,
    this.sort
  );

  this.subs.sink = fromEvent(
    this.filter.nativeElement,
    'keyup'
  ).subscribe(() => {
    if (!this.dataSource) {
      return;
    }

    this.dataSource.filter =
      this.filter.nativeElement.value;
  });
}
}
export class ExampleDataSource extends DataSource<Today> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: Today[] = [];
  renderedData: Today[] = [];
  constructor(
    public exampleDatabase: TodayService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  
  connect(): Observable<Today[]> {

  const displayDataChanges = [
    this.exampleDatabase.dataChange,
    this._sort.sortChange,
    this.filterChange,
    this.paginator.page,
  ];

  // Load today's attendance
  // this.exampleDatabase.getAllTodays().subscribe({
  //   next: (data) => {
  //     console.log('HR TODAY ATTENDANCE:', data);

  //     this.exampleDatabase.dataChange.next(data);
  //   },

  //   error: (error) => {
  //     console.error('HR TODAY ATTENDANCE ERROR:', error);

  //     this.exampleDatabase.dataChange.next([]);
  //   }
  // });
  this.exampleDatabase.getAllTodays().subscribe({
  next: (data) => {
    console.log('EMPLOYEE TODAY ATTENDANCE:', data);

    const currentUser = JSON.parse(
      localStorage.getItem('currentUser') || '{}'
    );

    console.log('CURRENT USER:', currentUser);

    console.log(
      'CURRENT EMPLOYEE ID:',
      currentUser.employee_id || currentUser.id
    );

    this.exampleDatabase.dataChange.next(data);
  },

  error: (error) => {
    console.error('EMPLOYEE TODAY ATTENDANCE ERROR:', error);

    this.exampleDatabase.dataChange.next([]);
  }
});

  return merge(...displayDataChanges).pipe(
    map(() => {

      this.filteredData = this.exampleDatabase.data
        .slice()
        .filter((today: Today) => {

          // Hide Admin
          // if (today.role?.toLowerCase() === 'admin') {
          //   return false;
          // }
const currentUser = JSON.parse(
  localStorage.getItem('currentUser') || '{}'
);

const currentEmployeeId = Number(
  currentUser.employee_id || currentUser.id
);

if (Number(today.employee_id) !== currentEmployeeId) {
  return false;
}
          const searchStr = (
            (today.name || '') +
            (today.fullName || '') +
            (today.first_in || '') +
            (today.break || '') +
            (today.last_out || '') +
            (today.total || '') +
            (today.status || '') +
            (today.shift || '') +
            (today.pause_start || '')+
            (today.pause_history || '')
          ).toLowerCase();

          return searchStr.indexOf(
            this.filter.toLowerCase()
          ) !== -1;
        });

      const sortedData = this.sortData(
        this.filteredData.slice()
      );

      const startIndex =
        this.paginator.pageIndex *
        this.paginator.pageSize;

      this.renderedData = sortedData.splice(
        startIndex,
        this.paginator.pageSize
      );

      return this.renderedData;
    })
  );
}


  disconnect() {
    //disconnect
  }
  /** Returns a sorted copy of the database data. */
  sortData(data: Today[]): Today[] {
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
        case 'name':
          [propertyA, propertyB] = [a.name, b.name];
          break;
        case 'first_in':
          [propertyA, propertyB] = [a.first_in, b.first_in];
          break;
        case 'break':
          [propertyA, propertyB] = [a.break, b.break];
          break;
        case 'last_out':
          [propertyA, propertyB] = [a.last_out, b.last_out];
          break;
        case 'total':
          [propertyA, propertyB] = [a.total, b.total];
          break;
        case 'status':
          [propertyA, propertyB] = [a.status, b.status];
          break;
        case 'shift':
          [propertyA, propertyB] = [a.shift, b.shift];
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

