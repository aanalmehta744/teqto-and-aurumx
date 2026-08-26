import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';

import { InterviewService } from '../../interview.service';
import { HrCallOption } from '../../interview.model';


@Component({
  selector: 'app-hr-call-manage-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './hr-call-manage-dialog.component.html',
  styleUrls: ['./hr-call-manage-dialog.component.scss']
})
export class HrCallManageDialogComponent implements OnInit {

  statuses: HrCallOption[] = [];
  newName = '';
  loading = false;
  error = '';

  // Tracks the row currently being edited.
  editingId: number | null = null;
  editName = '';

  private changed = false;

  constructor(
    private dialogRef: MatDialogRef<HrCallManageDialogComponent>,
    private interviewService: InterviewService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.interviewService.getHrCallOptions().subscribe({
      next: (s) => { this.statuses = s || []; this.loading = false; },
      error: () => { this.statuses = []; this.loading = false; }
    });
  }

  add(): void {
    const name = this.newName.trim();
    this.error = '';
    if (!name) return;

    this.interviewService.createHrCallOption(name).subscribe({
      next: (s) => {
        this.statuses = [...this.statuses, s].sort((a, b) => a.name.localeCompare(b.name));
        this.newName = '';
        this.changed = true;
      },
      error: (err) => { this.error = err?.error?.message || 'Unable to add option.'; }
    });
  }

  startEdit(s: HrCallOption): void {
    this.editingId = s.id;
    this.editName = s.name;
    this.error = '';
  }

  cancelEdit(): void {
    this.editingId = null;
    this.editName = '';
  }

  saveEdit(s: HrCallOption): void {
    const name = this.editName.trim();
    if (!name) return;

    this.interviewService.updateHrCallOption(s.id, name).subscribe({
      next: (updated) => {
        s.name = updated.name;
        this.statuses = [...this.statuses].sort((a, b) => a.name.localeCompare(b.name));
        this.editingId = null;
        this.changed = true;
      },
      error: (err) => { this.error = err?.error?.message || 'Unable to update option.'; }
    });
  }

  remove(s: HrCallOption): void {
    if (!window.confirm(`Delete "${s.name}"?`)) return;

    this.interviewService.deleteHrCallOption(s.id).subscribe({
      next: () => {
        this.statuses = this.statuses.filter(x => x.id !== s.id);
        this.changed = true;
        this.snackBar.open('Deleted.', '', { duration: 1500 });
      },
      error: (err) => {
        this.snackBar.open(err?.error?.message || 'Unable to delete.', '', { duration: 3000 });
      }
    });
  }

  close(): void {
    this.dialogRef.close(this.changed);
  }
}
