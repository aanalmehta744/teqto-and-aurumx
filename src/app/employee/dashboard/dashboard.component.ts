// FIXED: Dashboard Component Timer Logic
import { Component, OnInit, ViewChild, AfterViewInit, NgZone, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { MyLeavesService } from '../my-leaves/my-leaves.service';
import { MyProjectsService } from '../my-projects/my-projects.service';
import { AttendancesService } from '../attendance/attendance.service';
import { MyTasksService } from '../my-tasks/my-tasks.service';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
// import { JobsListService } from '../jobs/jobs-list/jobs-list.service';
// import { CandidatesService } from '../jobs/candidates/candidates.service';
import { TodayService } from '../attendance/today/today.service';
import { InterviewService } from 'app/admin/interviews/interview.service';
import { AssignedRound } from 'app/admin/interviews/interview.model';
import { LeavesService } from 'app/admin/leaves/leave-requests/leaves.service';
import { AllTasksService } from '../all-tasks/all-tasks.service';
import { Subject, takeUntil } from 'rxjs';
import { AnnouncementBannerComponent } from '@shared/components/announcement-banner/announcement-banner.component';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    NgScrollbar,
    MatTableModule,
    MatPaginatorModule,
    MatIconModule,
    MatCheckboxModule,
    MatTooltipModule,
    NgClass,
    CommonModule,
    AnnouncementBannerComponent,
  ],
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  // Add OnDestroy for cleanup
  private destroy$ = new Subject<void>();

  dataSource = new MatTableDataSource<any>([]);
  taskDataSource = new MatTableDataSource<any>([]);
  todayAttendanceDataSource = new MatTableDataSource<any>([]);
  interviewDataSource = new MatTableDataSource<any>([]);
  todayTaskDataSource = new MatTableDataSource<any>([]);
  paginatedUserAttendance: any[] = [];
  paginatedHrAttendance: any[] = [];
  paginatedInterviews: any[] = [];

  @ViewChild('taskPaginator') taskPaginator!: MatPaginator;
  @ViewChild('userAttendancePaginator') userAttendancePaginator!: MatPaginator;
  @ViewChild('hrAttendancePaginator') hrAttendancePaginator!: MatPaginator;
  @ViewChild('interviewPaginator') interviewPaginator!: MatPaginator;
  @ViewChild('todayTaskPaginator') todayTaskPaginator!: MatPaginator;

  userData: any;
  isHR: boolean = false;

  // Senior developer: sees interviews assigned to them to conduct.
  isSeniorDev: boolean = false;
  assignedRounds: AssignedRound[] = [];
  leaveBalance = 0;
  checkInTime = '--';
  attendanceStatus = 'Absent';
  activeProjects = 0;
  pendingTasks = 0;
  dueTodayTasks: any[] = [];
  attendanceRecords: any[] = [];
  todayAttendanceRecords: any[] = [];
  todayLeaves: any[] = [];
  todayTasks: any[] = [];
  activeJobs = 0;
  totalCandidates = 0;

  // Timer related properties
  isTiming = false;
  isPaused = false;
  liveTimer = '00:00:00';
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
    private myProjectsService: MyProjectsService,
    private attendanceService: AttendancesService,
    private myTasksService: MyTasksService,
    // private jobsService: JobsListService,
    // private candidatesService: CandidatesService,
    public todayService: TodayService,
    public interviewService: InterviewService,
    public leavesService: LeavesService,
    public allTasksService: AllTasksService,
    private ngZone: NgZone,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
    // Subscribe to timer from attendance service with cleanup
    this.attendanceService.timer$
      .pipe(takeUntil(this.destroy$))
      .subscribe(timerValue => {
        // Only update if not managing our own timer
        if (!this.timerInterval) {
          this.liveTimer = timerValue;
        }
      });

    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.userData = JSON.parse(userJson);
      this.leaveBalance = this.userData.leave_balance;
      this.isHR = this.userData.department === 'HR';
      this.isSeniorDev =
        String(this.userData.employee_level || '').trim().toLowerCase() === 'senior';
    }
    this.loadUserDataFromLocalStorage();
    this.loadProjects();
    this.loadAttendance();
    this.loadTasks();

    if (this.isHR) {
      this.loadHrWidgets();
      this.loadInterviews();
      this.fetchTodayLeaves();
      this.fetchTodayTasks();
    }

    if (this.isSeniorDev) {
      this.loadAssignedRounds();
    }
  }


  roundLabel(type: string | null | undefined): string {
    switch (String(type || '').toLowerCase()) {
      case 'hr': return 'HR Round';
      case 'technical': return 'Second Round';
      case 'ceo': return 'CEO Round';
      default: return type || '';
    }
  }

  // Interviews this senior developer has been assigned to conduct.
  loadAssignedRounds(): void {
    this.interviewService.getAssignedRounds()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (rounds) => { this.assignedRounds = rounds || []; },
        error: () => { this.assignedRounds = []; }
      });
  }
