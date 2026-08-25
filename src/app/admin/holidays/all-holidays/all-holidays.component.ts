
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';

import { HolidayService } from './all-holidays.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';

import {
  MatPaginator,
  MatPaginatorModule
} from '@angular/material/paginator';

import {
  MatSort,
  MatSortModule
} from '@angular/material/sort';

import { AllHoliday } from './all-holidays.model';

import { DataSource } from '@angular/cdk/collections';

import {
  CommonModule,
  DatePipe,
  formatDate,
  NgClass
} from '@angular/common';

import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';

import { FormDialogComponent } from './dialog/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialog/delete/delete.component';

import {
  BehaviorSubject,
  fromEvent,
  merge,
  Observable
} from 'rxjs';

import { map } from 'rxjs/operators';

import { SelectionModel } from '@angular/cdk/collections';

import { UnsubscribeOnDestroyAdapter } from '@shared';

import { Direction } from '@angular/cdk/bidi';

import {
  TableExportUtil,
  TableElement
} from '@shared';

import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';

import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';

import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';


@Component({
  selector: 'app-allholiday',

  templateUrl: './all-holidays.component.html',

  styleUrls: ['./all-holidays.component.scss'],

  standalone: true,

  imports: [
    CommonModule,
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
    MatPaginatorModule,
    DatePipe,
  ],
})
export class AllHolidayComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit, AfterViewInit {


  // =====================================================
  // PERMISSION
  // =====================================================

  isAdminOrHR = false;


  // =====================================================
  // TABLE
  // =====================================================

  displayedColumns = [
    'hName',
    'date',
    'details',
    'actions',
  ];


  exampleDatabase?: HolidayService;

  dataSource!: ExampleDataSource;


  selection =
    new SelectionModel<AllHoliday>(
      true,
      []
    );


  index?: number;

  id?: number;

  holiday?: AllHoliday;


  // =====================================================
  // VIEW CHILDREN
  // =====================================================

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;


  @ViewChild(MatSort)
  sort!: MatSort;


  @ViewChild('filter')
  filter!: ElementRef;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(
    public httpClient: HttpClient,

    public dialog: MatDialog,

    public holidayService: HolidayService,

    private snackBar: MatSnackBar
  ) {

    super();

  }


  // =====================================================
  // INIT
  // =====================================================

  ngOnInit(): void {

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          'currentUser'
        ) || '{}'
      );


    const role =
      String(
        currentUser.role || ''
      )
        .trim()
        .toLowerCase();


    const department =
      String(
        currentUser.department || ''
      )
        .trim()
        .toLowerCase();


    this.isAdminOrHR =
      role === 'admin' ||
      department === 'hr';


    console.log(
      'Holiday permissions:',
      {
        role: currentUser.role,
        department: currentUser.department,
        isAdminOrHR:
          this.isAdminOrHR
      }
    );

  }


  // =====================================================
  // AFTER VIEW INIT
  // =====================================================

  ngAfterViewInit(): void {

    console.log(
      '================ VIEW INIT ================'
    );


    console.log(
      'PAGINATOR:',
      this.paginator
    );


    console.log(
      'SORT:',
      this.sort
    );


    /*
     * IMPORTANT:
     *
     * loadData() is intentionally called here,
     * NOT inside ngOnInit().
     *
     * At this point Angular has already created
     * MatPaginator and MatSort.
     */

    this.loadData();

  }


  // =====================================================
  // REFRESH
  // =====================================================

  refresh(): void {

    this.loadData();

  }


  // =====================================================
  // ADD HOLIDAY
  // =====================================================

  addNew(): void {

    let tempDirection: Direction;


    if (
      localStorage.getItem(
        'isRtl'
      ) === 'true'
    ) {

      tempDirection = 'rtl';

    } else {

      tempDirection = 'ltr';

    }


    const dialogRef =
      this.dialog.open(
        FormDialogComponent,
        {
          data: {
            holiday:
              this.holiday,
            action: 'add',
          },

          direction:
            tempDirection,
        }
      );


    this.subs.sink =
      dialogRef
        .afterClosed()
        .subscribe(
          (result) => {

            if (result === 1) {

              /*
               * Refresh from API.
               *
               * This is better than manually pushing
               * the dialog data because it guarantees
               * Admin and HR see the same database data.
               */

              this.loadData();

            }

          }
        );

  }


  // =====================================================
  // FILTER
  // =====================================================

