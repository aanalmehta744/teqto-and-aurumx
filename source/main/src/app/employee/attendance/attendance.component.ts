import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { FormComponent } from './form/form.component';
import { UnsubscribeOnDestroyAdapter } from '@shared';
import { Attendances } from './attendance.model';
import { AttendancesService } from './attendance.service';
import { Direction } from '@angular/cdk/bidi';
import { DatePipe } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRippleModule } from '@angular/material/core';
import { MatTableModule } from '@angular/material/table';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { CommonModule } from '@angular/common';
import { em } from '@fullcalendar/core/internal-common';
import { NgZone } from '@angular/core';
import { ChangeDetectorRef } from '@angular/core';
import { MatIcon, MatIconModule } from '@angular/material/icon';
import { TableExportUtil, TableElement } from '@shared';
import Swal from 'sweetalert2';
import { interval, Subscription } from 'rxjs';
import { PauseHistoryDialogComponent } from '@shared/pause-history-dialog/pause-history-dialog.component';
@Component({
  selector: 'app-attendances',
  templateUrl: './attendance.component.html',
  styleUrls: ['./attendance.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatTableModule,
    MatSortModule,
    MatRippleModule,
    MatProgressSpinnerModule,
    MatPaginatorModule,
    DatePipe,
    CommonModule,
    MatIcon
  ],
})
export class AttendancesComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  filterToggle = false;
  displayedColumns = [
    'date',
    'day',
    'check_in',
    'check_out',
    'hours',
    'status',
    'break',
      'pause_start',
        'pause_history'


  ];
  exampleDatabase?: AttendancesService | null;
  dataSource!: ExampleDataSource;
  selection = new SelectionModel<Attendances>(true, []);
  id?: number;
  attendances?: Attendances | null;

  timer: any;
  data: any;
  startTime!: number;
  startDate!: Date;
  elapsedTime = 0;
  public timerDisplay = '00:00:00';
  isLoading = false;
  isTiming = false;   // true when timer is running
  isPaused = false;   // true when timer is paused
  hasCheckedInToday = false;
  showResumeButton = false;
  showPauseButton = false;
  pollingSubscription?: Subscription;

  pauseStart: number = 0;
  breakDuration: number = 0;


  constructor(
    public httpClient: HttpClient,
    public dialog: MatDialog,
    public attendancesService: AttendancesService,
    private snackBar: MatSnackBar,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef,

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
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;
    console.log(employeeId);
    this.getActiveAttendance();
    this.loadData();
    this.checkIfUserHasCheckedIn();
    if (employeeId) {
      this.startPauseStatusPolling();
    } else {
      console.error('employeeId not found');
    }
    window.addEventListener('storage', (event) => {

    });
  }
  isBreakGreaterThanOneHour(breakTime: string | null | undefined): boolean {
  if (!breakTime) {
    return false;
  }

  const parts = breakTime.split(':').map(Number);

  if (parts.length !== 3) {
    return false;
  }

  const totalSeconds =
    parts[0] * 3600 +
    parts[1] * 60 +
    parts[2];

  return totalSeconds > 3600;
}
  startPauseStatusPolling() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;
    setInterval(() => {
      this.attendancesService.checkPauseStatus(employeeId).subscribe({
        next: (res) => {
          // Directly set isPaused from API
          this.isPaused = res.is_paused === 1;
        },
        error: (err) => console.error('Pause status API error:', err)
      });
    }, 3000);
  }
  refresh() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;
    this.attendancesService.getAllAttendancess(employeeId).subscribe(data => {
      console.log('Loaded attendance records:', data);
      this.data.next(data);
    });
  }

  checkIfUserHasCheckedIn() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const userId = currentUser.id;
    if (!userId) return;

    const pollInterval = 5000; // 5 seconds

    const checkStatus = () => {
      const today = new Date().toISOString().split('T')[0];
      this.attendancesService.checkUserCheckedIn(userId, today).subscribe({
        next: (res) => {
          this.hasCheckedInToday = res.hasCheckedIn;

          if (this.hasCheckedInToday) {
            this.getActiveAttendance();
          }

          // this.snackBar.open(
          //   this.hasCheckedInToday
          //     ? 'You have already checked in today.'
          //     : 'You have not checked in yet.',
          //   'Close',
          //   {
          //     panelClass: this.hasCheckedInToday ? 'snackbar-error' : 'snackbar-success'
          //   }
          // );
        },
        error: (err) => {
          console.error('Error checking attendance status', err);

        }
      });
    };
    // Run once immediately
    checkStatus();

    // Use RxJS interval for polling
    this.pollingSubscription = interval(pollInterval).subscribe(() => {
      checkStatus();
    });
  }
  override ngOnDestroy() {
    this.pollingSubscription?.unsubscribe();
    super.ngOnDestroy(); // call base class cleanup
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value.trim().toLowerCase();
    this.dataSource.filter = filterValue;
  }
  detailsCall(row: Attendances) {
    let tempDirection: Direction;
    if (localStorage.getItem('isRtl') === 'true') {
      tempDirection = 'rtl';
    } else {
      tempDirection = 'ltr';
    }
    this.dialog.open(FormComponent, {
      data: {
        attendances: row,
        action: 'details',
      },
      direction: tempDirection,
      height: '85%',
      width: '35%',
    });

    console.log('Row status:', row.status);
    console.log('Full row data:', row);
  }

  openPauseHistory(row: Attendances) {

  console.log('Opening pause history for attendance:', row.id);

  this.attendancesService.getPauseHistory(row.id).subscribe({

    next: (history: any[]) => {

      console.log('Pause history:', history);

      this.dialog.open(PauseHistoryDialogComponent, {
        width: '600px',
        maxWidth: '95vw',
        data: {
          employeeName: 'My Pause History',
          history: history
        }
      });

    },

    error: (error: any) => {
      console.error('Error loading pause history:', error);
    }

  });

}
  public loadData() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;

    if (!employeeId) {
      this.snackBar.open('Invalid user ID.', 'Close', { duration: 2000 });
      return;
    }

    if (!this.dataSource) {
      this.exampleDatabase = this.attendancesService;

      this.dataSource = new ExampleDataSource(
        this.exampleDatabase,
        this.paginator,
        this.sort,
        employeeId
      );

      this.subs.sink = fromEvent(this.filter.nativeElement, 'keyup').subscribe(() => {
        if (!this.dataSource) return;
        this.dataSource.filter = this.filter.nativeElement.value;
      });
    }
    this.dataSource.refresh(employeeId);  // <-- fetch data and push to BehaviorSubject
  }
  onCheckIn() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;

    if (!employeeId) {
      this.snackBar.open('Invalid user ID.', 'Close', { duration: 2000 });
      return;
    }
    if (this.isTiming) {
      this.snackBar.open('You have already checked in.', 'Close', { duration: 2000 });
      return;
    }
    if (this.hasCheckedInToday) {
      this.snackBar.open('Already checked in today.', 'Close', { duration: 2000 });
      return;
    }

    this.attendancesService.startTimer(employeeId).subscribe({
      next: (res) => {
        // this.snackBar.open(res.message, 'Close', { duration: 2000 });

        // ✅ Use DB check-in time instead of local time
        this.startDate = new Date(res.data.check_in);
        this.startTime = this.startDate.getTime();
        this.elapsedTime = 0;
        this.breakDuration = 0;

        this.isTiming = true;
        this.isPaused = false;

        this.startTimerLoop();   // start ticking
        this.loadData();         // refresh attendance table
        // ✅ SweetAlert if Half Day
        if (res.data.status === 'Half Day') {
          Swal.fire({
            icon: 'warning',
            title: 'Half Day Marked',
            text: 'You checked in after 10:15 AM. Your attendance is marked as Half Day.',
            confirmButtonText: 'Okay'
          });
        } else {
          this.snackBar.open(res.message, 'Close', { duration: 2000 });
        }
      },
      error: (err) => {
        const msg =
          err?.error?.message ||
          (err.status === 400
            ? "You can't start the timer because no attendance record exists for today."
            : "Something went wrong while starting the timer. Please try again.");

        this.snackBar.open(msg, 'Close', { duration: 3000 });
      }
    });
  }
  onCheckOut() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');

    if (!currentUser || !currentUser.id) {
      this.snackBar.open('Invalid user ID.', 'Close', { duration: 2000 });
      return;
    }
    // ✅ Check if timer is paused or running
    if (this.isPaused) {
      Swal.fire({
        icon: 'warning',
        title: 'Cannot Check Out',
        text: 'Your timer is still paused. Please resume  the timer before checking out.',
        confirmButtonText: 'OK'
      });
      return; // Prevent checkout
    }
    Swal.fire({
      title: 'Are you sure?',
      text: 'Do you want to check out now?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, check out',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        const employeeId = currentUser.id;

        clearInterval(this.timer);
        this.isTiming = false;

        this.isLoading = true;

        this.attendancesService.stopTimer(employeeId).subscribe({
          next: (res) => {
            this.cdr.detectChanges();
            this.isLoading = false;
            this.snackBar.open('Checked out successfully.', 'Close', { duration: 2000 });

            // cleanup local storage AFTER successful checkout
            // localStorage.removeItem('attendanceStartTime');
            // localStorage.removeItem('attendanceStartDate');

            this.loadData();
          },
          error: (err) => {
            this.isLoading = false;
            console.error('Error during checkout:', err);

          }
        });
      }
    });
  }


  startTimerLoop() {
    clearInterval(this.timer);
    this.timer = setInterval(() => {
      let now = Date.now();
      let effectiveBreak = this.breakDuration;

      if (this.isPaused && this.pauseStart) {
        // include c nurrent ongoing break
        effectiveBreak += (now - this.pauseStart);
      }

      this.elapsedTime = now - this.startTime - effectiveBreak;

      const totalSeconds = Math.floor(this.elapsedTime / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      this.timerDisplay =
        `${hours.toString().padStart(2, '0')}:` +
        `${minutes.toString().padStart(2, '0')}:` +
        `${seconds.toString().padStart(2, '0')}`;
      // push live value to Dashboard
      this.attendancesService.updateTimer(this.timerDisplay);
      this.ngZone.run(() => this.cdr.detectChanges());
    }, 1000);
  }

  togglePauseResume() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;

    if (!employeeId) {
      this.snackBar.open('Invalid user ID.', 'Close', { duration: 2000 });
      return;
    }

    if (this.isPaused) {
      // RESUME
      const pauseEnd = Date.now();
      this.breakDuration += pauseEnd - this.pauseStart;
      this.pauseStart = 0;
      this.isPaused = false;

      this.attendancesService.resumeTimer(employeeId, pauseEnd).subscribe({
        next: (res) => {
          // update data from backend
          this.getActiveAttendance();
          this.startTimerLoop();
          this.loadData();
          this.snackBar.open('Timer resumed.', 'Close', { duration: 2000 });
        },
        error: () => {
          this.snackBar.open('Failed to resume timer.', 'Close', { duration: 2000 });
          this.isPaused = true; // revert in case of failure
        }
      });
    } else {
      // PAUSE
      this.isPaused = true;
      this.pauseStart = Date.now();

      this.attendancesService.pauseTimer(employeeId, this.pauseStart.toString(), true).subscribe({
        next: (res) => {
          // update data from backend
          this.getActiveAttendance();
          clearInterval(this.timer); // stop UI timer
          this.loadData();
          this.snackBar.open('Timer paused.', 'Close', { duration: 2000 });

        },
        error: () => {
          this.snackBar.open('Failed to pause timer.', 'Close', { duration: 2000 });
          this.isPaused = false;
        }
      });
    }
  }
  formatMilliseconds(ms: number) {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  getActiveAttendance() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = currentUser.id;
    if (!employeeId) return;

    this.attendancesService.getActiveAttendance(employeeId).subscribe(res => {
      if (res.success && res.data.length > 0 && res.data[0].check_in) {
        const attendance = res.data[0];

        this.isTiming = true;
        this.startTime = new Date(attendance.check_in).getTime();

        // set break duration
        this.breakDuration = 0;
        if (attendance.break) {
          const [h, m, s] = attendance.break.split(':').map(Number);
          this.breakDuration = ((h * 3600) + (m * 60) + s) * 1000;
        }

        this.isPaused = !!attendance.is_paused;

        if (this.isPaused && attendance.pause_start) {
          this.pauseStart = new Date(attendance.pause_start).getTime();
        } else {
          this.pauseStart = 0;
          this.startTimerLoop(); // only run loop when active
        }
        // calculate elapsed time immediately
        let effectiveBreak = this.breakDuration;
        if (this.isPaused && this.pauseStart) {
          effectiveBreak += (Date.now() - this.pauseStart);
        }
        this.elapsedTime = Date.now() - this.startTime - effectiveBreak;
        this.updateTimerDisplay();
        this.cdr.detectChanges();
      }
    });
  }

  updateTimerDisplay() {
    const totalSeconds = Math.floor(this.elapsedTime / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    this.timerDisplay =
      `${hours.toString().padStart(2, '0')}:` +
      `${minutes.toString().padStart(2, '0')}:` +
      `${seconds.toString().padStart(2, '0')}`;
  }
  exportExcel() {
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeName = currentUser.fullName || 'Employee';
    const allData: Attendances[] = this.dataSource['data'].value;
    const exportData: Partial<TableElement>[] = allData.map((x) => ({

      'Employee Name': employeeName,
      'Date': new Date(x.date).toISOString().split('T')[0],
      'Check In': x.check_in ? new Date(x.check_in).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '',
      'Check Out': x.check_out ? new Date(x.check_out).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true }) : '',
      'Break Time': x.break || '00:00:00',
      'Total Hours': x.hours || '00:00:00',
      'Status': x.status || '',
    }));

    TableExportUtil.exportToExcel(exportData, 'Attendance_Report');
  }
}
export class ExampleDataSource extends DataSource<Attendances> {
  private data = new BehaviorSubject<Attendances[]>([]);
  private employeeId: number;

