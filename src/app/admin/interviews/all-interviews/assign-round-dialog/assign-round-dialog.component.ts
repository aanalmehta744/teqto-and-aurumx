import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import {
  MatDialogModule,
  MatDialogRef,
  MAT_DIALOG_DATA
} from '@angular/material/dialog';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InterviewService } from '../../interview.service';
import {
  InterviewRound,
  SeniorDeveloper
} from '../../interview.model';


export interface AssignRoundDialogData {
  interviewId: number;
  candidateName: string;
  rounds: InterviewRound[];
  seniorDevelopers: SeniorDeveloper[];
}


@Component({
  selector: 'app-assign-round-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule
  ],
  templateUrl: './assign-round-dialog.component.html',
  styleUrls: ['./assign-round-dialog.component.scss']
})
export class AssignRoundDialogComponent {

  rounds: InterviewRound[] = [];
  seniorDevelopers: SeniorDeveloper[] = [];

  // Form for a new round.
  newRound = {
    round_type: 'technical',
    assigned_to_id: null as number | null,
    scheduled_date: '',
    notes: ''
  };

  saving = false;
  error = '';

  // Whether anything changed, so the parent knows to reload.
  private changed = false;


  constructor(
    private dialogRef: MatDialogRef<AssignRoundDialogComponent>,
    private interviewService: InterviewService,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: AssignRoundDialogData
  ) {
    this.rounds = (data.rounds || []).map(r => ({ ...r }));
    this.seniorDevelopers = data.seniorDevelopers || [];
  }


  private nameFor(id: number | null): string | null {
    const dev = this.seniorDevelopers.find(d => Number(d.id) === Number(id));
    return dev ? dev.fullName : null;
  }


  roundLabel(type: string | null | undefined): string {
    switch (String(type || '').toLowerCase()) {
      case 'hr': return 'HR Round';
      case 'technical': return 'Second Round';
      case 'ceo': return 'CEO Round';
      default: return type || '';
    }
  }


  addRound(): void {
    this.error = '';

    if (!this.newRound.assigned_to_id) {
      this.error = 'Please select a senior developer.';
      return;
    }

    this.saving = true;

    const payload: Partial<InterviewRound> = {
      round_type: this.newRound.round_type,
      assigned_to_id: this.newRound.assigned_to_id,
      assigned_to_name: this.nameFor(this.newRound.assigned_to_id),
      scheduled_date: this.newRound.scheduled_date || null,
      notes: this.newRound.notes?.trim() || null,
      status: 'pending'
    };

    this.interviewService
      .assignRound(this.data.interviewId, payload)
      .subscribe({
        next: (res: any) => {
          this.rounds.push({
            id: res?.id,
            interview_id: this.data.interviewId,
            ...payload
          } as InterviewRound);

          this.newRound = {
            round_type: 'technical',
            assigned_to_id: null,
            scheduled_date: '',
            notes: ''
          };

          this.changed = true;
          this.saving = false;
          this.notify('Round assigned.');
        },
        error: (err) => {
          this.saving = false;
          this.error = err?.error?.message || 'Unable to assign round.';
        }
      });
  }


  updateRound(round: InterviewRound): void {
    if (!round.id) {
      return;
    }

    this.interviewService
      .updateRound(round.id, {
        status: round.status,
        scheduled_date: round.scheduled_date || null,
        notes: round.notes?.trim() || null
      })
      .subscribe({
        next: () => {
          this.changed = true;
          this.notify('Round updated.');
        },
        error: (err) => {
          this.notify(err?.error?.message || 'Unable to update round.');
        }
      });
  }


  removeRound(round: InterviewRound, index: number): void {
    if (!round.id) {
      this.rounds.splice(index, 1);
      return;
    }

    if (!window.confirm('Remove this round assignment?')) {
      return;
    }

    this.interviewService.deleteRound(round.id).subscribe({
      next: () => {
        this.rounds.splice(index, 1);
        this.changed = true;
        this.notify('Round removed.');
      },
      error: (err) => {
        this.notify(err?.error?.message || 'Unable to remove round.');
      }
    });
  }


  private notify(text: string): void {
    this.snackBar.open(text, '', { duration: 2500 });
  }


  close(): void {
    this.dialogRef.close(this.changed);
  }
}
