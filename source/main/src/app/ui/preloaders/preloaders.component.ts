import { Component } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-preloaders',
  templateUrl: './preloaders.component.html',
  styleUrls: ['./preloaders.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, MatProgressSpinnerModule],
})
export class PreloadersComponent {
  constructor() {
    // constructor
  }
}