applyFilter(event: Event): void {

  if (!this.dataSource) {
    return;
  }

  const input =
    event.target as HTMLInputElement;

  const filterValue =
    input.value
      .trim()
      .toLowerCase();

  this.dataSource.filter =
    filterValue;
}


  // =====================================================
  // EDIT
  // =====================================================

  editCall(
    row: AllHoliday
  ): void {

    this.id = row.id;


    let tempDirection: Direction;


    if (
      localStorage.getItem(
        'isRtl'
      ) === 'true'
    ) {

      tempDirection = 'rtl';

    } else {

      tempDirection = 'ltr';

    }


    const dialogRef =
      this.dialog.open(
        FormDialogComponent,
        {
          data: {
            holiday: row,
            action: 'edit',
          },

          direction:
            tempDirection,
        }
      );


    this.subs.sink =
      dialogRef
        .afterClosed()
        .subscribe(
          (result) => {

            if (result === 1) {

              /*
               * Reload from API.
               */

              this.loadData();

            }

          }
        );

  }


  // =====================================================
  // DELETE
  // =====================================================

  deleteItem(
    i: number,
    row: AllHoliday
  ): void {

    this.index = i;

    this.id = row.id;


    let tempDirection: Direction;


    if (
      localStorage.getItem(
        'isRtl'
      ) === 'true'
    ) {

      tempDirection = 'rtl';

    } else {

      tempDirection = 'ltr';

    }


    const dialogRef =
      this.dialog.open(
        DeleteDialogComponent,
        {
          height: '260px',

          width: '300px',

          data: row,

          direction:
            tempDirection,
        }
      );


    this.subs.sink =
      dialogRef
        .afterClosed()
        .subscribe(
          (result) => {

            if (result === 1) {

              /*
               * Reload the complete list.
               */

              this.loadData();


              this.showNotification(
                'snackbar-danger',

                'Delete Record Successfully...!!!',

                'bottom',

                'center'
              );

            }

          }
        );

  }


  // =====================================================
  // REFRESH TABLE
  // =====================================================

  private refreshTable(): void {

    if (!this.paginator) {
      return;
    }


    this.paginator
      ._changePageSize(
        this.paginator.pageSize
      );

  }


  // =====================================================
  // SELECT ALL
  // =====================================================

  isAllSelected(): boolean {

    if (!this.dataSource) {
      return false;
    }


    const numSelected =
      this.selection.selected.length;


    const numRows =
      this.dataSource
        .renderedData.length;


    return (
      numSelected === numRows
    );

  }


  // =====================================================
  // MASTER TOGGLE
  // =====================================================

  masterToggle(): void {

    if (!this.dataSource) {
      return;
    }


    this.isAllSelected()

      ? this.selection.clear()

      : this.dataSource
          .renderedData
          .forEach(
            (row) =>
              this.selection.select(
                row
              )
          );

  }


  // =====================================================
  // REMOVE SELECTED
  // =====================================================

  removeSelectedRows(): void {

    if (
      !this.dataSource ||
      !this.exampleDatabase
    ) {

      return;

    }


    const selected =
      this.selection.selected;


    const totalSelect =
      selected.length;


    if (totalSelect === 0) {
      return;
    }


    selected.forEach(
      (item) => {

        const index =
          this.exampleDatabase!
            .dataChange
            .value
            .findIndex(
              (d) =>
                d.id === item.id
            );


        if (index >= 0) {

          this.exampleDatabase!
            .dataChange
            .value
            .splice(
              index,
              1
            );

        }

      }
    );


    this.exampleDatabase
      .dataChange
      .next(
        this.exampleDatabase
          .dataChange
          .value
      );


    this.selection =
      new SelectionModel<AllHoliday>(
        true,
        []
      );


    this.refreshTable();


    this.showNotification(
      'snackbar-danger',

      totalSelect +
        ' Record Delete Successfully...!!!',

      'bottom',

      'center'
    );

  }


  // =====================================================
  // LOAD DATA
  // =====================================================

  public loadData(): void {

    console.log(
      '================ HOLIDAY DEBUG ================'
    );


    console.log(
      'PAGINATOR BEFORE API:',
      this.paginator
    );


    console.log(
      'SORT BEFORE API:',
      this.sort
    );


    /*
     * Make sure service reference exists.
     */

    this.exampleDatabase =
      this.holidayService;


    this.holidayService
      .getAllHolidays()
      .subscribe({

        next: (
          data: AllHoliday[]
        ) => {

          console.log(
            'API DATA:',
            data
          );


          console.log(
            'IS ARRAY:',
            Array.isArray(
              data
            )
          );


          console.log(
            'DATA LENGTH:',
            data?.length
          );


          if (
            data &&
            data.length > 0
          ) {

            console.log(
              'FIRST HOLIDAY:',
              data[0]
            );

          }


          /*
           * Make sure paginator exists.
           */

          if (!this.paginator) {

            console.error(
              '❌ PAGINATOR IS UNDEFINED'
            );

            return;

          }


          if (!this.sort) {

            console.error(
              '❌ SORT IS UNDEFINED'
            );

            return;

          }


          /*
           * Update service data.
           */

          this.exampleDatabase!
            .dataChange
            .next(
              data || []
            );


          /*
           * Create datasource.
           */

          this.dataSource =
            new ExampleDataSource(

              this.exampleDatabase!,

              this.paginator,

              this.sort

            );


          console.log(
            'DATA SOURCE CREATED:',
            this.dataSource
          );


          /*
           * Setup filter listener.
           */

        if (this.filter) {

  this.subs.sink =
    fromEvent(
      this.filter.nativeElement,
      'keyup'
    )
    .subscribe(() => {

      if (!this.dataSource) {
        return;
      }

      const filterValue =
        this.filter.nativeElement.value
          .trim()
          .toLowerCase();

      this.dataSource.filter =
        filterValue;

    });

}


          console.log(
            'SERVICE DATA:',
            this.exampleDatabase
              ?.data
          );


          console.log(
            '================ END HOLIDAY DEBUG ================'
          );

        },


        error: (
          error
        ) => {

          console.error(
            '❌ ERROR LOADING HOLIDAYS:',
            error
          );

        }

      });

  }


  // =====================================================
  // EXPORT EXCEL
  // =====================================================

  exportExcel(): void {

    if (!this.dataSource) {

      console.warn(
        'Cannot export: dataSource not ready.'
      );

      return;

    }


    const exportData:
      Partial<TableElement>[] =

      this.dataSource
        .filteredData
        .map(
          (
            x: AllHoliday
          ) => ({

            'Holiday Name':
              x.hName,

            Date:
              formatDate(
                new Date(
                  x.date
                ),
                'yyyy-MM-dd',
                'en'
              ) || '',

            Details:
              x.details,

          })
        );


    TableExportUtil
      .exportToExcel(
        exportData,
        'excel'
      );

  }


  // =====================================================
  // SNACKBAR
  // =====================================================

  showNotification(
    colorName: string,

    text: string,

    placementFrom:
      MatSnackBarVerticalPosition,

    placementAlign:
      MatSnackBarHorizontalPosition

  ): void {

    this.snackBar.open(
      text,
      '',

      {

        duration: 2000,

        verticalPosition:
          placementFrom,

        horizontalPosition:
          placementAlign,

        panelClass:
          colorName,

      }
    );

  }

}


