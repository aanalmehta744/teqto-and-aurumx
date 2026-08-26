import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  CommonModule,
  DatePipe
} from '@angular/common';

import {
  MatTableModule
} from '@angular/material/table';

import {
  MatPaginator,
  MatPaginatorModule
} from '@angular/material/paginator';

import {
  MatSort,
  MatSortModule
} from '@angular/material/sort';

import {
  MatButtonModule
} from '@angular/material/button';

import {
  MatIconModule
} from '@angular/material/icon';

import {
  MatTooltipModule
} from '@angular/material/tooltip';

import {
  MatProgressSpinnerModule
} from '@angular/material/progress-spinner';

import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition
} from '@angular/material/snack-bar';

import {
  MatDialog,
  MatDialogModule
} from '@angular/material/dialog';

import {
  FormsModule
} from '@angular/forms';

import {
  BehaviorSubject,
  fromEvent,
  merge,
  Observable,
  of
} from 'rxjs';

import {
  map
} from 'rxjs/operators';

import {
  DataSource
} from '@angular/cdk/collections';

import {
  Direction
} from '@angular/cdk/bidi';

import {
  FeatherIconsComponent
} from '@shared/components/feather-icons/feather-icons.component';

import {
  BreadcrumbComponent
} from '@shared/components/breadcrumb/breadcrumb.component';

import {
  UnsubscribeOnDestroyAdapter
} from '@shared';

import {
  Interview,
  InterviewStatus,
  SeniorDeveloper
} from '../interview.model';

import {
  InterviewService
} from '../interview.service';

import {
  InterviewFormDialogComponent,
  InterviewFormDialogData,
  InterviewFormResult
} from './interview-form-dialog/interview-form-dialog.component';

import {
  AssignRoundDialogComponent,
  AssignRoundDialogData
} from './assign-round-dialog/assign-round-dialog.component';

import {
  NotesDialogComponent,
  NotesDialogData
} from './notes-dialog/notes-dialog.component';


@Component({
  selector: 'app-all-interviews',

  templateUrl:
    './all-interviews.component.html',

  styleUrls: [
    './all-interviews.component.scss'
  ],

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,

    MatTableModule,
    MatPaginatorModule,
    MatSortModule,

    MatButtonModule,
    MatIconModule,
    MatTooltipModule,

    MatProgressSpinnerModule,
    MatDialogModule,

    FeatherIconsComponent,
    BreadcrumbComponent,

    DatePipe
  ]
})
export class AllInterviewsComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit, AfterViewInit {


  // =====================================================
  // TABLE COLUMNS
  // =====================================================

  displayedColumns: string[] = [

    'srno',

    'hr_name',

    'created_at',

    'candidate_name',

    'profile',

    'candidate_number',

    'candidate_email',

    'linkedin_link',

    'resume',

    'hr_call_notes',

    'hr_call_status',

    'interview_date',

    'technical',

    'final_call_notes',

    'final_call_status',

    'joining',

    'actions'

  ];


  // Senior developers available to assign the second round to.
  seniorDevelopers: SeniorDeveloper[] = [];


  // =====================================================
  // DATA
  // =====================================================

  // Raw data from the API (unfiltered).
  allInterviews: Interview[] = [];

  // Filtered rows shown in the table.
  interviews: Interview[] = [];

  dataSource!: InterviewDataSource;


  // =====================================================
  // FILTERS
  // =====================================================

  filterHrName = '';
  filterProfile = '';
  filterOverall = '';
  filterHr = '';
  filterFinal = '';
  filterJoined = '';
  filterRound = '';

  // Distinct values present in the data (for dropdowns).
  profileOptions: string[] = [];
  hrNameOptions: string[] = [];


  loading = false;

  error = '';


  // =====================================================
  // USER PERMISSION
  // =====================================================

  isAdmin = false;

  isHR = false;

  canManage = false;

  // Logged-in user's name, used to prefill HR name on new interviews.
  currentUserName = '';


  // =====================================================
  // SEARCH
  // =====================================================

  @ViewChild('filter')
  filter!: ElementRef;


  // =====================================================
  // SORT / PAGINATION
  // =====================================================

  @ViewChild(MatPaginator)
  paginator!: MatPaginator;


  @ViewChild(MatSort)
  sort!: MatSort;


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    private interviewService:
      InterviewService,

    private snackBar:
      MatSnackBar,

