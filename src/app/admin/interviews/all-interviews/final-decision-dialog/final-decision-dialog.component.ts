import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InterviewService } from '../../interview.service';


export interface FinalDecisionDialogData {
  interviewId: number;
  candidateName: string;
  final_call_status: string;
  final_call_notes: string | null;
}


@Component({
  selector: 'app-final-decision-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule
  ],
  templateUrl: './final-decision-dialog.component.html',
  styleUrls: ['./final-decision-dialog.component.scss']
})
export class FinalDecisionDialogComponent {

  status: string;
  notes: string;
  saving = false;
  error = '';

  constructor(
    private dialogRef: MatDialogRef<FinalDecisionDialogComponent>,
    private interviewService: InterviewService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: FinalDecisionDialogData
  ) {
    this.status = data.final_call_status || 'pending';
    this.notes = data.final_call_notes || '';
  }


  save(): void {
    this.saving = true;
    this.error = '';

    this.interviewService
      .setFinalDecision(this.data.interviewId, {
        final_call_status: this.status,
        final_call_notes: this.notes?.trim() || null
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.snackBar.open('Final decision saved.', '', { duration: 2500 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Unable to save decision.';
        }
      });
  }


  cancel(): void {
    this.dialogRef.close(false);
  }
}