  filterChange = new BehaviorSubject('');
  get filter(): string {
    return this.filterChange.value;
  }
  set filter(filter: string) {
    this.filterChange.next(filter);
  }

  filteredData: Attendances[] = [];
  renderedData: Attendances[] = [];

  constructor(
    private attendancesService: AttendancesService,
    private paginator: MatPaginator,
    private sort: MatSort,
    employeeId: number
  ) {
    super();
    this.employeeId = employeeId;

    // Reset paginator on filter change
    this.filterChange.subscribe(() => this.paginator.pageIndex = 0);
  }
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) return '';

    // Format variations
    const readable1 = date.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    }); // "Aug 6, 2025"

    const readable2 = date.toLocaleDateString('en-GB'); // "06/08/2025"
    const readable3 = date.toISOString().split('T')[0]; // "2025-08-06"

    return `${readable1} ${readable2} ${readable3}`;
  }
  connect(): Observable<Attendances[]> {
    // Initially load data for employee
    this.attendancesService.getAllAttendancess(this.employeeId).subscribe(data => {
      this.data.next(data);
    });

    const displayDataChanges = [
      this.data,
      this.sort.sortChange,
      this.filterChange,
      this.paginator.page,
    ];

    return merge(...displayDataChanges).pipe(
      map(() => {
        // Get current data
        const data = this.data.value.slice();

        const formatTime = (dateStr: string) => {
          const date = new Date(dateStr);
          if (!dateStr || isNaN(date.getTime())) return '';
          return date.toLocaleTimeString('en-GB', { hour12: false }); // "HH:mm:ss"
        };
        const formatTime12Hour = (dateStr: string) => {
          const date = new Date(dateStr);
          if (!dateStr || isNaN(date.getTime())) return '';
          return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
          }); // "12:08:17 PM"
        };
        // Filter
        this.filteredData = data.filter(item => {
          const searchStr = (
            this.formatDate(item.date) +
            formatTime12Hour(item.check_in) +
            formatTime12Hour(item.check_out) +
            item.break +
            item.hours +
            item.status
          ).toLowerCase();
          return searchStr.indexOf(this.filter.toLowerCase()) !== -1;
        });

        // Sort
        const sortedData = this.sortData(this.filteredData);

        // Paginate
        const startIndex = this.paginator.pageIndex * this.paginator.pageSize;
        this.renderedData = sortedData.splice(startIndex, this.paginator.pageSize);
        return this.renderedData;
      })
    );
  }

  disconnect() {
    this.data.complete();
  }

  sortData(data: Attendances[]): Attendances[] {
    if (!this.sort.active || this.sort.direction === '') {
      return data;
    }
    return data.sort((a, b) => {
      let propertyA: number | string = '';
      let propertyB: number | string = '';

      switch (this.sort.active) {
        case 'id':
          [propertyA, propertyB] = [a.id, b.id];
          break;
        case 'date':
          [propertyA, propertyB] = [a.date, b.date];
          break;
        case 'check_in':
          [propertyA, propertyB] = [a.check_in, b.check_in];
          break;
        case 'break':
          [propertyA, propertyB] = [a.break, b.break];
          break;
        case 'check_out':
          [propertyA, propertyB] = [a.check_out, b.check_out];
          break;
      }

      const valueA = isNaN(+propertyA) ? propertyA : +propertyA;
      const valueB = isNaN(+propertyB) ? propertyB : +propertyB;

      return (valueA < valueB ? -1 : 1) * (this.sort.direction === 'asc' ? 1 : -1);
    });
  }

  refresh(employeeId: number) {
    this.employeeId = employeeId;
    this.attendancesService.getAllAttendancess(employeeId).subscribe(data => {
      this.data.next(data);
    });
  }
}