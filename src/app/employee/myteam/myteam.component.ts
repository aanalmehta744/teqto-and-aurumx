import { Component, OnInit } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { MyProjectsService } from '../my-projects/my-projects.service';
import { AuthService } from '@core';
import { CommonModule } from '@angular/common';
import { TodayService } from '../attendance/today/today.service';
import { LeavesService } from 'app/admin/leaves/leave-requests/leaves.service';

@Component({
  selector: 'app-myteam',
  templateUrl: './myteam.component.html',
  styleUrls: ['./myteam.component.scss'],
  standalone: true,
  imports: [BreadcrumbComponent, CommonModule,],
})
export class MyTeamsComponent implements OnInit {
  userId: number = 0;
  projects: any[] = [];

  // Ids of employees who are present / on approved leave today
  private presentIds = new Set<number>();
  private onLeaveIds = new Set<number>();
  private isWeekendToday = false;

  constructor(
    private projectService: MyProjectsService,
    private todayService: TodayService,
    private leavesService: LeavesService,
  ) { }

  ngOnInit() {
    this.loadProjects();
    this.loadAttendanceToday();
    this.loadApprovedLeavesToday();
    const day = new Date().getDay();
    this.isWeekendToday = day === 0 || day === 6;
  }

  loadProjects() {
    this.projectService.getProjectTeam().subscribe((projects: any[]) => {
      // Directly assign all the projects to projects
      this.projects = projects;

      // Log the projects
      console.log(this.projects);
    });
  }

  // Build the set of employees who logged attendance (present/half day) today
  loadAttendanceToday() {
    this.todayService.getTodayAttendacves().subscribe({
      next: (records: any[]) => {
        this.presentIds = new Set(
          (records || [])
            .filter((r) => r.status === 'Present' || r.status === 'Half Day')
            .map((r) => Number(r.employee_id)),
        );
      },
      error: (err) => console.error('Error fetching today attendance:', err),
    });
  }

  // Build the set of employees on approved leave covering today
  loadApprovedLeavesToday() {
    this.leavesService.getTodayLeaves().subscribe({
      next: (leaves: any[]) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        this.onLeaveIds = new Set(
          (leaves || [])
            .filter((l) => {
              if (l.status !== 'Approved') return false;
              const start = new Date(l.start_date);
              const end = new Date(l.end_date);
              if (isNaN(start.getTime()) || isNaN(end.getTime())) return false;
              start.setHours(0, 0, 0, 0);
              end.setHours(0, 0, 0, 0);
              return start <= today && end >= today;
            })
            .map((l) => Number(l.employee_id)),
        );
      },
      error: (err) => console.error('Error fetching leaves:', err),
    });
  }

  // A team member is absent today if not present and not on approved leave (skips weekends)
  isAbsentToday(member: any): boolean {
    if (this.isWeekendToday || !member?.id) return false;
    const id = Number(member.id);
    return !this.presentIds.has(id) && !this.onLeaveIds.has(id);
  }

  getMemberImage(member: any): string {
    if (member.uploadImg?.startsWith('http')) return member.uploadImg;
    if (member.gender === 'Male') return 'assets/images/male-profile.png';
    if (member.gender === 'Female') return 'assets/images/female-profile.png';
    return 'assets/images/user/usrbig1.jpg';
  }
}
