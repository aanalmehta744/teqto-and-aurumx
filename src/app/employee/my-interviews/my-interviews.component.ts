import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

import { InterviewService } from 'app/admin/interviews/interview.service';
import { AssignedRound } from 'app/admin/interviews/interview.model';


@Component({
  selector: 'app-my-interviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatProgressSpinnerModule,
    BreadcrumbComponent
  ],
  templateUrl: './my-interviews.component.html',
  styleUrls: ['./my-interviews.component.scss']
})
export class MyInterviewsComponent implements OnInit {

  rounds: AssignedRound[] = [];
  loading = false;
  error = '';
  savingId: number | null = null;

  constructor(
    private interviewService: InterviewService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.interviewService.getAssignedRounds().subscribe({
      next: (rounds) => {
        this.rounds = rounds || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err?.error?.message || 'Unable to load your interviews.';
        this.rounds = [];
        this.loading = false;
      }
    });
  }

  // Senior developer saves their own status + notes for the round.
  save(round: AssignedRound): void {
    this.savingId = round.round_id;

    this.interviewService
      .updateRound(round.round_id, {
        status: round.status,
        notes: (round.notes || '').trim() || null
      })
      .subscribe({
        next: () => {
          this.savingId = null;
          this.snackBar.open('Saved.', '', { duration: 2000 });
        },
        error: (err) => {
          this.savingId = null;
          this.snackBar.open(
            err?.error?.message || 'Unable to save.', '', { duration: 3000 }
          );
        }
      });
  }

  roundLabel(type: string | null | undefined): string {
    switch (String(type || '').toLowerCase()) {
      case 'hr': return 'HR Round';
      case 'technical': return 'Second Round';
      case 'ceo': return 'CEO Round';
      default: return type || '';
    }
  }

  statusClass(status: string | null | undefined): string {
    switch (String(status || '').toLowerCase()) {
      case 'cleared': return 'badge-green';
      case 'rejected': return 'badge-red';
      case 'hold': return 'badge-amber';
      case 'scheduled': return 'badge-blue';
      default: return 'badge-gray';
    }
  }
}
