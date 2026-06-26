import { Component, OnInit, ViewChild } from '@angular/core';
import { FeatherIconsComponent } from '@shared/components/feather-icons/feather-icons.component';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BaseChartDirective } from 'ng2-charts';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { EmployeeDailyUpdateService } from 'app/admin/employee-daily-update/employee-daily-update.service';
import { DashboardService } from './dashboard.service';
import { TodayService } from 'app/admin/attendance/today/today.service';
import { CommonModule, formatDate } from '@angular/common';
import { NgScrollbarModule } from 'ngx-scrollbar';
import { ProjectService } from 'app/admin/projects/all-projects/core/project.service';
import { ClientsService } from 'app/admin/clients/all-clients/clients.service';
import {
  ApexAxisChartSeries,
  ApexChart,
  ApexXAxis,
  ApexDataLabels,
  ApexStroke,
  ApexMarkers,
  ApexYAxis,
  ApexGrid,
  ApexTitleSubtitle,
  ApexTooltip,
  ApexLegend,
  ApexFill,
  ApexResponsive,
  ApexNonAxisChartSeries,
  NgApexchartsModule,
} from 'ng-apexcharts';
import { InterviewService } from 'app/employee/jobs/interview-schedule/interview.service';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { LeavesService } from 'app/admin/leaves/leave-requests/leaves.service';
import { AuthService } from '@core';
import { AnnouncementBannerComponent } from '@shared/components/announcement-banner/announcement-banner.component';
@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
  standalone: true,
  imports: [
    BreadcrumbComponent,
    MatButtonModule,
    MatMenuModule,
    MatIconModule,
    RouterLink,
    MatProgressBarModule,
    // BaseChartDirective,
    MatTooltipModule,
    FeatherIconsComponent,
    CommonModule,
    NgScrollbarModule,
    NgApexchartsModule,
    MatPaginatorModule,
    AnnouncementBannerComponent,
  ],
})
export class MainComponent implements OnInit {
  interviewDataSource = new MatTableDataSource<any>([]);

  todayFollowupsByBDE: any[] = [];
  todayAttendance: any[] = [];
  allProjectsWithTeams: any[] = [];
  allProjects: any[] = [];
  allClients: any[] = [];
  employeeUpdates: any[] = [];
  paginatedInterviews: any[] = [];

  @ViewChild('interviewPaginator') interviewPaginator!: MatPaginator;
  // Follow-ups pagination
  paginatedFollowups: any[] = [];
  @ViewChild('followupPaginator') followupPaginator!: MatPaginator;

  // Attendance pagination
  paginatedAttendance: any[] = [];
  @ViewChild('attendancePaginator') attendancePaginator!: MatPaginator;

  @ViewChild('leavePaginator') leavePaginator!: MatPaginator;
  pendingLeaves: any[] = [];
  paginatedPendingLeaves: any[] = [];


  userRole: string = '';
  private projectStatusMap: { [status: string]: string[] } = {};
  constructor(
    private dashboardService: DashboardService,
    private todayService: TodayService,
    private dailyUpdateService: EmployeeDailyUpdateService,
    private projectService: ProjectService,
    private clientsService: ClientsService,
    private interviewService: InterviewService,
    private ieavesService: LeavesService,
    private authService: AuthService,
  ) {
    this.userRole = this.authService.currentUserValue?.role?.toLowerCase() ?? '';
  }

  // ApexChart variables
  public chartSeries: ApexAxisChartSeries = [];
  public chartOptions: ApexChart = {
    type: 'bar',
    height: 350,
    stacked: false,
  };
  public xaxis: ApexXAxis = {
    categories: [],
    title: { text: 'Date' },
  };
  public yaxis: ApexYAxis = {
    title: { text: 'Number of Updates' },
    min: 0,
  };
  public dataLabels: ApexDataLabels = {
    enabled: false,
  };
  public stroke = {
    show: true,
    width: 2,
  };
  public tooltip: ApexTooltip = {
    shared: true,
    intersect: false,
  };
  public legend: ApexLegend = {
    position: 'top',
  };
  public projectStatusSeries: ApexNonAxisChartSeries = [];
  public projectStatusChart: ApexChart = {
    type: 'donut',
    height: 300,
  };
  public projectStatusLabels: string[] = ['Active', 'Completed', 'Running', 'Pending', 'NotStarted', 'Canceled'];
  public projectStatusColors: string[] = ['#1abc9c', '#2ecc71', '#3498db', '#f1c40f', '#9b59b6', '#e74c3c'];
  public projectStatusLegend: ApexLegend = {
    position: 'bottom',
  };
  public projectStatusDataLabels: ApexDataLabels = {
    enabled: true,
    formatter: (val: number, opts: any) => {
      const count = opts.w.globals.series[opts.seriesIndex];
      return count.toString(); // Show count instead of percentage
    },
  };

