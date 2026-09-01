import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from 'environments/environment';

export interface LeaveHistoryData {
  employee_id: number;
  fullName: string;
}

@Component({
  selector: 'app-leave-history-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './leave-history-dialog.component.html',
})
export class LeaveHistoryDialogComponent implements OnInit {
  leaves: any[] = [];
  isLoading = true;
  error = '';

  constructor(
    private http: HttpClient,
    public dialogRef: MatDialogRef<LeaveHistoryDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: LeaveHistoryData
  ) {}

  ngOnInit(): void {
    this.http
      .get<any[]>(`${environment.apiUrl}/myleave/employee/${this.data.employee_id}`)
      .subscribe({
        next: (rows) => {
          this.leaves = rows || [];
          this.isLoading = false;
        },
        error: (err) => {
          // 404 = no leaves taken yet; treat as empty, not an error.
          this.leaves = [];
          this.isLoading = false;
          if (err?.status !== 404) {
            this.error = 'Unable to load leave history.';
          }
        },
      });
  }
}