/*
 * =========================================================
 * EXAMPLE DATA SOURCE
 * =========================================================
 */

export class ExampleDataSource
  extends DataSource<AllHoliday> {


  // =====================================================
  // FILTER
  // =====================================================

  filterChange =
    new BehaviorSubject<string>(
      ''
    );


  get filter(): string {

    return this
      .filterChange
      .value;

  }


  set filter(
    filter: string
  ) {

    this
      .filterChange
      .next(
        filter
      );

  }


  // =====================================================
  // DATA
  // =====================================================

  filteredData:
    AllHoliday[] = [];


  renderedData:
    AllHoliday[] = [];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    public exampleDatabase:
      HolidayService,

    public paginator:
      MatPaginator,

    public _sort:
      MatSort

  ) {

    super();


    /*
     * Reset to first page
     * when filter changes.
     */

    this.filterChange
      .subscribe(
        () => {

          if (this.paginator) {

            this.paginator.pageIndex =
              0;

          }

        }
      );

  }


  // =====================================================
  // CONNECT
  // =====================================================

  connect():
    Observable<AllHoliday[]> {


    /*
     * IMPORTANT:
     *
     * At this point paginator and sort
     * have already been created by Angular.
     */

    const displayDataChanges = [

      this.exampleDatabase
        .dataChange,

      this._sort
        .sortChange,

      this.filterChange,

      this.paginator
        .page,

    ];


    return merge(
      ...displayDataChanges
    )
    .pipe(

      map(
        () => {


          // =================================================
          // FILTER
          // =================================================

          this.filteredData =

            this.exampleDatabase
              .data
              .slice()
              .filter(
                (
                  holiday:
                    AllHoliday
                ) => {


                  const dateFormats:
                    string[] = [];


                  if (
                    holiday.date
                  ) {

                    const dateObj =
                      new Date(
                        holiday.date
                      );


                    dateFormats.push(

                      formatDate(
                        dateObj,
                        'yyyy-MM-dd',
                        'en'
                      ),

                      formatDate(
                        dateObj,
                        'dd-MM-yyyy',
                        'en'
                      ),

                      formatDate(
                        dateObj,
                        'dd MMM yyyy',
                        'en'
                      ),

                      formatDate(
                        dateObj,
                        'MMM d, yyyy',
                        'en'
                      )

                    );

                  }


                  /*
                   * Use empty strings so
                   * undefined values don't
                   * become "undefined".
                   */

                  const searchStr =

                    (
                      holiday.shift ||
                      ''
                    ) +

                    (
                      holiday.hName ||
                      ''
                    ) +

                    (
                      holiday.details ||
                      ''
                    ) +

                    dateFormats.join(
                      ' '
                    ) +

                    (
                      holiday.location ||
                      ''
                    );


                  return searchStr
                    .toLowerCase()
                    .includes(
                      this.filter
                        .toLowerCase()
                    );

                }
              );


          console.log(
            'DATA SOURCE FILTERED DATA:',
            this.filteredData
          );


          // =================================================
          // SORT
          // =================================================

          const sortedData =
            this.sortData(
              this.filteredData
                .slice()
            );


          // =================================================
          // PAGINATION
          // =================================================

          const startIndex =
            this.paginator.pageIndex *
            this.paginator.pageSize;


          this.renderedData =
            sortedData.slice(

              startIndex,

              startIndex +
                this.paginator
                  .pageSize

            );


          console.log(
            'DATA SOURCE RENDERED DATA:',
            this.renderedData
          );


          return this.renderedData;

        }
      )

    );

  }


  // =====================================================
  // DISCONNECT
  // =====================================================

  disconnect(): void {

    // Nothing required.

  }


  // =====================================================
  // SORT
  // =====================================================

  sortData(
    data: AllHoliday[]
  ): AllHoliday[] {


    if (

      !this._sort ||

      !this._sort.active ||

      this._sort.direction === ''

    ) {

      return data;

    }


    return data.sort(
      (
        a,
        b
      ) => {


        let propertyA:
          number | string = '';


        let propertyB:
          number | string = '';


        switch (
          this._sort.active
        ) {


          case 'id':

            [
              propertyA,
              propertyB
            ] = [

              a.id,
              b.id

            ];

            break;


          case 'hName':

            [
              propertyA,
              propertyB
            ] = [

              a.hName,
              b.hName

            ];

            break;


          case 'date':

            [
              propertyA,
              propertyB
            ] = [

              a.date,
              b.date

            ];

            break;


          case 'location':

            [
              propertyA,
              propertyB
            ] = [

              a.location || '',
              b.location || ''

            ];

            break;


          case 'shift':

            [
              propertyA,
              propertyB
            ] = [

              a.shift || '',
              b.shift || ''

            ];

            break;

        }


        const valueA =
          isNaN(+propertyA)
            ? propertyA
            : +propertyA;


        const valueB =
          isNaN(+propertyB)
            ? propertyB
            : +propertyB;


        return (

          valueA < valueB
            ? -1
            : valueA > valueB
              ? 1
              : 0

        ) *

        (

          this._sort.direction ===
          'asc'

            ? 1

            : -1

        );

      }
    );

  }

}