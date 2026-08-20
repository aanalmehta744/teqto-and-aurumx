import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-contact-grid',
  templateUrl: './contact-grid.component.html',
  styleUrls: ['./contact-grid.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatButtonModule],
})
export class ContactGridComponent {
  constructor() {
    // constructor
  }
}
