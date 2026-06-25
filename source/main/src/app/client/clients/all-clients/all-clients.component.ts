import { Component, ElementRef, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataSource } from '@angular/cdk/collections';
import { FormDialogComponent } from './dialog/form-dialog/form-dialog.component';
import { DeleteDialogComponent } from './dialog/delete/delete.component';

import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SelectionModel } from '@angular/cdk/collections';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { ClientsService } from './clients.service';
import { Clients } from './clients.model';
import { Direction } from '@angular/cdk/bidi';
import { TableExportUtil, TableElement } from '@shared';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CommonModule, NgClass } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { Router } from '@angular/router';

@Component({
  selector: 'app-all-clients',
  templateUrl: './all-clients.component.html',
  styleUrls: ['./all-clients.component.scss'],
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
    MatPaginatorModule,
    CommonModule
  ],
})
export class AllclientComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  displayedColumns = [
    'bde_account_id',
    'bde_account_email',
    'name',
    'email',
    'technology',
    'client_type',
    'client_Connect_Type',
    'country',
    'mobile',
    'actions',
  ];
  exampleDatabase?: ClientsService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<Clients>(true, []);
  index?: number;
  id?: number;
  clients?: Clients;
  allClients: Clients[] = [];

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public clientService: ClientsService,
    private snackBar: MatSnackBar,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {
    super();
  }
  @ViewChild(MatPaginator, { static: true }) paginator!: MatPaginator;
  @ViewChild(MatSort, { static: true }) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;
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
        clients: this.clients,
        action: 'add',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 1) {
        // After dialog is closed we're doing frontend updates
        // For add we're just pushing a new row inside DataService
        this.exampleDatabase?.dataChange.value.unshift(
          this.clientService.getDialogData()
        );
        this.refreshTable();
        this.showNotification(
          'snackbar-success',
          'Add Record Successfully...!!!',
          'bottom',
          'center'
        );
      }
    });
  }
  editCall(row: Clients) {
    console.log(row);
    this.id = row.id;
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        clients: row,
        action: 'edit',
      },
      direction: tempDirection,
    });
    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      // console.log("result", result);
      if (result) {
        this.refreshTable();
        // When using an edit things are little different, firstly we find record inside DataService by id
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        console.log(foundIndex);
        // Then you update that record using data from dialogData (values you enetered)
        if (foundIndex !== undefined) {
          console.log(foundIndex);
          setTimeout(() => {
            this.exampleDatabase!.dataChange.value[foundIndex] =
              this.clientService.getDialogData();
            this.refreshTable();
          });
        }
        // window.location.reload();
        this.refreshTable();
      }
    });
  }
  deleteItem(i: number, row: Clients) {
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
        if (foundIndex !== undefined) {
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
  viewItem(row: any): void {
    // Open dialog or route to client details page
    console.log('Viewing client:', row);
    this.router.navigate(['/client/clients/clientDetails', row.id]);
  }

  private refreshTable() {
    this.paginator._changePageSize(this.paginator.pageSize);
  }
  /** Whether the number of selected elements matches the total number of rows. */
  isAllSelected() {
    const numSelected = this.selection.selected.length;
    const numRows = this.dataSource?.renderedData.length;
    return numSelected === numRows;
  }

  /** Selects all rows if they are not all selected; otherwise clear selection. */
  masterToggle() {
    this.isAllSelected()
      ? this.selection.clear()
      : this.dataSource?.renderedData.forEach((row) =>
        this.selection.select(row)
      );
  }
  removeSelectedRows() {
    const totalSelect = this.selection.selected.length;
    this.selection.selected.forEach((item) => {
      const index = this.exampleDatabase?.dataChange.value.findIndex((d) => d === item) ?? -1;
      if (index > -1) {
        this.exampleDatabase?.dataChange.value.splice(index, 1);
      }
    });
    this.refreshTable();
    this.selection = new SelectionModel<Clients>(true, []);
    this.showNotification(
      'snackbar-danger',
      totalSelect + ' Record Delete Successfully...!!!',
      'bottom',
      'center'
    );
  }

  activeClientType: 'All' | 'Cold' | 'Hot' | 'Close' = 'All';

  setClientType(type: 'All' | 'Cold' | 'Hot' | 'Close') {
    this.activeClientType = type;
    this.applyClientTypeFilter();
  }

  applyClientTypeFilter() {
    if (!this.allClients?.length) return;

    const filtered = this.activeClientType === 'All'
      ? this.allClients
      : this.allClients.filter(
          c => c.client_type?.toLowerCase() === this.activeClientType.toLowerCase()
        );

    this.exampleDatabase?.dataChange.next(filtered);
    this.dataSource = new ExampleDataSource(this.exampleDatabase!, this.paginator, this.sort);
    this.cdr.detectChanges();
  }

  // public loadData() {
  //   this.exampleDatabase = new ClientsService(this.httpClient);
  //   this.exampleDatabase.isTblLoading = true;

  //   this.exampleDatabase.getAllClients().subscribe({
  //     next: (clients) => {
  //       const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
  //       const loggedInEmployeeId = Number(currentUser.id);

  //       const userClients = clients.filter(c => Number(c.employee_id) === loggedInEmployeeId);

  //       this.allClients = userClients;
  //       this.exampleDatabase!.isTblLoading = false;
  //       this.exampleDatabase!.dataChange.next(userClients);

  //       this.dataSource = new ExampleDataSource(
  //         this.exampleDatabase!,
  //         this.paginator,
  //         this.sort
  //       );

  //       this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
  //         if (!this.dataSource) return;
  //         this.dataSource.filter = this.filter.nativeElement.value;
  //       });

  //       this.cdr.detectChanges();
  //     },
  //     error: (err) => {
  //       // console.error(‘Failed to load clients:’, err);
  //       this.exampleDatabase!.isTblLoading = false;
  //       this.cdr.detectChanges();
  //     }
  //   });
  // }

  










  // export table data in excel file
  
  
  
  
  public loadData() {
    this.exampleDatabase = new ClientsService(this.httpClient);
    this.exampleDatabase.isTblLoading = true;

    this.exampleDatabase.getAllClients().subscribe({
      next: (clients) => {
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        const loggedInEmployeeId = Number(currentUser.id);
        const userClients = clients.filter(c => Number(c.employee_id) === loggedInEmployeeId);

        this.allClients = userClients;
        this.exampleDatabase!.isTblLoading = false;
        this.exampleDatabase!.dataChange.next(userClients);

        this.dataSource = new ExampleDataSource(
          this.exampleDatabase!,
          this.paginator,
          this.sort
        );

        this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
          if (!this.dataSource) return;
          this.dataSource.filter = this.filter.nativeElement.value;
        });

        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Failed to load clients:', err);
        this.exampleDatabase!.isTblLoading = false;
        this.cdr.detectChanges();
      }
    });
  }
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        Name: x.fullName,
        bde_account_id: x.bde_account_id,
        bde_account_email: x.bde_account_email,
        Mobile: x.mobile,
        Email: x.email,
        Technolog: x.technology,
        client_type: x.client_type,
        client_Connect_Type: x.client_Connect_Type,
        Country: x.country,
        Address: x.address
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
export class ExampleDataSource extends DataSource<Clients> {
  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }
  filteredData: Clients[] = [];
  renderedData: Clients[] = [];
  constructor(
    public exampleDatabase: ClientsService,
    public paginator: MatPaginator,
    public _sort: MatSort
  ) {
    super();
    // Reset to the first page when the user changes the filter.
    this.filterChange.subscribe(() => (this.paginator.pageIndex = 0));
  }
  /** Connect function called by the table to retrieve one stream containing the data to render. */
  connect(): Observable<Clients[]> {
    const displayDataChanges = [
      this.exampleDatabase.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];

    return merge(...displayDataChanges).pipe(
      map(() => {
        // Data is already pre-filtered by employee_id in loadData() — only apply text search here
        this.filteredData = this.exampleDatabase.data
          .slice()
          .filter((client: Clients) => {
            const searchStr = (
              (client.fullName || '') +
              (client.bde_account_id || '') +
              (client.bde_account_email || '') +
              (client.mobile || '') +
              (client.email || '') +
              (client.technology || '') +
              (client.client_type || '') +
              (client.country || '')
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

  disconnect() {
    //disconnect
  }
  /** Returns a sorted copy of the database data. */
  sortData(data: Clients[]): Clients[] {
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
        case 'email':
          [propertyA, propertyB] = [a.email, b.email];
          break;
        case 'company_name':
          [propertyA, propertyB] = [a.company_name, b.company_name];
          break;
        case 'currency':
          [propertyA, propertyB] = [a.currency, b.currency];
          break;
        case 'mobile':
          [propertyA, propertyB] = [a.mobile, b.mobile];
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
