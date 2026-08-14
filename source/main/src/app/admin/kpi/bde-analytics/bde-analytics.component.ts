import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  NgApexchartsModule,
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexYAxis,
  ApexDataLabels,
  ApexPlotOptions,
  ApexLegend,
  ApexTooltip,
  ApexGrid,
  ApexFill,
} from 'ng-apexcharts';
import { environment } from 'environments/environment';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  plotOptions: ApexPlotOptions;
  legend: ApexLegend;
  tooltip: ApexTooltip;
  grid: ApexGrid;
  fill: ApexFill;
  colors: string[];
};

@Component({
  selector: 'app-bde-analytics',
  templateUrl: './bde-analytics.component.html',
  standalone: true,
  imports: [CommonModule, NgApexchartsModule, BreadcrumbComponent],
})
export class BdeAnalyticsComponent implements OnInit {
  loading = true;
  stats: any[] = [];

  totalClosed = 0;
  totalHot = 0;
  totalCold = 0;
  totalClients = 0;
  topBde = '';

  // Chart 1 — Closed clients per BDE (horizontal bar, leaderboard)
  closedChartOptions!: Partial<ChartOptions>;

  // Chart 2 — Hot / Cold / Closed per BDE (grouped bar)
  breakdownChartOptions!: Partial<ChartOptions>;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.http.get<any[]>(`${environment.apiUrl}/bde-performance/client-stats`).subscribe({
      next: (data) => {
        this.stats = data;
        this.loading = false;
        this.computeSummary();
        this.buildClosedChart();
        this.buildBreakdownChart();
      },
      error: () => { this.loading = false; }
    });
  }

  private computeSummary() {
    this.totalClosed  = this.stats.reduce((s, r) => s + Number(r.closed), 0);
    this.totalHot     = this.stats.reduce((s, r) => s + Number(r.hot), 0);
    this.totalCold    = this.stats.reduce((s, r) => s + Number(r.cold), 0);
    this.totalClients = this.stats.reduce((s, r) => s + Number(r.total), 0);
    const top = this.stats[0];
    this.topBde = top ? `${top.bde_name} (${top.closed} closed)` : '—';
  }

  private buildClosedChart() {
    const names  = this.stats.map(r => r.bde_name);
    const closed = this.stats.map(r => Number(r.closed));

    this.closedChartOptions = {
      series: [{ name: 'Closed Clients', data: closed }],
      chart: { type: 'bar', height: 320, toolbar: { show: false } },
      plotOptions: {
        bar: { horizontal: true, borderRadius: 4, dataLabels: { position: 'top' } }
      },
      dataLabels: { enabled: true, offsetX: 14, style: { fontSize: '12px', colors: ['#374151'] } },
      xaxis: { categories: names, labels: { style: { colors: '#6b7280' } } },
      yaxis: { labels: { style: { colors: '#6b7280', fontSize: '13px' } } },
      grid: { borderColor: '#f3f4f6' },
      colors: ['#00383F'],
      fill: { opacity: 1 },
      legend: { show: false },
      tooltip: { y: { formatter: (v: number) => `${v} clients` } },
    };
  }

  private buildBreakdownChart() {
    const names = this.stats.map(r => r.bde_name);

    this.breakdownChartOptions = {
      series: [
        { name: 'Closed', data: this.stats.map(r => Number(r.closed)) },
        { name: 'Hot',    data: this.stats.map(r => Number(r.hot)) },
        { name: 'Cold',   data: this.stats.map(r => Number(r.cold)) },
      ],
      chart: { type: 'bar', height: 350, stacked: false, toolbar: { show: false } },
      plotOptions: { bar: { columnWidth: '55%', borderRadius: 3 } },
      dataLabels: { enabled: false },
      xaxis: { categories: names, labels: { style: { colors: '#6b7280', fontSize: '12px' } } },
      yaxis: { labels: { style: { colors: '#6b7280' } } },
      grid: { borderColor: '#f3f4f6' },
      colors: ['#059669', '#ef4444', '#3b82f6'],
      legend: { position: 'top' },
      tooltip: { y: { formatter: (v: number) => `${v} clients` } },
      fill: { opacity: 1 },
    };
  }
}
