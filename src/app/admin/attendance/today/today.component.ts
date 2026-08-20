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
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { PauseHistoryDialogComponent } from '@shared/pause-history-dialog/pause-history-dialog.component';

@Component({
  selector: 'app-today',
  templateUrl: './today.component.html',
  styleUrls: ['./today.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatIconModule,
    MatTableModule,
    MatSortModule,
  
    MatRippleModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    CommonModule,
  ],
})
export class TodayComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  filterToggle = false;
  displayedColumns = [

    'name',
    'date',
    'first_in',
    'last_out',
    'total',
    'break',
    'status',
    'pause_start',
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

  this.todayService.getPauseHistory(row.id).subscribe({
    next: (history) => {

      this.dialog.open(PauseHistoryDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        data: {
          employeeName: row.fullName || row.name,
          history: history
        }
      });

    },

    error: (error) => {
      console.error('Error loading pause history:', error);
    }
  });

}
  isBreakGreaterThanOneHour(breakTime: string): boolean {
  if (!breakTime) {
    return false;
  }

  const parts = breakTime.split(':').map(Number);

  let totalSeconds = 0;

  if (parts.length === 3) {
    totalSeconds =
      parts[0] * 3600 +
      parts[1] * 60 +
      parts[2];
  } else if (parts.length === 2) {
    totalSeconds =
      parts[0] * 60 +
      parts[1];
  }

  return totalSeconds > 3600;
}

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }

  public loadData() {
    this.exampleDatabase = this.todayService; // use injected service instance

    this.dataSource = new ExampleDataSource(
      this.exampleDatabase,
      this.paginator,
      this.sort
    );
    this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(
      () => {
        if (!this.dataSource) {
          return;
        }
        this.dataSource.filter = this.filter.nativeElement.value;
      }
    );
  }
}

export class ExampleDataSource extends DataSource<Today> {
  private dataSubject = new BehaviorSubject<Today[]>([]);
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
    private todayService: TodayService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    this.filterChange.subscribe(() => this.paginator.pageIndex = 0);

    // Subscribe to the observable here and update dataSubject
    this.todayService.getAllTodays().subscribe({
     next: (data) => {
  console.log('TODAY ATTENDANCE DATA:', data);

  // Show all records
  this.dataSubject.next(data);
},
      error: (err) => {
        console.error('Error loading today data:', err);
        this.dataSubject.next([]); // clear data on error
      }
    });


  }

  connect(): Observable<Today[]> {
    return merge(
      this.dataSubject,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page
    ).pipe(
      map(() => {
        // Get latest data from dataSubject
        this.filteredData = this.dataSubject.value
          .slice()
          .filter((today: Today) => {
            const searchStr = (
  (today.name || '') +
  (today.first_in || '') +
  (today.break || '') +
  (today.last_out || '') +
  (today.total || '') +
  (today.status || '') +
  (today.shift || '') +
  (today.pause_start || '')
).toLowerCase();
            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });

        const sortedData = this.sortData(this.filteredData.slice());
        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
        this.renderedData = sortedData.splice(startIndex, this.paginator.pageSize);
        return this.renderedData;
      })
    );
  }

  disconnect() { }

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