isBreakGreaterThanOneHour(
  breakTime: string | null | undefined
): boolean {
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
  ngAfterViewInit(): void {
    if (this.userAttendancePaginator) {
      this.dataSource.paginator = this.userAttendancePaginator;
    }

    if (this.hrAttendancePaginator) {
      this.todayAttendanceDataSource.paginator = this.hrAttendancePaginator;
    }

    if (this.interviewPaginator) {
      this.interviewDataSource.paginator = this.interviewPaginator;
    }

    if (this.taskPaginator) {
      this.taskDataSource.paginator = this.taskPaginator;
    }

    if (this.todayTaskPaginator) {
      this.todayTaskDataSource.paginator = this.todayTaskPaginator;
    }

    if (this.userAttendancePaginator) {
      this.userAttendancePaginator.page
        .pipe(takeUntil(this.destroy$))
        .subscribe(() => {
          this.updateUserAttendancePagination();
        });
    }
  }

  // IMPORTANT: Add cleanup on component destroy
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopTimer();
    this.stopCheckoutPolling();
  }

  updateUserAttendancePagination(): void {
    if (!this.userAttendancePaginator) return;

    const startIndex = this.userAttendancePaginator.pageIndex * this.userAttendancePaginator.pageSize;
    const endIndex = startIndex + this.userAttendancePaginator.pageSize;
    this.paginatedUserAttendance = this.attendanceRecords.slice(startIndex, endIndex);
  }

  updateHrAttendancePagination(): void {
    const pageIndex = this.hrAttendancePaginator?.pageIndex || 0;
    const pageSize = this.hrAttendancePaginator?.pageSize || 5;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    this.paginatedHrAttendance = this.todayAttendanceDataSource.data.slice(start, end);
  }

  loadUserDataFromLocalStorage(): void {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      this.userData = JSON.parse(userJson);
      this.leaveBalance = this.userData.leave_balance;
      this.isHR = this.userData.department === 'HR';
    }
  }

  loadProjects(): void {
    this.myProjectsService.getAllMyProjectss()
      .pipe(takeUntil(this.destroy$))
      .subscribe((projects) => {
        this.activeProjects = projects.length;
      });
  }

  fetchTodayLeaves() {
    this.leavesService.getTodayLeaves()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any[]) => {
          const today = new Date();
          const todayStr = today.toISOString().split('T')[0];

          this.todayLeaves = res.filter(leave => {
            return leave.start_date <= todayStr && leave.end_date >= todayStr;
          });

          console.log("Today's leave employees", this.todayLeaves);
        },
        error: (err: any) => {
          console.error('Error fetching leaves', err);
        }
      });
  }

  fetchTodayTasks() {
    this.allTasksService.getAllMyTaskss()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any[]) => {
          const today = new Date();
          const todayStr = today.getFullYear() + '-' +
            String(today.getMonth() + 1).padStart(2, '0') + '-' +
            String(today.getDate()).padStart(2, '0');

          this.todayTasks = res
            .filter(task => {
              const dueDate = new Date(task.due_date);
              const dueStr = dueDate.getFullYear() + '-' +
                String(dueDate.getMonth() + 1).padStart(2, '0') + '-' +
                String(dueDate.getDate()).padStart(2, '0');
              return dueStr === todayStr;
            })
            .map(task => ({ ...task, expanded: false }));
        },
        error: (err: any) => {
          console.error('Error fetching tasks', err);
        }
      });
  }

  formatLocalDate(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  // FIXED: Main attendance loading logic
  loadAttendance(): void {
    if (!this.userData?.id) return;

    this.attendanceService.getAllAttendancess(this.userData.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any[]) => {
        this.attendanceRecords = res;
        this.dataSource.data = res;
        this.updateUserAttendancePagination();

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
  // private processAttendanceRecord(record: any): void {
  //   const {
  //     status,
  //     check_in,
  //     break: breakTime,
  //     is_paused,
  //     pause_start,
  //     elapsed_time,
  //     check_out,
  //     hours
  //   } = record;
  //   this.activeAttendance = record;
  //   // Stop any existing timer first
  //   this.stopTimer();

  //   // Set basic attendance info
  //   this.attendanceStatus = status || 'Absent';
  //   this.checkInTime = check_in ? new Date(check_in).toLocaleTimeString() : '--';
  //   this.isCheckedOut = !!check_out;

  //   console.log('Processing attendance record:', {
  //     status,
  //     check_out,
  //     hours,
  //     isCheckedOut: this.isCheckedOut,
  //     is_paused
  //   });

  //   // If not present, show absent state
  //   if (status !== 'Present') {
  //     this.liveTimer = '00:00:00';
  //     this.isPaused = false;
  //     this.isTiming = false;
  //     this.cdr.detectChanges();
  //     return;
  //   }
  //   if (!this.isCheckedOut && status === 'Present') {
  //     this.stopCheckoutPolling();
  //     this.startCheckoutPolling();
  //   }
  //   // If already checked out, show final hours and stop timer
  //   if (check_out) {
  //     this.stopTimer();
  //     this.stopCheckoutPolling();
  //     this.isCheckedOut = true;
  //     this.attendanceStatus = 'Checked Out';
  //     this.liveTimer = hours || '00:00:00';
  //     this.isPaused = false;
  //     this.isTiming = false;
  //     this.activeAttendance = record; // ✅ keep for later
  //     console.log('CHECKED OUT (final lock) - Timer frozen at:', this.liveTimer);
  //     this.cdr.detectChanges();
  //     return; // ✅ don’t continue
  //   }


  //   // Still working - initialize timer properties
  //   this.startTime = new Date(check_in).getTime();
  //   this.breakDuration = this.parseTimeToMs(breakTime || '00:00:00');
  //   this.totalElapsedTime = elapsed_time || 0;
  //   this.isPaused = !!is_paused; // Ensure boolean conversion
  //   this.isTiming = true;

  //   console.log('Timer State:', {
  //     startTime: new Date(this.startTime),
  //     breakDuration: this.breakDuration,
  //     totalElapsedTime: this.totalElapsedTime,
  //     isPaused: this.isPaused,
  //     isCheckedOut: this.isCheckedOut
  //   });

  //   if (this.isPaused && pause_start) {
  //     // Timer is paused - calculate elapsed time up to pause point
  //     this.pauseStart = new Date(pause_start).getTime();
  //     const elapsedUntilPause = this.pauseStart - this.startTime - this.breakDuration + this.totalElapsedTime;
  //     this.liveTimer = this.formatMilliseconds(Math.max(0, elapsedUntilPause));

  //     console.log('Timer PAUSED at:', this.liveTimer);
  //     // Don't start interval when paused - THIS IS KEY
  //   } else {
  //     // Timer is running - start the live timer
  //     console.log('Timer RUNNING - starting interval');
  //     this.startTimerInterval();
  //   }
  // }
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

  // Stop previous timer before processing the new record
  this.stopTimer();

  this.attendanceStatus = status || 'Absent';
  this.checkInTime = check_in
    ? new Date(check_in).toLocaleTimeString()
    : '--';

  this.isCheckedOut = !!check_out;

  console.log('Processing attendance record:', {
    status,
    check_in,
    check_out,
    hours,
    breakTime,
    elapsed_time,
    is_paused
  });

  // =========================================================
  // NO CHECK-IN = NO WORKED TIME
  // =========================================================
  if (!check_in) {
    this.liveTimer = '00:00:00';
    this.isPaused = false;
    this.isTiming = false;
    this.isCheckedOut = false;
    this.cdr.detectChanges();
    return;
  }

  // =========================================================
  // ALREADY CHECKED OUT
  // Show final worked hours from database
  // =========================================================
  if (check_out) {
    this.stopTimer();
    this.stopCheckoutPolling();

    this.isCheckedOut = true;
    this.attendanceStatus = 'Checked Out';
    this.liveTimer = hours || '00:00:00';
    this.isPaused = false;
    this.isTiming = false;

    console.log(
      'CHECKED OUT - Final worked time:',
      this.liveTimer
    );

    this.cdr.detectChanges();
    return;
  }

  // =========================================================
  // USER HAS CHECKED IN
  // This works for BOTH Present and Half Day
  // =========================================================
  this.startTime = new Date(check_in).getTime();

  this.breakDuration = this.parseTimeToMs(
    breakTime || '00:00:00'
  );

  // this.totalElapsedTime =
  //   typeof elapsed_time === 'number'
  //     ? elapsed_time
  //     : this.parseTimeToMs(elapsed_time || '00:00:00');

  this.totalElapsedTime = 0;
  
  this.isPaused = !!is_paused;
  this.isTiming = true;
  this.isCheckedOut = false;

  console.log('Timer State:', {
    startTime: new Date(this.startTime),
    breakDuration: this.breakDuration,
    totalElapsedTime: this.totalElapsedTime,
    isPaused: this.isPaused,
    status: this.attendanceStatus
  });

  // =========================================================
  // CURRENTLY ON BREAK
  // =========================================================
  if (this.isPaused && pause_start) {
    this.pauseStart = new Date(pause_start).getTime();

    const elapsedUntilPause =
      this.pauseStart -
      this.startTime -
      this.breakDuration +
      this.totalElapsedTime;

    this.liveTimer = this.formatMilliseconds(
      Math.max(0, elapsedUntilPause)
    );

    console.log(
      'Timer PAUSED at:',
      this.liveTimer
    );

    this.cdr.detectChanges();
    return;
  }

  // =========================================================
  // CURRENTLY WORKING
  // Works for Present AND Half Day
  // =========================================================
  this.startTimerInterval();

  this.startCheckoutPolling();

  this.cdr.detectChanges();
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
  // private startTimerInterval(): void {
  //   this.stopTimer(); // Clear any existing interval

  //   this.timerInterval = setInterval(() => {
  //     this.ngZone.run(() => {
  //       // IMPORTANT: Stop timer if checked out
  //       if (this.isCheckedOut) {
  //         console.log('Detected checkout during timer - stopping');
  //         this.stopTimer();
  //         return;
  //       }

  //       // CRITICAL FIX: Check if paused and stop interval immediately
  //       if (this.isPaused) {
  //         console.log('Timer paused - stopping interval');
  //         this.stopTimer(); // Stop the interval when paused
  //         return;
  //       }

  //       const now = Date.now();
  //       const currentSessionTime = now - this.startTime - this.breakDuration;
  //       const totalTime = this.totalElapsedTime + currentSessionTime;

  //       this.liveTimer = this.formatMilliseconds(Math.max(0, totalTime));
  //     });
  //   }, 1000);
  // }
private startTimerInterval(): void {
  this.stopTimer();

  if (!this.startTime || this.isCheckedOut || this.isPaused) {
    console.log('Timer NOT started:', {
      startTime: this.startTime,
      isCheckedOut: this.isCheckedOut,
      isPaused: this.isPaused
    });
    return;
  }

  const updateTimer = () => {
    this.ngZone.run(() => {
      if (this.isCheckedOut) {
        this.stopTimer();
        return;
      }

      if (this.isPaused) {
        this.stopTimer();
        return;
      }

      const now = Date.now();

      const workedMs =
        now -
        this.startTime -
        this.breakDuration;

      this.liveTimer = this.formatMilliseconds(
        Math.max(0, workedMs)
      );

      console.log('LIVE TIMER:', this.liveTimer);

      this.cdr.detectChanges();
    });
  };

  // Calculate immediately
  updateTimer();

  // Then update every second
  this.timerInterval = setInterval(updateTimer, 1000);

  console.log('TIMER INTERVAL STARTED');
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

  // private startCheckoutPolling(): void {
  //   // Only start polling if user is present and timer is running
  //   if (this.attendanceStatus !== 'Present' || !this.isTiming) {
  //     return;
  //   }

  //   this.checkoutPollingInterval = setInterval(() => {
  //     // Only check if currently timing and not checked out
  //     if (this.isTiming && !this.isCheckedOut && this.userData?.id) {
  //       this.checkForCheckout();
  //     }
  //   }, 30000); // Check every 30 seconds
  // }
  // Check if user has been checked out
  
  
  
  private startCheckoutPolling(): void {
  if (!this.isTiming || this.isCheckedOut) {
    return;
  }

  this.stopCheckoutPolling();

  this.checkoutPollingInterval = setInterval(() => {
    if (
      this.isTiming &&
      !this.isCheckedOut &&
      this.userData?.id
    ) {
      this.checkForCheckout();
    }
  }, 30000);
}
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

  loadTasks(): void {
    this.myTasksService.getAllMyTaskss()
      .pipe(takeUntil(this.destroy$))
      .subscribe((tasks) => {
        const today = new Date().toDateString();
        console.log("Task list", tasks);

        this.dueTodayTasks = tasks
          .filter(t => new Date(t.due_date).toDateString() === today)
          .map(t => ({ ...t, expanded: false }));

        this.pendingTasks = this.dueTodayTasks.length;
        this.taskDataSource.data = this.dueTodayTasks;
      });
  }

  loadHrWidgets(): void {
    // this.jobsService.getAllJobsLists()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((jobs) => {
    //     this.activeJobs = jobs.filter(job => job.status === 'Open').length;
    //   });

    // this.candidatesService.getAllCandidates()
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe((candidates) => {
    //     this.totalCandidates = candidates.length;
    //   });

    this.todayService.getTodayAttendacves()
      .pipe(takeUntil(this.destroy$))
      // .subscribe((res: any[]) => {
      //   this.todayAttendanceRecords = res;
      //   this.todayAttendanceDataSource.data = res;
      //   this.updateHrAttendancePagination();
      // });
      .subscribe((res: any[]) => {

  console.log('HR TODAY ATTENDANCE FULL RESPONSE:', res);

  res.forEach(row => {
    console.log(
      'Employee:',
      row.fullName,
      'Break:',
      row.break,
      'Pause Start:',
      row.pause_start
    );
  });

  this.todayAttendanceRecords = res;
  this.todayAttendanceDataSource.data = res;
  this.updateHrAttendancePagination();
});
  }

  loadInterviews(): void {
    if (!this.isHR) {
      return;
    }

    this.interviewService.getAllInterviews()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (interviews: any[]) => {
          const upcoming = (interviews || [])
            .filter(i => String(i.status || '').toLowerCase() === 'upcoming')
            .sort(
              (a, b) =>
                new Date(a.interview_date).getTime() -
                new Date(b.interview_date).getTime()
            );

          this.interviewDataSource.data = upcoming;
          this.updateInterviewPagination();
        },
        error: (err) => console.error('Error fetching interviews:', err),
      });
  }

  updateInterviewPagination(): void {
    if (!this.interviewPaginator) return;
    const pageIndex = this.interviewPaginator.pageIndex || 0;
    const pageSize = this.interviewPaginator.pageSize || 5;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    this.paginatedInterviews = this.interviewDataSource.data.slice(start, end);
  }

  toggleExpand(task: any): void {
    task.expanded = !task.expanded;
  }

  getPreview(text: string, limit: number = 80): string {
    const plain = text?.replace(/<[^>]+>/g, '') || '';
    return plain.length > limit ? plain.substring(0, limit) + '...' : plain;
  }

}