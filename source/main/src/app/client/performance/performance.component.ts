import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from 'environments/environment';
import {
  NgApexchartsModule, ApexAxisChartSeries, ApexChart,
  ApexXAxis, ApexDataLabels, ApexYAxis, ApexTooltip,
} from 'ng-apexcharts';

@Component({
  selector: 'app-performance',
  templateUrl: './performance.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, NgApexchartsModule, MatProgressSpinnerModule, MatIconModule],
})
export class PerformanceComponent implements OnInit {
  kpis: any[] = [];
  loading = false;
  userId: number | null = null;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();

  months = [
    { v: 1, l: 'January' }, { v: 2, l: 'February' }, { v: 3, l: 'March' },
    { v: 4, l: 'April' }, { v: 5, l: 'May' }, { v: 6, l: 'June' },
    { v: 7, l: 'July' }, { v: 8, l: 'August' }, { v: 9, l: 'September' },
    { v: 10, l: 'October' }, { v: 11, l: 'November' }, { v: 12, l: 'December' },
  ];

  // Chart
  chartSeries: ApexAxisChartSeries = [];
  chartOptions: ApexChart = { type: 'bar', height: 300 };
  xaxis: ApexXAxis = { categories: [] };
  dataLabels: ApexDataLabels = { enabled: true };
  chartYAxis: ApexYAxis = { title: { text: 'Value' } };
  chartTooltip: ApexTooltip = { shared: true, intersect: false };

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.userId = user?.id || null;
    if (this.userId) this.load();
  }

  load(): void {
    this.loading = true;
    this.http.get<any>(`${environment.apiUrl}/bde-performance/bde/${this.userId}?month=${this.selectedMonth}&year=${this.selectedYear}`)
      .subscribe({
        next: (data) => {
          this.kpis = data.kpis || [];
          this.buildChart();
          this.loading = false;
        },
        error: (err) => { console.error(err); this.loading = false; },
      });
  }

  buildChart(): void {
    const labels = this.kpis.map(k => k.kpi_name);
    this.xaxis = { categories: labels };
    this.chartSeries = [
      { name: 'Target', data: this.kpis.map(k => k.target_value) },
      { name: 'Achieved', data: this.kpis.map(k => k.achieved_value) },
    ];
  }

  statusColor(status: string): string {
    if (status === 'green') return 'bg-green-100 text-green-700';
    if (status === 'yellow') return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  }

  monthName(m: number): string {
    return this.months.find(x => x.v === m)?.l || String(m);
  }
}
