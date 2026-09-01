import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { NgClass } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
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
    CommonModule,
    MatExpansionModule
  ],
})
export class AllclientComponent extends UnsubscribeOnDestroyAdapter implements OnInit {
  displayedColumns = [
    'bde_name',
    // OLD: 'bde_account_id', 'bde_account_email',
    // NEW CODE: Bank detail columns replace BDE account columns
    'bank_name',
    'bank_account_number',
    'name',
    'email',
    'technology',
    'tag',
    'client_type',
    'client_Connect_Type',
    'last_followup_date',
    'last_followup_note',
    'country',
    'mobile',
    'actions',
  ];

  exampleDatabase?: ClientsService;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<Clients>(true, []);
  groupByBDE = false;
  clients?: Clients;
  id?: number;
  index?: number;
  bdeGroups: any[] = [];
  activeStatusTab: string = 'All';
  allClients: Clients[] = []; // Store all data for easy filtering

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild('filter', { static: true }) filter!: ElementRef;

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public clientService: ClientsService,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef,
    private router: Router
  ) {
    super();
  }

  ngOnInit() {
    this.setView(false); // Load All Clients by default
  }
  refresh() {
    this.loadData();
  }
  setView(group: boolean): void {
    this.groupByBDE = group;
    console.log(this.groupByBDE);
    if (this.groupByBDE) {
      this.loadClientsGroupedByBDE();
    } else {
      this.loadAllClients();
    }
  }

  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

  setStatusTab(tab: string): void {
    this.activeStatusTab = tab;
    this.applyStatusFilter();
  }

  applyStatusFilter(): void {
    if (this.dataSource) {
      const status = this.activeStatusTab.toLowerCase();
      this.dataSource.filteredData = this.exampleDatabase!.dataChange.value.filter((client: any) => {
        if (status === 'all') return true;
        return client.client_type?.toLowerCase() === status;
      });
      this.dataSource.renderedData = this.dataSource.filteredData.slice(0, this.paginator.pageSize);
    }
  }

  activeClientType: 'All' | 'Cold' | 'Hot' | 'Close' = 'All';

  // setClientType(type: 'All' | 'Cold' | 'Hot' | 'Close') {
  //   this.activeClientType = type;
  //   this.applyClientTypeFilter();
  // }

  setClientType(type: 'All' | 'Cold' | 'Hot' | 'Close') {
    this.activeClientType = type;

    if (this.groupByBDE) {
      this.applyClientTypeFilterGrouped();
    } else {
      this.applyClientTypeFilter();
    }
  }

  applyClientTypeFilterGrouped(): void {
    this.bdeGroups.forEach(group => {

      if (this.activeClientType === 'All') {
        group.filteredClients = [...group.clients];
      } else {
        group.filteredClients = group.clients.filter(
          (c: any) =>
            c.client_type?.toLowerCase() ===
            this.activeClientType.toLowerCase()
        );
      }

      // Reset pagination
      group.pageIndex = 0;
      group.paginatedClients = group.filteredClients.slice(0, group.pageSize);
    });
  }


  applyClientTypeFilter() {
    if (!this.allClients?.length) return;

    let filtered = this.allClients;

    if (this.activeClientType !== 'All') {
      filtered = this.allClients.filter(
        client => client.client_type?.toLowerCase() === this.activeClientType.toLowerCase()
      );
    }

    // Update datasource for table
    this.clientService.dataChange.next(filtered);
    this.setupDataSource();
  }

  loadAllClients(): void {
    this.clientService.getAllClients().subscribe((data) => {
      this.allClients = data; // Store master data for filtering
      this.clientService.dataChange.next(data);
      console.log('BehaviorSubject Data:', this.clientService.dataChange.value);
      this.setupDataSource();
    });
  }

  // loadAllClients(): void {
  //   this.clientService.getAllClients().subscribe((data) => {
  //     this.clientService.dataChange.next(data);
  //     this.setupDataSource();
  //   });
  // }

  // loadClientsGroupedByBDE(): void {
  //   this.clientService.getClientsGroupedByBDE().subscribe((data) => {
  //     const grouped = data.reduce((acc: any[], client: Clients) => {
  //       let group = acc.find(g => g.bde_name === client.bde_name);
  //       if (!group) {
  //         group = {
  //           bde_name: client.bde_name,
  //           clients: [],
  //           pageIndex: 0,
  //           pageSize: 5,
  //           paginatedClients: []
  //         };
  //         acc.push(group);
  //       }
  //       group.clients.push(client);
  //       return acc;
  //     }, []);

  //     // Initialize paginated clients for each group
  //     grouped.forEach((group: any) => {
  //       group.paginatedClients = group.clients.slice(0, group.pageSize);
  //     });
  //     this.bdeGroups = grouped;
  //   });
  // }

  loadClientsGroupedByBDE(): void {
    this.clientService.getClientsGroupedByBDE().subscribe((data) => {
      const grouped = data.reduce((acc: any[], client: Clients) => {
        let group = acc.find(g => g.bde_name === client.bde_name);
        if (!group) {
          group = {
            bde_name: client.bde_name,
            clients: [],
            filteredClients: [],
            pageIndex: 0,
            pageSize: 5,
            paginatedClients: []
          };
          acc.push(group);
        }
        group.clients.push(client);
        return acc;
      }, []);

      grouped.forEach((group: any) => {
        group.filteredClients = [...group.clients];
        group.paginatedClients = group.filteredClients.slice(0, group.pageSize);
      });

      this.bdeGroups = grouped;
    });
  }

  /** Handle paginator event for a specific group */
  onGroupPageChange(event: any, group: any) {
    const startIndex = event.pageIndex * event.pageSize;
    const endIndex = startIndex + event.pageSize;
    group.paginatedClients = group.clients.slice(startIndex, endIndex);

    group.pageIndex = event.pageIndex;
    group.pageSize = event.pageSize;
  }

  setupDataSource(): void {
    this.exampleDatabase = this.clientService;
    this.dataSource = new ExampleDataSource(this.exampleDatabase, this.paginator, this.sort);

    this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
      if (!this.dataSource) return;
      this.dataSource.filter = this.filter.nativeElement.value;
    });

    this.cdr.detectChanges();
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
      if (result) {
        // After dialog is closed we're doing frontend updates
        // For add we're just pushing a new row inside DataService
        this.exampleDatabase?.dataChange.value.unshift(
          this.clientService.getDialogData()
        );
        this.refreshTable();

        this.loadData();
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

      if (result) {
        // When using an edit things are little different, firstly we find record inside DataService by id
        const foundIndex = this.exampleDatabase?.dataChange.value.findIndex(
          (x) => x.id === this.id
        );
        // Then you update that record using data from dialogData (values you enetered)
        if (foundIndex !== undefined) {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          this.exampleDatabase!.dataChange.value[foundIndex] =
            this.clientService.getDialogData();
          // And lastly refresh table
          this.refreshTable();
          this.loadData();
        }
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
          this.loadData();
        }
      }
    });
  }
  viewItem(row: any): void {
    // Open dialog or route to client details page
    console.log('Viewing client:', row);
    this.router.navigate(['/admin/clients/clientDetails', row.id]);

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
      const index = this.dataSource?.renderedData.findIndex((d) => d === item);
      // console.log(this.dataSource.renderedData.findIndex((d) => d === item));
      this.exampleDatabase?.dataChange.value.splice(index, 1);
      this.refreshTable();
      this.selection = new SelectionModel<Clients>(true, []);
    });
    this.showNotification(
      'snackbar-danger',
      totalSelect + ' Record Delete Successfully...!!!',
      'bottom',
      'center'
    );
  }
  public loadData() {
    this.clientService.getAllClients().subscribe({
      next: (data) => {
        this.clientService.dataChange.next(data); // Important: set the BehaviorSubject
        console.log(data);
        this.exampleDatabase = this.clientService;
        this.dataSource = new ExampleDataSource(
          this.exampleDatabase,
          this.paginator,
          this.sort
        );

        this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
          if (!this.dataSource) return;
          this.dataSource.filter = this.filter.nativeElement.value;
        });
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Failed to load clients:', error);
      }
    });
  }

  // export perticule BDE data in excel file
  exportExcelBDE(bde: any) {
    if (!bde || !bde.clients || bde.clients.length === 0) {
      this.showNotification(
        'snackbar-warning',
        `No clients found for ${bde.bde_name || 'this BDE'}`,
        'bottom',
        'center'
      );
      return;
    }

    // Prepare export data for that BDE only
    const exportData: Partial<TableElement>[] = bde.clients.map((x: any) => ({
      'BDE': x.bde_name,
      // OLD: 'BDE Account Id': x.bde_account_id || '-', 'BDE Email Account': x.bde_account_email || '-',
      // NEW CODE: Export bank details instead
      'Bank Name': x.bank_name || '-',
      'Bank Account Number': x.bank_account_number || '-',
      'IFSC Code': x.ifsc_code || '-',
      'Client Name': x.fullName,
      'Mobile': x.mobile,
      'Email': x.email,
      'Technology': x.technology || '-',
      'Client Type': x.client_type || '-',
      'client Connect Type': x.client_Connect_Type || '-',
      'Last Followup Date': x.last_followup_date || '-',
      'Last Followup Note': x.last_followup_note || '-',
      'Country': x.country,
      'Address': x.address || '-',
      'Linkedin': x.linkedin_id || '-',
      'Website': x.website_link || '-',
      'Note': x.client_note || '-'
    }));

    // File name includes BDE name for clarity
    const fileName = `Clients_of_${bde.bde_name.replace(/\s+/g, '_')}`;

    TableExportUtil.exportToExcel(exportData, fileName);
    this.showNotification(
      'snackbar-success',
      `Excel exported for ${bde.bde_name}`,
      'bottom',
      'center'
    );
  }

  // export table data in excel file
  exportExcel() {
    // key name with space add in brackets
    const exportData: Partial<TableElement>[] =
      this.dataSource.filteredData.map((x) => ({
        BDE: x.bde_name,
        // OLD: bde_account_id: x.bde_account_id, bde_account_email: x.bde_account_email,
        // NEW CODE: Export bank details instead
        Bank_Name: x.bank_name,
        Bank_Account_Number: x.bank_account_number,
        IFSC_Code: x.ifsc_code,
        Name: x.fullName,
        Mobile: x.mobile,
        Email: x.email,
        Technolog: x.technology,
        client_type: x.client_type,
        client_Connect_Type: x.client_Connect_Type,
        last_followup_date: x.last_followup_date,
        last_followup_note: x.last_followup_note,
        Country: x.country,
        Address: x.address,
        Linkedin: x.linkedin_id,
        Website: x.website_link,
        Note: x.client_note
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
    // Listen for any changes in the base data, sorting, filtering, or pagination
    const displayDataChanges = [
      this.exampleDatabase.dataChange,
      this._sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];
    
    this.exampleDatabase.getAllClients();
    return merge(...displayDataChanges).pipe(
      map(() => {
        // Filter data
        this.filteredData = this.exampleDatabase.data
          .slice()
          .filter((clients: Clients) => {
            const searchStr = (
              clients.name +
              // OLD: clients.bde_account_id + clients.bde_account_email +
              // NEW CODE: Search bank fields instead
              (clients.bank_name || '') +
              (clients.bank_account_number || '') +
              clients.bde_name +
              clients.mobile +
              clients.email +
              clients.client_type +
              clients.client_Connect_Type +
              clients.last_followup_date +
              clients.last_followup_note +
              clients.country +
              clients.billing_method +
              clients.technology
            ).toLowerCase();
            return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
          });
        // Sort filtered data
        const sortedData = this.sortData(this.filteredData.slice());
        // Grab the page's slice of the filtered sorted data.
        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
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
        case 'bde_name':
          [propertyA, propertyB] = [a.bde_name, b.bde_name];
          break;
        case 'email':
          [propertyA, propertyB] = [a.email, b.email];
          break;
        case 'client_type':
          [propertyA, propertyB] = [a.client_type, b.client_type];
          break;
        case 'client_Connect_Type':
          [propertyA, propertyB] = [a.client_Connect_Type, b.client_Connect_Type];
          break;
        case 'country':
          [propertyA, propertyB] = [a.country, b.country];
          break;
        case 'mobile':
          [propertyA, propertyB] = [a.mobile, b.mobile];
          break;
        case 'technology':
          [propertyA, propertyB] = [a.technology, b.technology];
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