    private dialog:
      MatDialog

  ) {

    super();

  }


  // =====================================================
  // NG ON INIT
  // =====================================================

  ngOnInit(): void {

    this.checkPermissions();

    this.loadSeniorDevelopers();

  }


  // =====================================================
  // LOAD SENIOR DEVELOPERS (for round assignment)
  // =====================================================

  private loadSeniorDevelopers(): void {

    if (!this.canManage) {
      return;
    }

    this.interviewService
      .getSeniorDevelopers()
      .subscribe({
        next: (devs) => {
          this.seniorDevelopers = devs || [];
        },
        error: () => {
          this.seniorDevelopers = [];
        }
      });

  }


  // =====================================================
  // AFTER VIEW INIT
  // =====================================================

  ngAfterViewInit(): void {

    this.loadInterviews();

  }


  // =====================================================
  // CHECK USER PERMISSIONS
  // =====================================================

  private checkPermissions(): void {

    const currentUser =
      JSON.parse(
        localStorage.getItem(
          'currentUser'
        ) || '{}'
      );


    const role =
      String(
        currentUser?.role || ''
      )
        .trim()
        .toLowerCase();


    const department =
      String(
        currentUser?.department || ''
      )
        .trim()
        .toLowerCase();


    /*
     * ADMIN
     *
     * Admin can only view.
     */

    this.isAdmin =
      role === 'admin';


    /*
     * HR
     *
     * In your portal HR is an Employee
     * whose department is HR.
     */

    this.isHR =
      role === 'employee' &&
      department === 'hr';


    /*
     * Only HR can manage interviews.
     */

    this.canManage =
      this.isHR;


    this.currentUserName =
      String(
        currentUser?.fullName ||
        currentUser?.name ||
        ''
      ).trim();


    console.log(
      '================ INTERVIEW PERMISSION ================'
    );


    console.log(
      'Role:',
      currentUser?.role
    );


    console.log(
      'Department:',
      currentUser?.department
    );


    console.log(
      'Is Admin:',
      this.isAdmin
    );


    console.log(
      'Is HR:',
      this.isHR
    );


    console.log(
      'Can Manage:',
      this.canManage
    );

  }


  // =====================================================
  // LOAD INTERVIEWS
  // =====================================================

  loadInterviews(): void {

    this.loading = true;

    this.error = '';


    this.interviewService
      .getAllInterviews()
      .subscribe({

        next: (
          data: Interview[]
        ) => {

          console.log(
            'INTERVIEW API DATA:',
            data
          );


          this.allInterviews =
            Array.isArray(data)
              ? data
              : [];


          // Build distinct values for the filter dropdowns.
          this.profileOptions =
            Array.from(
              new Set(
                this.allInterviews
                  .map(i => i.profile)
                  .filter((p): p is string => !!p)
              )
            ).sort();

          this.hrNameOptions =
            Array.from(
              new Set(
                this.allInterviews
                  .map(i => i.hr_name)
                  .filter((n): n is string => !!n)
              )
            ).sort();


          /*
           * Turn loading off FIRST so the table (which is behind
           * *ngIf="!loading") is rendered and its MatPaginator /
           * MatSort ViewChildren exist.
           */

          this.loading = false;


          this.applyFilters();

        },


        error: (error) => {

          console.error(
            'GET INTERVIEWS ERROR:',
            error
          );


          this.interviews = [];


          this.error =
            error?.error?.message ||
            'Unable to load interviews.';


          this.loading = false;


          this.showNotification(
            'Unable to load interviews.',
            'bottom',
            'center'
          );

        }

      });

  }


  // =====================================================
  // APPLY FILTERS
  // =====================================================

  applyFilters(): void {

    let data = [...this.allInterviews];

    const eq = (a: any, b: string) =>
      String(a || 'pending').toLowerCase() === b.toLowerCase();

    if (this.filterHrName) {
      data = data.filter(
        i => String(i.hr_name || '') === this.filterHrName
      );
    }

    if (this.filterProfile) {
      data = data.filter(
        i => String(i.profile || '') === this.filterProfile
      );
    }

    if (this.filterOverall) {
      data = data.filter(i => eq(i.status, this.filterOverall));
    }

    if (this.filterHr) {
      data = data.filter(i => eq(i.hr_call_status, this.filterHr));
    }

    if (this.filterFinal) {
      data = data.filter(i => eq(i.final_call_status, this.filterFinal));
    }

    if (this.filterJoined) {
      data = data.filter(i => eq(i.joined_status, this.filterJoined));
    }

    if (this.filterRound) {
      data = data.filter(
        i => (i.rounds || []).some(r => eq(r.status, this.filterRound))
      );
    }

    this.interviews = data;

    this.rebuildDataSource();

  }


  clearFilters(): void {
    this.filterHrName = '';
    this.filterProfile = '';
    this.filterOverall = '';
    this.filterHr = '';
    this.filterFinal = '';
    this.filterJoined = '';
    this.filterRound = '';
    this.applyFilters();
  }


  hasActiveFilters(): boolean {
    return !!(
      this.filterHrName ||
      this.filterProfile ||
      this.filterOverall ||
      this.filterHr ||
      this.filterFinal ||
      this.filterJoined ||
      this.filterRound
    );
  }


  private rebuildDataSource(): void {

    setTimeout(() => {

      if (this.paginator && this.sort) {

        this.dataSource =
          new InterviewDataSource(
            this.interviews,
            this.paginator,
            this.sort
          );

        this.setupFilter();

      }

    });

  }


  // =====================================================
  // SETUP SEARCH FILTER
  // =====================================================

  private searchWired = false;

  private setupFilter(): void {

    if (!this.filter || !this.dataSource) {
      return;
    }

    // Re-apply the current search term to the freshly built data source
    // (filters rebuild the data source, so keep search in sync).
    this.dataSource.filter =
      String(this.filter.nativeElement.value || '')
        .trim()
        .toLowerCase();

    // Wire the keyup listener only once to avoid stacking subscriptions.
    if (this.searchWired) {
      return;
    }
    this.searchWired = true;

    this.subs.sink =
      fromEvent(
        this.filter.nativeElement,
        'keyup'
      )
      .subscribe(() => {

        const value =
          this.filter.nativeElement.value
            .trim()
            .toLowerCase();

        if (this.dataSource) {
          this.dataSource.filter = value;
        }

      });

  }


  // =====================================================
  // REFRESH
  // =====================================================

  refresh(): void {

    this.loadInterviews();

  }


  // =====================================================
  // ADD INTERVIEW
  // =====================================================

  addInterview(): void {

    /*
     * Extra frontend protection.
     *
     * Backend is still the real
     * security layer.
     */

    if (!this.canManage) {

      this.showNotification(
        'Only HR can add interviews.',
        'bottom',
        'center'
      );

      return;

    }


    const dialogRef =
      this.dialog.open(
        InterviewFormDialogComponent,
        {
          width: '640px',
          maxWidth: '95vw',
          data: {
            mode: 'add',
            interview: null,
            hrName: this.currentUserName
          } as InterviewFormDialogData
        }
      );


    this.subs.sink =
      dialogRef
        .afterClosed()
        .subscribe(
          (result: InterviewFormResult | undefined) => {

            if (!result) {
              return;
            }

            this.interviewService
              .createInterview(result)
              .subscribe({

                next: () => {

                  this.showNotification(
                    'Interview added successfully.',
                    'bottom',
                    'center'
                  );

                  this.loadInterviews();

                },

                error: (error) => {

                  console.error(
                    'ADD INTERVIEW ERROR:',
                    error
                  );

                  this.showNotification(
                    error?.error?.message ||
                    'Unable to add interview.',
                    'bottom',
                    'center'
                  );

                }

              });

          }
        );

  }


  // =====================================================
  // EDIT INTERVIEW
  // =====================================================

  editInterview(
    interview: Interview
  ): void {

    if (!this.canManage) {

      this.showNotification(
        'Only HR can update interviews.',
        'bottom',
        'center'
      );

      return;

    }


    if (!interview.id) {
      return;
    }


    const dialogRef =
      this.dialog.open(
        InterviewFormDialogComponent,
        {
          width: '640px',
          maxWidth: '95vw',
          data: {
            mode: 'edit',
            interview: interview,
            hrName: this.currentUserName
          } as InterviewFormDialogData
        }
      );


    this.subs.sink =
      dialogRef
        .afterClosed()
        .subscribe(
          (result: InterviewFormResult | undefined) => {

            if (!result) {
              return;
            }

            this.interviewService
              .updateInterview(
                interview.id!,
                result
              )
              .subscribe({

                next: () => {

                  this.showNotification(
                    'Interview updated successfully.',
                    'bottom',
                    'center'
                  );

                  this.loadInterviews();

                },

                error: (error) => {

                  console.error(
                    'UPDATE INTERVIEW ERROR:',
                    error
                  );

                  this.showNotification(
                    error?.error?.message ||
                    'Unable to update interview.',
                    'bottom',
                    'center'
                  );

                }

              });

          }
        );

  }


  // =====================================================
  // DELETE INTERVIEW
  // =====================================================

  deleteInterview(
    interview: Interview
  ): void {

    if (!this.canManage) {

      this.showNotification(
        'Only HR can delete interviews.',
        'bottom',
        'center'
      );

      return;

    }


    if (!interview.id) {

      return;

    }


    const confirmed =
      window.confirm(
        `Are you sure you want to delete the interview for ${interview.candidate_name}?`
      );


    if (!confirmed) {

      return;

    }


    this.interviewService
      .deleteInterview(
        interview.id
      )
      .subscribe({

        next: () => {

          this.showNotification(
            'Interview deleted successfully.',
            'bottom',
            'center'
          );


          this.loadInterviews();

        },


        error: (error) => {

          console.error(
            'DELETE INTERVIEW ERROR:',
            error
          );


          this.showNotification(
            error?.error?.message ||
            'Unable to delete interview.',
            'bottom',
            'center'
          );

        }

      });

  }


  // =====================================================
  // STATUS CLASS
  // =====================================================

  getStatusClass(
    status: InterviewStatus | string
  ): string {

    const value =
      String(status || '')
        .trim()
        .toLowerCase();


    if (
      value === 'complete'
    ) {

      return 'status-complete';

    }


    return 'status-upcoming';

  }


  // =====================================================
  // STATUS LABEL
  // =====================================================

  getStatusLabel(
    status: InterviewStatus | string
  ): string {

    const value =
      String(status || '')
        .trim()
        .toLowerCase();


    if (
      value === 'complete'
    ) {

      return 'Complete';

    }


    return 'Upcoming';

  }


  // =====================================================
  // LINKEDIN
  // =====================================================

  openLinkedIn(
    link: string | null | undefined
  ): void {

    if (!link) {
      return;
    }


    let url =
      String(link).trim();


    if (
      !url.startsWith(
        'http://'
      ) &&
      !url.startsWith(
        'https://'
      )
    ) {

      url =
        'https://' + url;

    }


    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );

  }


  // =====================================================
  // RESUME
  // =====================================================

  openResume(
    resume: string | null | undefined
  ): void {

    if (!resume) {
      return;
    }


    let url =
      String(resume).trim();


    if (
      !url.startsWith(
        'http://'
      ) &&
      !url.startsWith(
        'https://'
      )
    ) {

      /*
       * If backend returns a relative
       * upload path, use current origin.
       */

      url =
        `${window.location.origin}/${url.replace(/^\/+/, '')}`;

    }


    window.open(
      url,
      '_blank',
      'noopener,noreferrer'
    );

  }


  // =====================================================
  // ASSIGN ROUNDS (HR)
  // =====================================================

  openAssignRounds(
    interview: Interview
  ): void {

    if (!this.canManage || !interview.id) {
      return;
    }

    const dialogRef = this.dialog.open(
      AssignRoundDialogComponent,
      {
        width: '640px',
        maxWidth: '95vw',
        data: {
          interviewId: interview.id,
          candidateName: interview.candidate_name,
          rounds: interview.rounds || [],
          seniorDevelopers: this.seniorDevelopers
        } as AssignRoundDialogData
      }
    );

    this.subs.sink = dialogRef
      .afterClosed()
      .subscribe((changed: boolean) => {
        if (changed) {
          this.loadInterviews();
        }
      });

  }


  // =====================================================
  // VIEW A NOTE (popup)
  // =====================================================

  openNote(
    title: string,
    text: string | null | undefined
  ): void {

    if (!text) {
      return;
    }

    this.dialog.open(
      NotesDialogComponent,
      {
        width: '520px',
        maxWidth: '95vw',
        data: { title, text } as NotesDialogData
      }
    );

  }


  // =====================================================
  // LABEL / CLASS HELPERS
  // =====================================================

  getHrCallLabel(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'done': return 'Done';
      case 'no_response': return 'No Response';
      default: return 'Pending';
    }
  }

  getHrCallClass(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'done': return 'badge-green';
      case 'no_response': return 'badge-red';
      default: return 'badge-gray';
    }
  }

  getFinalLabel(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'select': return 'Select';
      case 'hold': return 'Hold';
      case 'reject': return 'Reject';
      default: return 'Pending';
    }
  }

  getFinalClass(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'select': return 'badge-green';
      case 'hold': return 'badge-amber';
      case 'reject': return 'badge-red';
      default: return 'badge-gray';
    }
  }

  getJoinedLabel(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'joined': return 'Joined';
      case 'not_joined': return 'Not Joined';
      default: return 'Pending';
    }
  }

  getJoinedClass(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'joined': return 'badge-green';
      case 'not_joined': return 'badge-red';
      default: return 'badge-gray';
    }
  }

  getRoundClass(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'cleared': return 'badge-green';
      case 'rejected': return 'badge-red';
      case 'hold': return 'badge-amber';
      case 'scheduled': return 'badge-blue';
      default: return 'badge-gray';
    }
  }

  roundTypeLabel(type: string | null | undefined): string {
    switch (String(type || '').toLowerCase()) {
      case 'hr': return 'HR Round';
      case 'technical': return 'Second Round';
      case 'ceo': return 'CEO Round';
      default: return type || '';
    }
  }


  // =====================================================
  // SNACKBAR
  // =====================================================

  showNotification(
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

        duration: 3000,

        verticalPosition:
          placementFrom,

        horizontalPosition:
          placementAlign

      }

    );

  }


  // =====================================================
  // DESTROY
  // =====================================================

  override ngOnDestroy(): void {

    super.ngOnDestroy();

  }

}


