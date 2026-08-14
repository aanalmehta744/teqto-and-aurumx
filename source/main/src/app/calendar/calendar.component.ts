import { Component, ViewChild, OnInit } from '@angular/core';
import {
  CalendarOptions,
  DateSelectArg,
  EventClickArg,
  EventApi,
} from '@fullcalendar/core';
import { EventInput } from '@fullcalendar/core';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import {
  UntypedFormBuilder,
  UntypedFormGroup,
  Validators,
} from '@angular/forms';
import { Calendar } from './calendar.model';
import { FormDialogComponent } from './dialogs/form-dialog/form-dialog.component';
import { CalendarService } from './calendar.service';
import {
  MatSnackBar,
  MatSnackBarHorizontalPosition,
  MatSnackBarVerticalPosition,
} from '@angular/material/snack-bar';
import { INITIAL_EVENTS } from './events-util';
import {
  MatCheckboxChange,
  MatCheckboxModule,
} from '@angular/material/checkbox';
import { UnsubscribeOnDestroyAdapter } from '@shared/UnsubscribeOnDestroyAdapter';
import { Direction } from '@angular/cdk/bidi';
import { FullCalendarModule } from '@fullcalendar/angular';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import {
  OwlDateTimeModule,
  OwlNativeDateTimeModule,
} from '@danielmoncada/angular-datetime-picker';
import { HolidayService } from 'app/admin/holidays/all-holidays/all-holidays.service';
// import { InterviewService } from 'app/employee/jobs/interview-schedule/interview.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
@Component({
  selector: 'app-calendar',
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatCheckboxModule,
    FullCalendarModule,
    OwlDateTimeModule,
    OwlNativeDateTimeModule,
    MatDialogModule,
  ],
})
export class CalendarComponent
  extends UnsubscribeOnDestroyAdapter
  implements OnInit {
  @ViewChild('calendar', { static: false }) calendar: any;

  public addCusForm: UntypedFormGroup;
  dialogTitle: string;
  filterOptions = 'All';
  calendarData!: Calendar;

  filterItems: string[] = [
    'work',
    'personal',
    'important',
    'travel',
    'friends',
  ];

  calendarEvents: EventInput[] = [];
  tempEvents: EventInput[] = [];

  public filters: Array<{ name: string; value: string; checked: boolean }> = [
    { name: 'work', value: 'Work', checked: true },
    { name: 'personal', value: 'Personal', checked: true },
    { name: 'important', value: 'Important', checked: true },
    { name: 'travel', value: 'Travel', checked: true },
    { name: 'friends', value: 'Friends', checked: true },
  ];

  constructor(
    private fb: UntypedFormBuilder,
    private dialog: MatDialog,
    public calendarService: CalendarService,
    private snackBar: MatSnackBar,
    private holidayService: HolidayService,
    // private interviewService: InterviewService,
  ) {
    super();
    this.dialogTitle = 'Add New Event';
    this.calendarData = new Calendar({} as Calendar);
    this.addCusForm = this.createCalendarForm(this.calendarData);
  }

  ngOnInit(): void {
    // this.calendarEvents = INITIAL_EVENTS;
    // this.tempEvents = this.calendarEvents;
    // this.calendarOptions.initialEvents = this.calendarEvents;
    this.loadEvents();
  }
  loadEvents(): void {
    const loggedUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const employeeId = loggedUser.id;
    const role = loggedUser.role;

    const calendarEvents$ = this.calendarService.getAllCalendars().pipe(catchError(() => of([])));
    const holidays$ = this.holidayService.getAllHolidays().pipe(catchError(() => of([])));
    // const interviews$ = role === 'Admin'
      // ? this.interviewService.getInterviews().pipe(catchError(() => of([])))
      // : of([]);

    this.subs.sink = forkJoin([calendarEvents$, holidays$]).subscribe(
      ([calData, holidays]: [any[], any[]]) => {

        // User's own calendar events
        const userEvents = calData.filter((e: any) => e.employee_id === employeeId);
        const mappedUserEvents: EventInput[] = userEvents.map((event: any) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start_date),
          end: event.end_date ? new Date(event.end_date) : undefined,
          className: this.getClassNameValue(event.category),
          groupId: event.category,
          details: event.details,
        }));

        // Holiday events
        const holidayEvents: EventInput[] = holidays.map((holiday: any) => ({
          id: `holiday-${holiday.id}`,
          title: holiday.hName,
          start: holiday.date,
          allDay: true,
          className: 'fc-event-holiday',
          groupId: 'holiday',
          details: holiday.details,
        }));

        // Interview events (Admin only)
        // const interviewEvents: EventInput[] = interviews.map((interview: any) => {
        //   let start: Date = new Date(interview.interview_date);
        //   let end: Date | undefined = undefined;
        //   if (interview.interview_time) {
        //     const m = interview.interview_time.match(/(\d+):(\d+)\s?(AM|PM)/i);
        //     if (m) {
        //       let h = parseInt(m[1], 10);
        //       const min = parseInt(m[2], 10);
        //       if (m[3].toUpperCase() === 'PM' && h < 12) h += 12;
        //       if (m[3].toUpperCase() === 'AM' && h === 12) h = 0;
        //       start = new Date(interview.interview_date);
        //       start.setHours(h, min, 0, 0);
        //       end = new Date(start.getTime() + 60 * 60 * 1000);
        //     }
        //   }
        //   return {
        //     id: `interview-${interview.id}`,
        //     title: `Interview: ${interview.candidate_name} (${interview.job_name})`,
        //     start, end,
        //     className: 'fc-event-interview',
        //     groupId: 'interview',
        //     details: `Type: ${interview.interview_type}<br>Mode: ${interview.mode}<br>Status: ${interview.status}`,
        //   };
        // });

        const allEvents = [...mappedUserEvents, ...holidayEvents];
        this.calendarEvents = allEvents;
        this.tempEvents = allEvents;
        this.calendarOptions.events = allEvents;
      }
    );
  }



  calendarOptions: CalendarOptions = {
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
    },
    initialView: 'dayGridMonth',
    weekends: true,
    editable: true,
    selectable: true,
    selectMirror: true,
    dayMaxEvents: true,
    select: this.handleDateSelect.bind(this),
    eventClick: this.handleEventClick.bind(this),
    eventsSet: this.handleEvents.bind(this),
  };

  // ---------- Event selection ----------
  handleDateSelect(selectInfo: DateSelectArg) {
    this.addNewEvent();
  }

  addNewEvent() {
    const tempDirection: Direction =
      localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        calendar: new Calendar({} as Calendar),
        action: 'add',
      },
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 'submit') {
        this.calendarData = this.calendarService.getDialogData();

        this.calendarEvents = this.calendarEvents.concat({
          id: this.calendarData.id,
          title: this.calendarData.title,
          start: this.calendarData.startDate,
          end: this.calendarData.endDate,
          className: this.getClassNameValue(this.calendarData.category),
          groupId: this.calendarData.category,
          details: this.calendarData.details,
        });

        this.calendarOptions.events = this.calendarEvents;
        this.addCusForm.reset();
        this.showNotification(
          'snackbar-success',
          'Add Record Successfully...!!!',
          'bottom',
          'center'
        );
        this.loadEvents();
      }
    });
  }

  // ---------- Category Filtering ----------
  changeCategory(event: MatCheckboxChange, filter: { name: string }) {
    if (event.checked) {
      this.filterItems.push(filter.name);
    } else {
      this.filterItems = this.filterItems.filter((f) => f !== filter.name);
    }
    this.filterEvent(this.filterItems);
  }

  filterEvent(element: string[]) {
    const list = this.calendarEvents.filter((x) =>
      element.includes(x.groupId as string) ||
      x.groupId === 'holiday' ||
      x.groupId === 'interview'
    );
    this.calendarOptions.events = list;
  }

  // ---------- Event Click ----------
  handleEventClick(clickInfo: EventClickArg) {
    this.eventClick(clickInfo);
  }

  eventClick(row: EventClickArg) {
    function safeDate(d: Date | null | undefined): Date {
      return d ? new Date(d) : new Date();
    }

    // 👉 If it's an interview event, only show details (no edit/delete)
    if (row.event.groupId === 'interview') {

      return; // stop further handling
    }

    // 👉 Normal event (editable)
    const calendarData = {
      id: row.event.id,
      title: row.event.title,
      category: row.event.groupId as string,
      startDate: safeDate(row.event.start),
      endDate: safeDate(row.event.end ?? row.event.start),
      details: row.event.extendedProps['details'],
    };

    const tempDirection: Direction =
      localStorage.getItem('isRtl') === 'true' ? 'rtl' : 'ltr';

    const dialogRef = this.dialog.open(FormDialogComponent, {
      data: {
        calendar: calendarData,
        action: 'edit',
      },
      direction: tempDirection,
    });

    this.subs.sink = dialogRef.afterClosed().subscribe((result) => {
      if (result === 'submit') {
        this.calendarData = this.calendarService.getDialogData();
        this.calendarEvents.forEach((element, index) => {
          if (this.calendarData.id === element.id) {
            this.editEvent(index, this.calendarData);
          }
        });
        this.showNotification('black', 'Edit Record Successfully...!!!', 'bottom', 'center');
        this.loadEvents();
        this.addCusForm.reset();
      } else if (result === 'delete') {
        this.loadEvents();
        this.calendarData = this.calendarService.getDialogData();
        this.calendarEvents = this.calendarEvents.filter(
          (e) => e.id !== this.calendarData.id
        );
        this.calendarOptions.events = this.calendarEvents;

        this.showNotification(
          'snackbar-danger',
          'Delete Record Successfully...!!!',
          'bottom',
          'center'
        );
        this.loadEvents();
      }
    });
  }
  // ---------- Update Event ----------
  editEvent(eventIndex: number, calendarData: Calendar) {
    const calendarEvents = [...this.calendarEvents];
    const singleEvent: EventInput = {
      id: calendarData.id,
      title: calendarData.title,
      start: calendarData.startDate,
      end: calendarData.endDate,
      className: this.getClassNameValue(calendarData.category),
      groupId: calendarData.category,
      details: calendarData.details,
    };
    calendarEvents[eventIndex] = singleEvent;
    this.calendarEvents = calendarEvents;
    this.calendarOptions.events = calendarEvents;
  }

  // ---------- Hooks ----------
  handleEvents(events: EventApi[]) {
    // optional: track current events
  }

  createCalendarForm(calendar: Calendar): UntypedFormGroup {
    return this.fb.group({
      id: [calendar.id],
      title: [
        calendar.title,
        [Validators.required, Validators.pattern('[a-zA-Z]+([a-zA-Z ]+)*')],
      ],
      category: [calendar.category],
      startDate: [calendar.startDate, [Validators.required]],
      endDate: [calendar.endDate, [Validators.required]],
      details: [
        calendar.details,
        [Validators.required, Validators.pattern('[a-zA-Z]+([a-zA-Z ]+)*')],
      ],
    });
  }

  // ---------- Utils ----------
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

  getClassNameValue(category: string) {
    if (category === 'work') return 'fc-event-success';
    if (category === 'personal') return 'fc-event-warning';
    if (category === 'important') return 'fc-event-primary';
    if (category === 'travel') return 'fc-event-danger';
    if (category === 'friends') return 'fc-event-info';
    return '';
  }
}
