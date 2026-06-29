import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-kpi-targets',
  templateUrl: './kpi-targets.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, MatTableModule, MatIconModule, MatButtonModule],
})
export class KpiTargetsComponent implements OnInit {
  targets: any[] = [];
  bdes: any[] = [];
  kpis: any[] = [];
  showForm = false;
  editMode = false;
  submitting = false;
  currentUser: any;
  filterBdeId = '';

  private baseApi = `${environment.apiUrl}/kpi`;

  form = {
    target_id: null as number | null,
    user_id: '' as any,
    kpi_id: '' as any,
    target_value: null as number | null,
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    weightage: null as number | null,
  };

  months = [
    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' },
  ];

  displayedColumns = ['bde_name', 'kpi_name', 'target_value', 'month', 'year', 'weightage', 'actions'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.loadBdes();
    this.loadKpis();
    this.loadTargets();
  }

  loadBdes(): void {
    this.http.get<any[]>(`${this.baseApi}/bde-list`).subscribe({
      next: (data) => (this.bdes = data),
      error: (err) => console.error(err),
    });
  }

  loadKpis(): void {
    this.http.get<any[]>(`${this.baseApi}/master`).subscribe({
      next: (data) => (this.kpis = data.filter(k => k.is_active)),
      error: (err) => console.error(err),
    });
  }

  loadTargets(): void {
    const url = this.filterBdeId
      ? `${this.baseApi}/targets?bde_id=${this.filterBdeId}`
      : `${this.baseApi}/targets`;
    this.http.get<any[]>(url).subscribe({
      next: (data) => (this.targets = data),
      error: (err) => console.error(err),
    });
  }

  openAdd(): void {
    this.editMode = false;
    this.form = { target_id: null, user_id: '', kpi_id: '', target_value: null, month: new Date().getMonth() + 1, year: new Date().getFullYear(), weightage: null };
    this.showForm = true;
  }

  openEdit(t: any): void {
    this.editMode = true;
    this.form = { target_id: t.target_id, user_id: t.user_id, kpi_id: t.kpi_id, target_value: t.target_value, month: t.month, year: t.year, weightage: t.weightage };
    this.showForm = true;
  }

  submit(): void {
    if (!this.form.user_id || !this.form.kpi_id || this.form.target_value == null) return;
    this.submitting = true;
    const payload = { ...this.form, created_by: this.currentUser?.id };

    const req = this.editMode
      ? this.http.put(`${this.baseApi}/targets/${this.form.target_id}`, payload)
      : this.http.post(`${this.baseApi}/targets`, payload);

    req.subscribe({
      next: () => { this.showForm = false; this.submitting = false; this.loadTargets(); },
      error: (err) => { console.error(err); this.submitting = false; },
    });
  }

  delete(id: number): void {
    if (!confirm('Delete this target?')) return;
    this.http.delete(`${this.baseApi}/targets/${id}`).subscribe({
      next: () => this.loadTargets(),
      error: (err) => console.error(err),
    });
  }

  monthName(m: number): string {
    return this.months.find(x => x.v === m)?.l || String(m);
  }

  cancel(): void { this.showForm = false; }
}
