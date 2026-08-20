import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { LeaveBalanceService } from './leave-balance.service';
import { HttpClient } from '@angular/common/http';
import { MatDialog } from '@angular/material/dialog';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { DataSource } from '@angular/cdk/collections';
import { MatSnackBar } from '@angular/material/snack-bar';
import { BehaviorSubject, fromEvent, merge, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MatMenuTrigger } from '@angular/material/menu';
import { SelectionModel } from '@angular/cdk/collections';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { LeaveBalance } from './leave-balance.model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { NgClass } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { AuthService } from '@core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';

@Component({
  selector: 'app-leave-balance',
  templateUrl: './leave-balance.component.html',
  styleUrls: ['./leave-balance.component.scss'],
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
    MatIconModule,
    MatProgressBarModule,
    MatCardModule
  ],
})
export class LeaveBalanceComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  filterToggle = false;
  displayedColumns = [
    'name',
    'total_paid_leave',
    'used_paid_leave',
    'used_sick_leave',
    'used_unpaid_leave',
  ];

  dataSource = new MatTableDataSource<LeaveBalance>();
  selection = new SelectionModel<LeaveBalance>(true, []);
  id?: number;
  leaves?: LeaveBalance;
  gender?: string;

  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatMenuTrigger) contextMenu?: MatMenuTrigger;
  contextMenuPosition = { x: '0px', y: '0px' };

  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public leavesService: LeaveBalanceService,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    super();
  }

  ngOnInit(): void {
    const user = this.authService.currentUserValue;
    console.log('logged user ', user);
    if (user) {
      this.gender = user.gender;
    }

    this.loadData();
  }

  toggleStar(row: LeaveBalance): void {
    console.log(row);
  }

  public loadData(): void {
    this.leavesService.getAllLeavess();  // Fetch data

    this.leavesService.dataChange.subscribe((data) => {
      this.dataSource.data = data;
      console.log(data);
      if (this.paginator) {
        this.dataSource.paginator = this.paginator;
      }
      if (this.sort) {
        this.dataSource.sort = this.sort;
      }
    });
  }
}