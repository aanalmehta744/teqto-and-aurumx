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
import { InterviewService } from 'app/employee/jobs/interview-schedule/interview.service';
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
    private interviewService: InterviewService,
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
    const role = loggedUser.role; // ensure you store role in localStorage at login

    this.subs.sink = this.calendarService.getAllCalendars().subscribe({
      next: (data: Calendar[]) => {
        // Filter only the events for the logged-in user
        const userEvents = data.filter(event => event.employee_id === employeeId);

        const mappedUserEvents: EventInput[] = userEvents.map((event) => ({
          id: event.id,
          title: event.title,
          start: new Date(event.start_date),
          end: event.end_date ? new Date(event.end_date) : undefined,
          className: this.getClassNameValue(event.category),
          groupId: event.category,
          details: event.details,
        }));

        // Now fetch holidays
        this.subs.sink = this.holidayService.getAllHolidays().subscribe({
          next: (holidays) => {
            const holidayEvents: EventInput[] = holidays.map((holiday: any) => ({
              id: `holiday-${holiday.id}`,
              title: holiday.hName,
              start: new Date(holiday.date),
              allDay: true,
              className: 'fc-event-holiday',
              groupId: 'holiday',
              details: holiday.details,
            }));

            // Initialize merged events
            let mergedEvents = [...mappedUserEvents, ...holidayEvents];

            // 👉 Only Admins see interview events
            if (role === 'Admin') {
              this.subs.sink = this.interviewService.getInterviews().subscribe({
                next: (interviews) => {
                  console.log("Interview list", interviews);
                  const interviewEvents: EventInput[] = interviews.map((interview: any) => {
                    // calculate end time if interview_time exists
                    let endDate: Date | undefined = undefined;
                    if (interview.interview_time) {
                      // parse 12h format "h:mm AM/PM"
                      const timeMatch = interview.interview_time.match(/(\d+):(\d+)\s?(AM|PM)/i);

                      if (timeMatch) {
                        let hours = parseInt(timeMatch[1], 10);
                        const minutes = parseInt(timeMatch[2], 10);
                        const ampm = timeMatch[3].toUpperCase();

                        if (ampm === 'PM' && hours < 12) hours += 12;
                        if (ampm === 'AM' && hours === 12) hours = 0;

                        // base date = interview_date
                        const startDate = new Date(interview.interview_date);
                        startDate.setHours(hours, minutes, 0, 0);

                        // add fixed duration (e.g. 1 hour)
                        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

                        return {
                          id: `interview-${interview.id}`,
                          title: `Interview: ${interview.candidate_name} (${interview.job_name})`,
                          start: startDate,
                          end: endDate,
                          className: 'fc-event-interview',
                          groupId: 'interview',
                          details: `
        Type: ${interview.interview_type} <br>
        Mode: ${interview.mode} <br>
        Employee: ${interview.assigned_employee_name || ''} <br>
        Status: ${interview.status} <br>
        Remarks: ${interview.remarks || ''}
      `,
                        };
                      }
                    }
                    return {
                      id: `interview-${interview.id}`,
                      title: `Interview: ${interview.candidate_name} (${interview.job_name})`,
                      start: new Date(interview.interview_date),
                      end: endDate,
                      className: 'fc-event-interview', // custom style for interviews
                      groupId: 'interview',
                      details: `
            Type: ${interview.interview_type} <br>
            Mode: ${interview.mode} <br>
            Employee: ${interview.assigned_employee_name || ''} <br>
            Status: ${interview.status} <br>
            Remarks: ${interview.remarks || ''}
          `,
                    };
                  });

                  // const mergedEvents = [...this.calendarEvents, ...interviewEvents];

                  // this.calendarEvents = [...mergedEvents];
                  // this.tempEvents = [...mergedEvents];
                  // this.calendarOptions = { ...this.calendarOptions, events: [...mergedEvents] };

                  const allEvents = [...mergedEvents, ...interviewEvents];

                  this.calendarEvents = allEvents;
                  this.tempEvents = allEvents;
                  this.calendarOptions = { ...this.calendarOptions, events: allEvents };
                },
                error: (err) => console.error('Failed to load interviews:', err),
              });
            }
            else {
              // Non-admin users (no interviews)
              this.calendarEvents = [...mergedEvents];
              this.tempEvents = [...mergedEvents];
              this.calendarOptions = { ...this.calendarOptions, events: [...mergedEvents] };
            }
          },
          error: (err) => console.error('Failed to load holidays:', err),
        });
      },
      error: (err) => console.error('Failed to load events:', err),
    });
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
      element.includes(x.groupId as string)
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