/*
 * =========================================================
 * INTERVIEW DATA SOURCE
 * =========================================================
 */

export class InterviewDataSource
  extends DataSource<Interview> {


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
    value: string
  ) {

    this
      .filterChange
      .next(
        value
      );

  }


  // =====================================================
  // DATA
  // =====================================================

  filteredData:
    Interview[] = [];


  renderedData:
    Interview[] = [];


  // =====================================================
  // CONSTRUCTOR
  // =====================================================

  constructor(

    private data:
      Interview[],

    private paginator:
      MatPaginator,

    private sort:
      MatSort

  ) {

    super();


    this.filterChange
      .subscribe(() => {

        if (this.paginator) {

          this.paginator.pageIndex =
            0;

        }

      });

  }


  // =====================================================
  // CONNECT
  // =====================================================

  connect():
    Observable<Interview[]> {


    const displayDataChanges: Observable<any>[] = [

      // Emit once immediately so the table renders on first load,
      // before the user sorts / filters / changes pages.
      of(null),

      this.sort.sortChange,

      this.filterChange,

      this.paginator.page

    ];


    return merge(
      ...displayDataChanges
    )
    .pipe(

      map(() => {

        /*
         * FILTER
         */

        const filterValue =
          this.filter
            .trim()
            .toLowerCase();


        this.filteredData =
          this.data
            .slice()
            .filter(
              (
                interview: Interview
              ) => {

                const searchText = [

                  interview.hr_name,

                  interview.candidate_name,

                  interview.candidate_number,

                  interview.linkedin_link,

                  interview.interview_date,

                  interview.status

                ]
                  .filter(
                    value =>
                      value !== null &&
                      value !== undefined
                  )
                  .join(' ')
                  .toLowerCase();


                return searchText
                  .includes(
                    filterValue
                  );

              }
            );


        /*
         * SORT
         */

        const sortedData =
          this.sortData(
            this.filteredData
              .slice()
          );


        /*
         * PAGINATION
         */

        // Keep the paginator's total in sync with the filtered rows,
        // otherwise it shows "0 of 0" and hides all data.
        this.paginator.length =
          this.filteredData.length;

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


        return this.renderedData;

      })

    );

  }


  // =====================================================
  // SORT
  // =====================================================

  sortData(
    data: Interview[]
  ): Interview[] {

    if (
      !this.sort.active ||
      this.sort.direction === ''
    ) {

      return data;

    }


    return data.sort(
      (
        a: Interview,
        b: Interview
      ) => {

        let propertyA:
          string | number = '';

        let propertyB:
          string | number = '';


        switch (
          this.sort.active
        ) {

          case 'hr_name':

            propertyA =
              a.hr_name || '';

            propertyB =
              b.hr_name || '';

            break;


          case 'candidate_name':

            propertyA =
              a.candidate_name || '';

            propertyB =
              b.candidate_name || '';

            break;


          case 'candidate_number':

            propertyA =
              a.candidate_number || '';

            propertyB =
              b.candidate_number || '';

            break;


          case 'interview_date':

            propertyA =
              a.interview_date || '';

            propertyB =
              b.interview_date || '';

            break;


          case 'status':

            propertyA =
              a.status || '';

            propertyB =
              b.status || '';

            break;


          default:

            propertyA =
              a.id || 0;

            propertyB =
              b.id || 0;

            break;

        }


        const valueA =
          typeof propertyA === 'number'
            ? propertyA
            : String(propertyA)
                .toLowerCase();


        const valueB =
          typeof propertyB === 'number'
            ? propertyB
            : String(propertyB)
                .toLowerCase();


        const comparison =
          valueA < valueB
            ? -1
            : valueA > valueB
              ? 1
              : 0;


        return (
          this.sort.direction === 'asc'
            ? comparison
            : -comparison
        );

      }
    );

  }


  // =====================================================
  // DISCONNECT
  // =====================================================

  disconnect(): void {

  }

}