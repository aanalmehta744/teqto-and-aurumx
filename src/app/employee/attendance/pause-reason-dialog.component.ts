import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-pause-reason-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule
  ],
  templateUrl: './pause-reason-dialog.component.html'
})
export class PauseReasonDialogComponent {

  reason = '';

  constructor(
    private dialogRef: MatDialogRef<PauseReasonDialogComponent>
  ) {}

  cancel(): void {
    this.dialogRef.close();
  }

  submit(): void {

    const trimmedReason = this.reason.trim();

    if (!trimmedReason) {
      return;
    }

    this.dialogRef.close(trimmedReason);
  }
}