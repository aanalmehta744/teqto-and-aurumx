import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
    selector: 'app-invoice',
    templateUrl: './invoice.component.html',
    styleUrls: ['./invoice.component.scss'],
    standalone: true,
    imports: [BreadcrumbComponent, MatButtonModule],
})
export class InvoiceComponent {
  constructor() {
    // constructor
  }
}
