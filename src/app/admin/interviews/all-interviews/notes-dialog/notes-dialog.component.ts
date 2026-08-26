import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  MatDialogModule,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';


export interface NotesDialogData {
  title: string;
  text: string;
}


@Component({
  selector: 'app-notes-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title class="notes-title">{{ data.title }}</h2>
    <mat-dialog-content>
      <p class="notes-text">{{ data.text || 'No notes.' }}</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-flat-button color="primary" mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .notes-title { margin: 0; font-size: 17px; font-weight: 600; }
    .notes-text {
      margin: 0;
      white-space: pre-wrap;
      line-height: 1.6;
      font-size: 14px;
      color: #374151;
      min-width: 320px;
      max-width: 520px;
    }
  `]
})
export class NotesDialogComponent {
  constructor(@Inject(MAT_DIALOG_DATA) public data: NotesDialogData) {}
}
