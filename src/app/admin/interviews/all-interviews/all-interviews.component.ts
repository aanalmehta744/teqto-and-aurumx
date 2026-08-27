import {
  AfterViewInit,
  Component,
  ElementRef,
  OnInit,
  ViewChild
} from '@angular/core';

import {
  CommonModule,
  DatePipe,
  formatDate
} from '@angular/common';

import * as XLSX from 'xlsx';

import {
  TableExportUtil,
  TableElement
} from '@shared';

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
  from,
  fromEvent,
  merge,
  Observable,
  of
} from 'rxjs';

import {
  catchError,
  concatMap,
  map,
  toArray
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


  // Senior developers available to assign the Final round to.
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

  // Managed HR call options (for the filter dropdown).
  hrCallStatusOptions: string[] = [];


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


  // Hidden <input type="file"> used for Excel import (HR only).
  @ViewChild('importInput')
  importInput!: ElementRef<HTMLInputElement>;


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

    this.interviewService.getHrCallOptions().subscribe({
      next: (list) => {
        this.hrCallStatusOptions = (list || []).map(s => s.name).filter(n => !!n);
      },
      error: () => { this.hrCallStatusOptions = []; }
    });

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

    // HR and HR Coordinator both manage interviews.
    this.isHR =
      role === 'employee' &&
      (department === 'hr' || department === 'hr coordinator');


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
  // EXPORT TO EXCEL (HR only)
  // =====================================================

  exportExcel(): void {

    if (!this.canManage) {
      this.showNotification(
        'Only HR can export interviews.',
        'bottom',
        'center'
      );
      return;
    }

    // Export what the user is currently looking at (filtered + searched),
    // falling back to the filtered list.
    const rows =
      (this.dataSource?.filteredData?.length
        ? this.dataSource.filteredData
        : this.interviews) || [];

    if (!rows.length) {
      this.showNotification(
        'There are no interviews to export.',
        'bottom',
        'center'
      );
      return;
    }

    // Headers are kept identical to the HR sheet so an exported file can be
    // edited and re-imported without renaming columns.
    const exportData: Partial<TableElement>[] = rows.map((i, index) => ({
      'Sr. No.': index + 1,
      'HR Name': i.hr_name || '',
      'Date(M/D/Y)': i.created_at
        ? formatDate(i.created_at, 'M/d/yyyy', 'en')
        : '',
      'Candidate Name': i.candidate_name || '',
      'Position Applied': i.profile || '',
      'Contact No.': i.candidate_number || '',
      'Email ID': i.candidate_email || '',
      'Linkdin ID': i.linkedin_link || '',
      'CV Link': i.resume || '',
      'HR call Details': i.hr_call_details || '',
      'HR Call status': this.getHrCallLabel(i.hr_call_status),
      'Interview Date': i.interview_date
        ? formatDate(i.interview_date, 'M/d/yyyy', 'en')
        : '',
      'Final Round': (i.rounds || [])
        .map(r => `${r.assigned_to_name || 'Unassigned'} (${r.status})`)
        .join('; '),
      'Final Call note': i.final_call_notes || '',
      'Final Call Status': this.getFinalLabel(i.final_call_status),
      'Joining Status': this.getJoinedLabel(i.joined_status),
      'Final Note': i.joining_note || ''
    }));

    TableExportUtil.exportToExcel(exportData, 'interviews');

  }


  // =====================================================
  // IMPORT FROM EXCEL (HR only)
  // =====================================================

  triggerImport(): void {

    if (!this.canManage) {
      this.showNotification(
        'Only HR can import interviews.',
        'bottom',
        'center'
      );
      return;
    }

    this.importInput?.nativeElement.click();

  }


  onImportFileChange(event: Event): void {

    const input = event.target as HTMLInputElement;

    if (!this.canManage) {
      input.value = '';
      return;
    }

    const file = input.files?.[0];

    if (!file) {
      return;
    }

    const reader = new FileReader();

    reader.onload = (e) => {
      try {

        const data =
          new Uint8Array(e.target?.result as ArrayBuffer);

        const workbook =
          XLSX.read(data, { type: 'array', cellDates: true });

        const sheet =
          workbook.Sheets[workbook.SheetNames[0]];

        const rows =
          XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

        this.importRows(rows);

      } catch (err) {

        console.error('IMPORT PARSE ERROR:', err);

        this.showNotification(
          'Could not read the file. Please upload a valid Excel/CSV file.',
          'bottom',
          'center'
        );

      }
    };

    reader.readAsArrayBuffer(file);

    // Reset so the same file can be selected again.
    input.value = '';

  }


  private importRows(rows: any[]): void {

    if (!rows || !rows.length) {
      this.showNotification(
        'The file has no rows to import.',
        'bottom',
        'center'
      );
      return;
    }

    // The backend requires a candidate name, contact number and interview
    // date; rows missing name/number can't be created, so skip + report them.
    const payloads = rows
      .map(r => this.mapRowToInterview(r))
      .filter(p => !!p.candidate_name && !!p.candidate_number);

    const skipped = rows.length - payloads.length;

    if (!payloads.length) {
      this.showNotification(
        'No valid rows found (each row needs a Candidate Name and Contact No.).',
        'bottom',
        'center'
      );
      return;
    }

    // Skip candidates that already exist (so re-importing the same sheet does
    // not create duplicates). Match on the contact number reduced to digits,
    // both against existing interviews and other rows in this same file.
    const digits = (v: any) => String(v || '').replace(/\D/g, '');

    const existingKeys = new Set(
      this.allInterviews
        .map(i => digits(i.candidate_number))
        .filter(k => !!k)
    );

    const seen = new Set<string>();
    const duplicates: string[] = [];

    const toCreate = payloads.filter((p) => {
      const key = digits(p.candidate_number);
      if (key && (existingKeys.has(key) || seen.has(key))) {
        duplicates.push(String(p.candidate_name));
        return false;
      }
      if (key) {
        seen.add(key);
      }
      return true;
    });

    if (duplicates.length) {
      console.warn(
        'INTERVIEW IMPORT — duplicates skipped (already exist):',
        duplicates
      );
    }

    if (!toCreate.length) {
      this.showNotification(
        `Nothing to import — all ${duplicates.length} row(s) already exist.`,
        'bottom',
        'center'
      );
      return;
    }

    this.loading = true;

    // Send the rows ONE AT A TIME. Firing all requests at once overwhelms the
    // tunnel/backend and silently drops some; sequential is slower but reliable
    // and lets us capture a per-row result.
    this.subs.sink =
      from(toCreate)
        .pipe(
          concatMap((p) =>
            this.interviewService.createInterview(p).pipe(
              map(() => ({
                ok: true,
                name: String(p.candidate_name),
                error: ''
              })),
              catchError((err) => of({
                ok: false,
                name: String(p.candidate_name),
                error:
                  err?.error?.message ||
                  err?.message ||
                  `HTTP ${err?.status || '?'}`
              }))
            )
          ),
          toArray()
        )
        .subscribe({

          next: (results) => {

            const success = results.filter(r => r.ok).length;
            const failed = results.filter(r => !r.ok);

            // Surface the exact failures so the cause is visible, not guessed.
            if (failed.length) {
              console.warn(
                'INTERVIEW IMPORT — failed rows:',
                failed.map(f => `${f.name}: ${f.error}`)
              );
            }

            const parts = [
              `Imported ${success} of ${toCreate.length}`
            ];
            if (failed.length) {
              parts.push(`${failed.length} failed (see console)`);
            }
            if (duplicates.length) {
              parts.push(`${duplicates.length} duplicate(s) skipped`);
            }
            if (skipped) {
              parts.push(`${skipped} skipped (missing name/number)`);
            }

            this.showNotification(
              parts.join(', ') + '.',
              'bottom',
              'center'
            );

            this.loadInterviews();

          },

          error: () => {

            this.loading = false;

            this.showNotification(
              'Unable to import interviews.',
              'bottom',
              'center'
            );

          }

        });

  }


  // Map one spreadsheet row to an interview payload. Header names are
  // matched case-insensitively so exported files can be re-imported.
  private mapRowToInterview(row: any): Partial<Interview> {

    const pick = (...keys: string[]): string => {
      for (const key of Object.keys(row || {})) {
        const norm = key.trim().toLowerCase();
        if (keys.some(k => k.toLowerCase() === norm)) {
          const value = row[key];
          return value === null || value === undefined
            ? ''
            : String(value).trim();
        }
      }
      return '';
    };

    const today = () => formatDate(new Date(), 'yyyy-MM-dd', 'en');

    const toDate = (value: string): string => {
      const raw = String(value || '').trim();
      if (!raw) {
        return today();
      }
      // DD-MM-YYYY or DD/MM/YYYY (e.g. 01-07-2026) — JS Date misreads these,
      // so parse explicitly.
      const m = raw.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
      if (m) {
        const day = +m[1], month = +m[2], year = +m[3];
        if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const d = new Date(year, month - 1, day);
          if (!isNaN(d.getTime())) {
            return formatDate(d, 'yyyy-MM-dd', 'en');
          }
        }
      }
      const d = new Date(raw);
      // Never return an unparseable string — MySQL would reject the whole row.
      return isNaN(d.getTime()) ? today() : formatDate(d, 'yyyy-MM-dd', 'en');
    };

    // Normalise human-readable status labels back to the internal codes the
    // app uses, so an exported (labelled) sheet re-imports correctly.
    const normFinal = (v: string): string => {
      const s = v.toLowerCase();
      if (s.includes('select')) return 'select';
      if (s.includes('hold')) return 'hold';
      if (s.includes('reject')) return 'reject';
      return 'pending';
    };

    const normJoined = (v: string): string => {
      const s = v.toLowerCase();
      if (s.includes('not')) return 'not_joined';
      if (s.includes('joined')) return 'joined';
      return 'pending';
    };

    const normHrCall = (v: string): string => {
      const s = v.toLowerCase();
      if (!s || s === 'pending') return 'pending';
      if (s === 'done') return 'done';
      if (s.includes('no response') || s === 'no_response') return 'no_response';
      // Otherwise keep the custom option exactly as typed.
      return v;
    };

    return {
      hr_name:
        pick('HR Name', 'hr_name') || this.currentUserName,
      candidate_name:
        pick('Candidate Name', 'candidate_name', 'Candidate'),
      candidate_number:
        pick('Contact No.', 'Contact No', 'Contact Number', 'Candidate Number',
          'candidate_number', 'Number', 'Mobile', 'Contact', 'Phone'),
      candidate_email:
        pick('Email ID', 'Candidate Email', 'candidate_email', 'Email') || null,
      profile:
        pick('Position Applied', 'Position', 'Profile', 'profile') || null,
      linkedin_link:
        pick('Linkdin ID', 'LinkedIn ID', 'Linkedin', 'LinkedIn',
          'linkedin_link', 'LinkedIn Link') || null,
      resume:
        pick('CV Link', 'CV', 'Resume', 'resume', 'Resume Link') || null,
      interview_date:
        toDate(
          pick('Interview Date', 'interview_date') ||
          pick('Date(M/D/Y)', 'Date', 'date')
        ),
      hr_call_status:
        normHrCall(pick('HR Call status', 'HR Call Status', 'hr_call_status')),
      hr_call_details:
        pick('HR call Details', 'HR Call Details', 'HR Call Notes', 'hr_call_details') || null,
      final_call_status:
        normFinal(pick('Final Call Status', 'final_call_status')),
      final_call_notes:
        pick('Final Call note', 'Final Call Note', 'Final Call Notes', 'final_call_notes') || null,
      joined_status:
        normJoined(pick('Joining Status', 'joined_status', 'Joining')),
      joining_note:
        pick('Final Note', 'Joining Note', 'joining_note') || null,
      status:
        (pick('Status', 'status').toLowerCase() === 'complete'
          ? 'complete'
          : 'upcoming') as InterviewStatus
    };

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
    const raw = String(status || '').trim();
    if (!raw) return 'Pending';
    // Map legacy lowercase keys; otherwise show the custom option as-is.
    switch (raw.toLowerCase()) {
      case 'pending': return 'Pending';
      case 'done': return 'Done';
      case 'no_response': return 'No Response';
      default: return raw;
    }
  }

  getHrCallClass(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'done': return 'badge-green';
      case 'no_response': return 'badge-red';
      case 'pending':
      case '': return 'badge-gray';
      default: return 'badge-blue';
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
      case 'technical': return 'Final round';
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