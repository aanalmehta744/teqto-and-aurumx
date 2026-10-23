import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from 'environments/environment';

// Admin read-only view of all daily client notes added by BAs/BDEs.
@Component({
  selector: 'app-admin-client-notes',
  templateUrl: './client-notes.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, BreadcrumbComponent],
  providers: [DatePipe],
})
export class AdminClientNotesComponent implements OnInit {
  notes: any[] = [];
  loading = false;

  filterDate = '';
  filterSearch = '';

  currentPage = 1;
  readonly pageSize = 10;

  moodOptions = [
    { value: 'positive', label: 'Positive', color: 'text-green-700', bg: 'bg-green-100', icon: '😊' },
    { value: 'neutral',  label: 'Neutral',  color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '😐' },
    { value: 'negative', label: 'Negative', color: 'text-red-700', bg: 'bg-red-100', icon: '😟' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadNotes();
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.notes.length / this.pageSize));
  }

  get paginatedNotes(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.notes.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i + 1);
  }

  goToPage(page: number) {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  loadNotes() {
    const params: any = {};
    if (this.filterDate) params.date = this.filterDate;
    if (this.filterSearch) params.search = this.filterSearch;

    this.loading = true;
    this.currentPage = 1;
    this.http.get<any[]>(`${environment.apiUrl}/client-daily-notes/all`, { params })
      .subscribe({
        next: d => { this.notes = d || []; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  clearFilters() {
    this.filterDate = '';
    this.filterSearch = '';
    this.loadNotes();
  }

  moodFor(val: string) {
    return this.moodOptions.find(m => m.value === val) || this.moodOptions[1];
  }
}
