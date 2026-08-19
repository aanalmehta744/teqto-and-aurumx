import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-pause-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule
  ],
  templateUrl: './pause-history-dialog.component.html',
})
export class PauseHistoryDialogComponent {

  constructor(
    @Inject(MAT_DIALOG_DATA)
    public data: {
      employeeName?: string;
      history: any[];
    }
  ) {}

  formatTime(date: string | null): string {
    if (!date) {
      return '--';
    }

    return new Date(date).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  }
}