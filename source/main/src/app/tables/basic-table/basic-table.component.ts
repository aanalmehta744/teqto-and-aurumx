import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-basic-table',
  templateUrl: './basic-table.component.html',
  styleUrls: ['./basic-table.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class BasicTableComponent {
  constructor() {
    // constructor
  }
}