  public projectStatusTooltip: ApexTooltip = {
    y: {
      formatter: (val: number, opts?: any) => {
        const status = this.projectStatusLabels[opts.seriesIndex];
        const projects = this.projectStatusMap[status] || [];
        return projects.length
          ? projects.join(', ')   // show actual projectTitle list
          : `${val} Projects`;    // fallback
      },
    },
  };

  public clientCountryChart: ApexChart = {
    type: 'bar',
    height: 300
  };

  public clientCountrySeries: ApexAxisChartSeries = [];
  public clientCountryXAxis: ApexXAxis = {
    categories: [],
    title: { text: 'Country' }
  };

  public clientCountryDataLabels: ApexDataLabels = {
    enabled: true
  };

  public clientCountryTooltip: ApexTooltip = {
    y: {
      formatter: (val: number) => `${val} Clients`
    }
  };


  ngOnInit() {
    this.loadFollowupsByBDE();
    this.loadTodayAttendance();
    this.loadAllProjectsWithTeams();
    this.loadEmployeeDailyUpdates();
    this.loadProjects();
    this.loadClients();
    this.loadInterviews();
    this.loadPendingLeaves();
  }
  ngAfterViewInit(): void {
    if (this.followupPaginator) {
      this.followupPaginator.page.subscribe(() => this.updateFollowupPagination());
    }
    if (this.attendancePaginator) {
      this.attendancePaginator.page.subscribe(() => this.updateAttendancePagination());
    }
    if (this.leavePaginator) {
      this.leavePaginator.page.subscribe(() => this.updateLeavePagination());
    }
  }
  loadPendingLeaves(): void {
    this.ieavesService.getAllLeaves(); // triggers the request
    this.ieavesService.dataChange.subscribe({
      next: (data: any[]) => {
        console.log("Leave request list", data);
        this.pendingLeaves = data.filter(leave => leave.status === 'Pending');
        this.updateLeavePagination();
      },
      error: (err: any) => console.error('Error fetching pending leaves:', err),
    });
  }
  updateLeavePagination(event?: any): void {
    if (!this.leavePaginator) return;
    const pageIndex = event?.pageIndex ?? this.leavePaginator.pageIndex ?? 0;
    const pageSize = event?.pageSize ?? this.leavePaginator.pageSize ?? 5;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    this.paginatedPendingLeaves = this.pendingLeaves.slice(start, end);
  }
  loadFollowupsByBDE(): void {
    this.dashboardService.getTodayFollowupsByBDE().subscribe({
      next: (data) => {
        this.todayFollowupsByBDE = data;
        this.updateFollowupPagination();
        console.log('Today Followups by BDE:', this.todayFollowupsByBDE);
      },
      error: (err) => {
        console.error('Error fetching today follow-ups by BDE:', err);
      }
    });
  }
  loadTodayAttendance(): void {
    this.todayService.getAllTodays().subscribe({
      next: (data) => {
        this.todayAttendance = data;
        this.updateAttendancePagination();
        console.log('Today Attendance:', this.todayAttendance);
      },
      error: (err) => {
        console.error('Error fetching today attendance:', err);
      }
    });
  }
  loadAllProjectsWithTeams(): void {
    this.dashboardService.getAllTeams().subscribe({
      next: (data) => {
        this.allProjectsWithTeams = data;
        console.log('All Projects with Teams:', this.allProjectsWithTeams);
      },
      error: (err) => console.error('Error fetching projects with teams:', err),
    });
  }
  loadEmployeeDailyUpdates(): void {
    this.dailyUpdateService.getUpdates().subscribe({
      next: (data) => {
        this.employeeUpdates = data;
        this.prepareChartData(data);
        console.log("Employee dially Update ", this.employeeUpdates);
      },
      error: (err) => console.error('Error fetching daily updates:', err),
    });
  }
  loadInterviews(): void {

    this.interviewService.getInterviews().subscribe((interviews: any[]) => {
      // Only show upcoming interviews (today or future)
      const now = new Date();
      const upcoming = interviews.filter(i => new Date(i.interview_date) >= now);
      console.log("Interviews List", interviews);
      this.interviewDataSource.data = upcoming;
      this.updateInterviewPagination();
    });

  }
  updateInterviewPagination(): void {
    if (!this.interviewPaginator) return;
    const pageIndex = this.interviewPaginator.pageIndex || 0;
    const pageSize = this.interviewPaginator.pageSize || 5;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    this.paginatedInterviews = this.interviewDataSource.data.slice(start, end);
  }
  updateFollowupPagination(): void {
    if (!this.followupPaginator) return;
    const pageIndex = this.followupPaginator.pageIndex || 0;
    const pageSize = this.followupPaginator.pageSize || 5;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    this.paginatedFollowups = this.todayFollowupsByBDE.slice(start, end);
  }

