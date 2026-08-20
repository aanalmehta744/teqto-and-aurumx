import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-my-targets',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent],
  templateUrl: './my-targets.component.html',
})
export class MyTargetsComponent implements OnInit {
  private base = environment.apiUrl;

  month: number = new Date().getMonth() + 1;
  year: number = new Date().getFullYear();
  userId: number | null = null;

  target: any = null;
  loading = false;

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
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.userId = user?.id || null;
    if (this.userId) this.loadTarget();
  }

  loadTarget() {
    this.loading = true;
    this.http
      .get<any[]>(`${this.base}/bde-client-targets/achievement?bde_id=${this.userId}&month=${this.month}&year=${this.year}`)
      .subscribe({
        next: d => { this.target = d[0] || null; this.loading = false; },
        error: () => { this.loading = false; },
      });
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
}
