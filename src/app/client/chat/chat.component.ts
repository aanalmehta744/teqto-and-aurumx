import { Component } from '@angular/core';
import { UntypedFormControl } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { NgScrollbar } from 'ngx-scrollbar';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    NgScrollbar,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
  ],
})
export class ChatComponent {
  hideRequiredControl = new UntypedFormControl(false);
  constructor() {
    // constructor
  }
}