  updateAttendancePagination(): void {
    if (!this.attendancePaginator) return;
    const pageIndex = this.attendancePaginator.pageIndex || 0;
    const pageSize = this.attendancePaginator.pageSize || 5;
    const start = pageIndex * pageSize;
    const end = start + pageSize;
    this.paginatedAttendance = this.todayAttendance.slice(start, end);
  }

  prepareChartData(data: any[]) {
    // Group by employee_id and date (convert ISO date string to just date part)
    const grouped: { [employeeId: string]: { [date: string]: number } } = {};
    const employeeNames: { [id: string]: string } = {};

    // You probably want to map employee_id to employee_name (simplified here)
    // If you have an employee list, fetch names or keep in memory for mapping
    // For demo, let's assume employee_id = employee name as string
    data.forEach((entry) => {
      // const date = new Date(entry.update_date).toISOString().split('T')[0];
      const date = formatDate(entry.update_date, 'yyyy-MM-dd', 'en-IN');

      // formatDate(item.update_date, 'yyyy-MM-dd', 'en-IN')
      const empId = entry.employee_name?.toString?.() ?? 'Unknown';


      if (!grouped[empId]) grouped[empId] = {};
      if (!grouped[empId][date]) grouped[empId][date] = 0;
      grouped[empId][date]++;

      // Store employee name mapping if you have it
      employeeNames[empId] = `${empId}`;
    });

    // Extract all dates sorted
    const allDates = new Set<string>();
    Object.values(grouped).forEach((dateMap) =>
      Object.keys(dateMap).forEach((d) => allDates.add(d))
    );
    const sortedDates = Array.from(allDates).sort();

    // Build series for apexcharts
    this.chartSeries = Object.entries(grouped).map(([empId, dateMap]) => ({
      name: employeeNames[empId] || empId,
      data: sortedDates.map((date) => dateMap[date] || 0),
    }));

    // Set x-axis categories to sorted dates
    this.xaxis.categories = sortedDates;
  }
  loadProjects(): void {
    this.projectService.getAllProjects().subscribe({
      next: (data) => {
        this.allProjects = data;
        console.log('All Projects:', this.allProjects);
        this.prepareProjectStatusChart(data);
      },
      error: (err) => console.error('Error fetching projects :', err),
    });
  }
  prepareProjectStatusChart(projects: any[]) {
    const statusMap: { [key: string]: string } = {
      Active: 'Active',
      Completed: 'Completed',
      Running: 'Running',
      Pending: 'Pending',
      'Not Started': 'Not Started',  // 👈 map backend "NotStarted" to "Not Started"
      Canceled: 'Canceled',
    };

    const statusLabels = Object.keys(statusMap);
    const statusCounts: { [key: string]: number } = {};
    this.projectStatusMap = {};

    statusLabels.forEach(status => {
      statusCounts[status] = 0;
      this.projectStatusMap[status] = [];
    });

    projects.forEach(project => {
      const rawStatus = project.status?.trim();
      // find the display label that matches backend value
      const status = Object.entries(statusMap).find(([label, apiVal]) => apiVal === rawStatus)?.[0];

      if (status) {
        statusCounts[status]++;
        this.projectStatusMap[status].push(project.projectTitle || 'Unnamed Project');
      }
    });

    this.projectStatusLabels = statusLabels;
    this.projectStatusSeries = statusLabels.map(status => statusCounts[status]);
  }


  loadClients(): void {
    this.clientsService.getAllClients().subscribe({
      next: (data) => {
        this.allClients = data;
        console.log('All Clients:', this.allClients); // Also fixed log typo
        this.prepareClientCountryChart(data); // ✅ Correct method to call
      },
      error: (err) => console.error('Error fetching clients:', err),
    });
  }
  prepareClientCountryChart(clients: any[]): void {
    const countryCount: { [key: string]: number } = {};

    clients.forEach(client => {
      const country = client.country?.trim() || 'Unknown';
      countryCount[country] = (countryCount[country] || 0) + 1;
    });

    this.clientCountryXAxis.categories = Object.keys(countryCount);
    this.clientCountrySeries = [
      {
        name: 'Clients',
        data: Object.values(countryCount)
      }
    ];
  }

}
