// import { Component, Inject } from '@angular/core';
// import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
// import { CommonModule } from '@angular/common';
// import { MatIconModule } from '@angular/material/icon';

// @Component({
//   selector: 'app-pause-history-dialog',
//   standalone: true,
//   imports: [
//     CommonModule,
//     MatDialogModule,
//     MatIconModule
//   ],
//   templateUrl: './pause-history-dialog.component.html',
// })
// export class PauseHistoryDialogComponent {

//   constructor(
//     @Inject(MAT_DIALOG_DATA)
//     public data: {
//       employeeName?: string;
//       history: any[];
//     }
//   ) {}

//   formatTime(date: string | null): string {
//     if (!date) {
//       return '--';
//     }

//     return new Date(date).toLocaleTimeString('en-IN', {
//       hour: '2-digit',
//       minute: '2-digit',
//       second: '2-digit',
//       hour12: true
//     });
//   }
// }
import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule
} from '@angular/material/dialog';

import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';

interface PauseHistory {
  id: number;
  pause_start: string;
  pause_end: string | null;
  duration: string | null;
  reason: string | null;
}

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
      history: PauseHistory[];
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

  getReason(reason: string | null): string {

    if (!reason || !reason.trim()) {
      return '--';
    }

    return reason;
  }
}