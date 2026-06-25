import { Component } from '@angular/core';
import {
  CdkDragDrop,
  moveItemInArray,
  CdkDropList,
  CdkDrag,
  CdkDragHandle,
  CdkDragPlaceholder,
} from '@angular/cdk/drag-drop';
import { NgClass } from '@angular/common';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonModule } from '@angular/material/button';
import { NgScrollbar } from 'ngx-scrollbar';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-data-widget',
  templateUrl: './data-widget.component.html',
  styleUrls: ['./data-widget.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatProgressBarModule,
    NgScrollbar,
    MatButtonModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    CdkDropList,
    CdkDrag,
    CdkDragHandle,
    MatIconModule,
    MatCheckboxModule,
    CdkDragPlaceholder,
    MatTooltipModule,
    NgClass,
  ],
})
export class DataWidgetComponent {
  constructor() {
    // /constructor
  }

  // TODO start
  tasks = [
    {
      id: '1',
      title: 'Submit Science Homework',
      done: true,
      priority: 'High',
    },
    {
      id: '2',
      title: 'Request for festivle holiday',
      done: false,
      priority: 'High',
    },
    {
      id: '3',
      title: 'Order new java book',
      done: false,
      priority: 'Low',
    },
    {
      id: '4',
      title: 'Remind for lunch in hotel',
      done: true,
      priority: 'Normal',
    },
    {
      id: '5',
      title: 'Pay Hostel Fees',
      done: false,
      priority: 'High',
    },
    {
      id: '6',
      title: 'Attend Seminar On Sunday',
      done: false,
      priority: 'Normal',
    },
    {
      id: '7',
      title: 'Renew bus pass',
      done: true,
      priority: 'High',
    },
    {
      id: '8',
      title: 'Issue book in library',
      done: false,
      priority: 'High',
    },
    {
      id: '9',
      title: 'Project report submit',
      done: false,
      priority: 'Low',
    },
  ];

  drop(event: CdkDragDrop<string[]>) {
    moveItemInArray(this.tasks, event.previousIndex, event.currentIndex);
  }

  toggle(task: { done: boolean }) {
    task.done = !task.done;
  }
  // TODO end
}
