import { Component } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-helper-classes',
  templateUrl: './helper-classes.component.html',
  styleUrls: ['./helper-classes.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent],
})
export class HelperClassesComponent {
  constructor() {
    // constructor
  }
}
