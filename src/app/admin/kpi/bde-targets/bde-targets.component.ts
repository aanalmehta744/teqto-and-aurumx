import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from 'environments/environment';
import { forkJoin } from 'rxjs';

interface TargetForm {
  full_time: number | null;
  part_time: number | null;
  hourly: number | null;
  project_base: number | null;
  amount: number | null;
}

@Component({
  selector: 'app-bde-targets',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatFormFieldModule, MatSelectModule, BreadcrumbComponent],
  templateUrl: './bde-targets.component.html',
})
export class BdeTargetsComponent implements OnInit {
  private base = environment.apiUrl;

  month: number = new Date().getMonth() + 1;
  year: number = new Date().getFullYear();

  mode: 'all' | 'single' = 'all';

  bdeList: any[] = [];
  // Multi-select: one or more BDEs. `selectedBdeId` mirrors the single selection
  // (only set when exactly one is chosen) so the prefill + achievement view still works.
  selectedBdeIds: number[] = [];
  selectedBdeId: number | null = null;

  form: TargetForm = this.blankForm();

  allAchievements: any[] = [];
  singleAchievement: any | null = null;

  saving = false;
  loading = false;
  successMsg = '';
  errorMsg = '';

  readonly months = [
    { val: 1, label: 'January' }, { val: 2, label: 'February' },
    { val: 3, label: 'March' }, { val: 4, label: 'April' },
    { val: 5, label: 'May' }, { val: 6, label: 'June' },
    { val: 7, label: 'July' }, { val: 8, label: 'August' },
    { val: 9, label: 'September' }, { val: 10, label: 'October' },
    { val: 11, label: 'November' }, { val: 12, label: 'December' },
  ];

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadBdeList();
    this.loadAllAchievements();
  }

  blankForm(): TargetForm {
    return { full_time: null, part_time: null, hourly: null, project_base: null, amount: null };
  }

  loadBdeList() {
    this.http.get<any[]>(`${this.base}/kpi/bde-list`).subscribe({
      next: d => (this.bdeList = d || []),
      error: err => console.error('Failed to load BDE list:', err),
    });
  }

  // ─── Mode switch ───────────────────────────────────────────────────────────

  setMode(m: 'all' | 'single') {
    this.mode = m;
    this.successMsg = '';
    this.errorMsg = '';
    this.form = this.blankForm();
    this.singleAchievement = null;
    if (m === 'all') {
      this.loadAllAchievements();
    }
  }

  onFilterChange() {
    if (this.mode === 'all') this.loadAllAchievements();
    else if (this.selectedBdeId) this.loadSingleData();
  }

  onBdeSelect() {
    this.successMsg = '';
    this.errorMsg = '';
    this.form = this.blankForm();
    this.singleAchievement = null;
    // Prefill the form + show achievement only when exactly ONE BDE is selected.
    // For multiple, the admin enters fresh targets applied to all of them.
    this.selectedBdeId = this.selectedBdeIds.length === 1 ? this.selectedBdeIds[0] : null;
    if (this.selectedBdeId) this.loadSingleData();
  }

  // ─── All-BDE ───────────────────────────────────────────────────────────────

  loadAllAchievements() {
    this.loading = true;
    this.http
      .get<any[]>(`${this.base}/bde-client-targets/achievement?month=${this.month}&year=${this.year}`)
      .subscribe({
        next: d => { this.allAchievements = d; this.loading = false; },
        error: () => { this.loading = false; },
      });
  }

  saveForAll() {
    if (!this.formValid()) return;
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.http
      .post<any>(`${this.base}/bde-client-targets/save-all`, {
        month: this.month, year: this.year, ...this.form, created_by: user.id,
      })
      .subscribe({
        next: r => {
          this.saving = false;
          this.successMsg = `Targets saved for ${r.saved_count} BDE(s) successfully!`;
          this.form = this.blankForm();
          this.loadAllAchievements();
        },
        error: () => { this.saving = false; this.errorMsg = 'Failed to save. Please try again.'; },
      });
  }

  // ─── Single BDE ────────────────────────────────────────────────────────────

  loadSingleData() {
    this.http
      .get<any[]>(`${this.base}/bde-client-targets?bde_id=${this.selectedBdeId}&month=${this.month}&year=${this.year}`)
      .subscribe({
        next: d => {
          if (d.length) {
            const t = d[0];
            this.form = { full_time: t.full_time, part_time: t.part_time, hourly: t.hourly, project_base: t.project_base, amount: t.amount };
          } else {
            this.form = this.blankForm();
          }
        },
      });
    this.http
      .get<any[]>(`${this.base}/bde-client-targets/achievement?bde_id=${this.selectedBdeId}&month=${this.month}&year=${this.year}`)
      .subscribe({ next: d => (this.singleAchievement = d[0] || null) });
  }

  saveForSingle() {
    if (!this.selectedBdeIds.length || !this.formValid()) return;
    this.saving = true;
    this.successMsg = '';
    this.errorMsg = '';
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');

    // Apply the same target form to every selected BDE.
    const requests = this.selectedBdeIds.map(id =>
      this.http.post(`${this.base}/bde-client-targets/save`, {
        bde_id: id, month: this.month, year: this.year,
        ...this.form, created_by: user.id,
      })
    );

    forkJoin(requests).subscribe({
      next: () => {
        this.saving = false;
        this.successMsg = `Targets saved for ${this.selectedBdeIds.length} BDE(s) successfully!`;
        if (this.selectedBdeId) this.loadSingleData();
      },
      error: () => { this.saving = false; this.errorMsg = 'Failed to save. Please try again.'; },
    });
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  formValid(): boolean {
    const f = this.form;
    if (f.full_time == null || f.part_time == null || f.hourly == null || f.project_base == null || f.amount == null) {
      this.errorMsg = 'All fields are mandatory. Please fill in every field.';
      return false;
    }
    this.errorMsg = '';
    return true;
  }

  bar(pct: number): string {
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 70) return 'bg-yellow-400';
    return 'bg-red-400';
  }

  badge(pct: number): string {
    if (pct >= 100) return 'bg-green-100 text-green-700';
    if (pct >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-600';
  }

  get monthLabel(): string {
    return this.months.find(m => m.val === this.month)?.label || '';
  }

  get selectedBdeName(): string {
    return this.bdeList
      .filter(b => this.selectedBdeIds.includes(b.id))
      .map(b => b.fullName)
      .join(', ');
  }
}
