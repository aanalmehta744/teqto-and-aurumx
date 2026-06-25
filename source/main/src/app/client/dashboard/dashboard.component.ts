import { Component, OnInit, ViewChild, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { AttendancesService } from '../attendance/attendance.service';
import { ClientsService } from '../clients/all-clients/clients.service';
import { MyLeaves } from '../my-leaves/my-leaves.model';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { AfterViewInit } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { EmployeesService } from 'app/admin/employees/allEmployees/employees.service';
import { Subject, takeUntil } from 'rxjs';
@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    RouterLink,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    CommonModule
  ],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();
  dataSource = new MatTableDataSource<any>([]);
  clientsDataSource = new MatTableDataSource<any>([]);
  todayFollowupsDataSource = new MatTableDataSource<any>([]);
  displayedColumns: string[] = ['date', 'check_in', 'check_out', 'hours','break' ,'status'];
  clientsDisplayedColumns: string[] = [
    'fullName',
    'email',
    'mobile',
    'client_type',
    'client_Connect_Type',
    'country',
    'technology'
  ];
  todayFollowupsDisplayedColumns: string[] = [
    'clientName',
    'email',
    'status',
    'next_date',
    'notes'
  ]
  @ViewChild('clientsPaginator') clientsPaginator!: MatPaginator;
  @ViewChild('attendancePaginator') attendancePaginator!: MatPaginator;

  // Variables to store data
  attendanceRecords: any[] = [];
  allClients: any[] = [];
  userData: any;
  userId: number | null = null;
  leaveBalance = 0;
  monthlyTarget: number = 0; // or whatever structure your API returns
  attendanceStatus = 'Absent';
  checkInTime = '--';
  todayFollowupsCount: number = 0;
  liveTimer = '00:00:00';

  // Timer related properties
  isTiming = false;
  isPaused = false;
  activeAttendance: any = null;
  private timerInterval: any;
  // Fixed timer calculation properties
  startTime = 0;      // check_in timestamp in ms
  pauseStart = 0;     // when pause started in ms
  totalElapsedTime = 0; // total time worked before current session
  breakDuration = 0;  // total break time in ms
  isCheckedOut = false; // flag to check if already checked out

  private checkoutPollingInterval: any;

  constructor(
    private attendanceService: AttendancesService,
    private clientsService: ClientsService,
    private employeesService: EmployeesService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
  ) { }

  ngOnInit() {
    this.loadUserFromLocalStorage();
    if (this.userId) {
      this.loadAttendance();
      this.loadMonthlyTarget();
      this.loadTodayFollowups();

    } else {
      console.warn('User ID not found in localStorage');
    }
    this.loadClients();
  }
  // IMPORTANT: Add cleanup on component destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
    this.stopCheckoutPolling();
  }
  ngAfterViewInit(): void {
    this.clientsDataSource.paginator = this.clientsPaginator;
    this.dataSource.paginator = this.attendancePaginator;
  }
  // ✅ Load user data from localStorage
  loadUserFromLocalStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.userData = JSON.parse(userJson);
      this.userId = this.userData?.id || null;
      console.log('Logged-in User ID:', this.userId);
      this.leaveBalance = this.userData.leave_balance;
    }
  }

  // FIXED: Main attendance loading logic
  loadAttendance(): void {
    if (!this.userData?.id) return;

    this.attendanceService.getAllAttendancess(this.userData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any[]) => {
        this.attendanceRecords = res;
        this.dataSource.data = res;
        // this.updateUserAttendancePagination();

        const todayStr = this.formatLocalDate(new Date());
        const todayRecord = res.find(r => this.formatLocalDate(new Date(r.date)) === todayStr);

        console.log("Today Attendance record", todayRecord);

        if (todayRecord) {
          this.processAttendanceRecord(todayRecord);
        } else {
          this.resetTimerState();
        }
      });
  }

  // FIXED: Process attendance record with proper timer logic
  private processAttendanceRecord(record: any): void {
    const {
      status,
      check_in,
      break: breakTime,
      is_paused,
      pause_start,
      elapsed_time,
      check_out,
      hours
    } = record;
    this.activeAttendance = record;
    // Stop any existing timer first
    this.stopTimer();

    // Set basic attendance info
    this.attendanceStatus = status || 'Absent';
    this.checkInTime = check_in ? new Date(check_in).toLocaleTimeString() : '--';
    this.isCheckedOut = !!check_out;

    console.log('Processing attendance record:', {
      status,
      check_out,
      hours,
      isCheckedOut: this.isCheckedOut,
      is_paused
    });

    // If not present, show absent state
    if (status !== 'Present') {
      this.liveTimer = '00:00:00';
      this.isPaused = false;
      this.isTiming = false;
      this.cdr.detectChanges();
      return;
    }
    if (!this.isCheckedOut && status === 'Present') {
      this.stopCheckoutPolling();
      this.startCheckoutPolling();
    }
    // If already checked out, show final hours and stop timer
    if (check_out) {
      this.stopTimer();
      this.stopCheckoutPolling();
      this.isCheckedOut = true;
      this.attendanceStatus = 'Checked Out';
      this.liveTimer = hours || '00:00:00';
      this.isPaused = false;
      this.isTiming = false;
      this.activeAttendance = record; // ✅ keep for later
      console.log('CHECKED OUT (final lock) - Timer frozen at:', this.liveTimer);
      this.cdr.detectChanges();
      return; // ✅ don’t continue
    }


    // Still working - initialize timer properties
    this.startTime = new Date(check_in).getTime();
    this.breakDuration = this.parseTimeToMs(breakTime || '00:00:00');
    this.totalElapsedTime = elapsed_time || 0;
    this.isPaused = !!is_paused; // Ensure boolean conversion
    this.isTiming = true;

    console.log('Timer State:', {
      startTime: new Date(this.startTime),
      breakDuration: this.breakDuration,
      totalElapsedTime: this.totalElapsedTime,
      isPaused: this.isPaused,
      isCheckedOut: this.isCheckedOut
    });

    if (this.isPaused && pause_start) {
      // Timer is paused - calculate elapsed time up to pause point
      this.pauseStart = new Date(pause_start).getTime();
      const elapsedUntilPause = this.pauseStart - this.startTime - this.breakDuration + this.totalElapsedTime;
      this.liveTimer = this.formatMilliseconds(Math.max(0, elapsedUntilPause));

      console.log('Timer PAUSED at:', this.liveTimer);
      // Don't start interval when paused - THIS IS KEY
    } else {
      // Timer is running - start the live timer
      console.log('Timer RUNNING - starting interval');
      this.startTimerInterval();
    }
  }

  public handlePauseStateChange(isPaused: boolean): void {
    console.log('Pause state changed to:', isPaused);
    this.isPaused = isPaused;

    if (this.isPaused) {
      // When paused, stop the timer interval
      this.stopTimer();
      console.log('Timer paused - interval stopped');
      this.cdr.detectChanges();
    } else if (this.isTiming && !this.isCheckedOut) {
      // When resumed, start the timer interval again
      this.startTimerInterval();
      console.log('Timer resumed - interval started');
    }
  }
  // FIXED: Start timer interval with proper pause handling
  private startTimerInterval(): void {
    this.stopTimer(); // Clear any existing interval

    this.timerInterval = setInterval(() => {
      this.ngZone.run(() => {
        // IMPORTANT: Stop timer if checked out
        if (this.isCheckedOut) {
          console.log('Detected checkout during timer - stopping');
          this.stopTimer();
          return;
        }

        // CRITICAL FIX: Check if paused and stop interval immediately
        if (this.isPaused) {
          console.log('Timer paused - stopping interval');
          this.stopTimer(); // Stop the interval when paused
          return;
        }

        const now = Date.now();
        const currentSessionTime = now - this.startTime - this.breakDuration;
        const totalTime = this.totalElapsedTime + currentSessionTime;

        this.liveTimer = this.formatMilliseconds(Math.max(0, totalTime));
      });
    }, 1000);
  }

  // FIXED: Reset timer state
  private resetTimerState(): void {
    this.stopTimer();
    this.liveTimer = '00:00:00';
    this.attendanceStatus = 'Absent';
    this.checkInTime = '--';
    this.isPaused = false;
    this.isTiming = false;
    this.isCheckedOut = false;
    this.startTime = 0;
    this.pauseStart = 0;
    this.totalElapsedTime = 0;
    this.breakDuration = 0;
  }

  // FIXED: Stop timer properly
  private stopTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  private startCheckoutPolling(): void {
    // Only start polling if user is present and timer is running
    if (this.attendanceStatus !== 'Present' || !this.isTiming) {
      return;
    }

    this.checkoutPollingInterval = setInterval(() => {
      // Only check if currently timing and not checked out
      if (this.isTiming && !this.isCheckedOut && this.userData?.id) {
        this.checkForCheckout();
      }
    }, 30000); // Check every 30 seconds
  }
  // Check if user has been checked out
  private checkForCheckout(): void {
    this.attendanceService.getAllAttendancess(this.userData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any[]) => {
        const todayStr = this.formatLocalDate(new Date());
        const todayRecord = res.find(r => this.formatLocalDate(new Date(r.date)) === todayStr);

        if (todayRecord) {
          // Check for checkout
          if (todayRecord.check_out && !this.isCheckedOut) {
            console.log('Detected checkout from polling - stopping timer');
            this.handleCheckout();
            this.liveTimer = todayRecord.hours || this.liveTimer;
            this.stopCheckoutPolling();
            return;
          }

          // Check for pause state changes
          const newPauseState = !!todayRecord.is_paused;
          if (newPauseState !== this.isPaused) {
            console.log('Detected pause state change from polling:', newPauseState);
            this.handlePauseStateChange(newPauseState);

            // Update timer display if paused
            if (newPauseState && todayRecord.pause_start) {
              const pauseTime = new Date(todayRecord.pause_start).getTime();
              const elapsedUntilPause = pauseTime - this.startTime - this.breakDuration + this.totalElapsedTime;
              this.liveTimer = this.formatMilliseconds(Math.max(0, elapsedUntilPause));
              console.log('Updated paused timer to:', this.liveTimer);
              this.cdr.detectChanges();
            }
          }
        }
      });
  }
  // Stop checkout polling
  private stopCheckoutPolling(): void {
    if (this.checkoutPollingInterval) {
      clearInterval(this.checkoutPollingInterval);
      this.checkoutPollingInterval = null;
    }
  }
  public handleCheckout(): void {
    console.log('Handling checkout...');
    this.stopTimer();
    this.stopCheckoutPolling();
    this.isCheckedOut = true;
    this.isTiming = false;
    this.attendanceStatus = 'Checked Out';
    this.liveTimer = this.activeAttendance?.hours || this.liveTimer; // ✅ now always set
    this.cdr.detectChanges();
    this.refreshAttendanceData();
  }
  // Method to refresh attendance data (call this after checkout)
  public refreshAttendanceData(): void {
    console.log('Refreshing attendance data...');
    this.loadAttendance();
  }
  // FIXED: Format milliseconds to HH:MM:SS
  formatMilliseconds(ms: number): string {
    const totalSeconds = Math.floor(Math.abs(ms) / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  // Parse time string to milliseconds
  parseTimeToMs(timeStr: string): number {
    if (!timeStr || timeStr === '00:00:00') return 0;
    const [h, m, s] = timeStr.split(':').map(Number);
    return ((h * 3600) + (m * 60) + s) * 1000;
  }


  // ✅ Load clients
  loadClients(): void {
    this.clientsService.getAllClients().subscribe({
      next: (data) => {
        // Filter clients where employee_id matches the logged-in user ID
        this.allClients = data.filter((client: any) => client.employee_id === this.userId);

        // Set filtered data to the data source
        this.clientsDataSource.data = this.allClients;

        console.log('Filtered Clients:', this.allClients);
      },
      error: (err) => {
        console.error('Error fetching clients:', err);
      }
    });
  }

  formatLocalDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
  loadMonthlyTarget(): void {
    if (this.userId) {
      this.employeesService.getMonthlyTargets(this.userId).subscribe({
        next: (data: any[]) => {
          const now = new Date();
          const currentYear = now.getFullYear();
          const currentMonth = now.getMonth(); // 0-based month

          const targetForCurrentMonth = data.find(target => {
            if (!target.target_month) return false;
            const targetDate = new Date(target.target_month);
            return targetDate.getFullYear() === currentYear && targetDate.getMonth() === currentMonth;
          });

          this.monthlyTarget = targetForCurrentMonth ? targetForCurrentMonth.amount : 0;

          console.log(`Monthly Target for ${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}:`, this.monthlyTarget);
        },
        error: (err) => {
          console.error('Error fetching monthly target:', err);
        }
      });
    }
  }

  loadTodayFollowups(): void {
    if (!this.userId) return;

    this.clientsService.getClientFollowups(String(this.userId)).subscribe({

      next: (data: any[]) => {
        console.log(data);
        const today = this.formatLocalDate(new Date());

        // Filter followups where followup_date matches today
        const todayFollowups = data.filter(followup => {
          const followupDate = this.formatLocalDate(new Date(followup.followup_date));
          return followupDate === today;
        });

        this.todayFollowupsCount = todayFollowups.length;
        console.log('Today Follow-ups:', todayFollowups);
        this.todayFollowupsDataSource.data = todayFollowups; // ✅ set table data
      },
      error: (err) => {
        console.error('Error fetching followups:', err);
      }
    });
  }
  private startTimerFromCheckIn(checkInTime: string, breakDuration: string | number = 0): void {
    const checkIn = new Date(checkInTime).getTime();
    let breakMs = 0;

    if (typeof breakDuration === 'string') {
      const parts = breakDuration.split(':').map(Number);
      breakMs = ((parts[0] * 60 + parts[1]) * 60 + parts[2]) * 1000;
    } else {
      breakMs = breakDuration * 1000;
    }

    setInterval(() => {
      const now = new Date().getTime();
      const diff = now - checkIn - breakMs;
      this.liveTimer = this.formatTime(diff);
    }, 1000);
  }
  private formatTime(ms: number): string {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }


}
