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
  Observable
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
  InterviewStatus
} from '../interview.model';

import {
  InterviewService
} from '../interview.service';


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

    'hr_name',

    'candidate_name',

    'candidate_number',

    'linkedin_link',

    'resume',

    'photo',

    'interview_date',

    'status',

    'actions'

  ];


  // =====================================================
  // DATA
  // =====================================================

  interviews: Interview[] = [];

  dataSource!: InterviewDataSource;


  loading = false;

  error = '';


  // =====================================================
  // USER PERMISSION
  // =====================================================

  isAdmin = false;

  isHR = false;

  canManage = false;


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


          this.interviews =
            Array.isArray(data)
              ? data
              : [];


          /*
           * Create datasource only after
           * paginator and sort exist.
           */

          if (
            this.paginator &&
            this.sort
          ) {

            this.dataSource =
              new InterviewDataSource(

                this.interviews,

                this.paginator,

                this.sort

              );

          }


          this.setupFilter();


          this.loading = false;

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
  // SETUP SEARCH FILTER
  // =====================================================

  private setupFilter(): void {

    if (!this.filter) {
      return;
    }


    /*
     * Prevent duplicate subscriptions
     * when loadInterviews() is called again.
     */

    if (
      this.dataSource
    ) {

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


          this.dataSource.filter =
            value;

        });

    }

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


    /*
     * Dialog will be added in the
     * next step.
     */

    console.log(
      'ADD INTERVIEW'
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


    console.log(
      'EDIT INTERVIEW:',
      interview
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
  // PHOTO URL
  // =====================================================

  getPhotoUrl(
    photo: string | null | undefined
  ): string {

    if (!photo) {

      return 'assets/images/default-profile.png';

    }


    if (
      photo.startsWith(
        'http://'
      ) ||
      photo.startsWith(
        'https://'
      )
    ) {

      return photo;

    }


    return `${window.location.origin}/${photo.replace(/^\/+/, '')}`;

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


    const displayDataChanges = [

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