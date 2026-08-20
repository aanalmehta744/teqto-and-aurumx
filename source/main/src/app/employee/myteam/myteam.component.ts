import { Component, OnInit } from '@angular/core';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { MyProjectsService } from '../my-projects/my-projects.service';
import { AuthService } from '@core';
import { CommonModule } from '@angular/common';

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

  constructor(
    private projectService: MyProjectsService
  ) { }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    this.projectService.getProjectTeam().subscribe((projects: any[]) => {
      // Directly assign all the projects to projects
      this.projects = projects;

      // Log the projects
      console.log(this.projects);
    });
  }

  getMemberImage(member: any): string {
    if (member.uploadImg?.startsWith('http')) return member.uploadImg;
    if (member.gender === 'Male') return 'assets/images/male-profile.png';
    if (member.gender === 'Female') return 'assets/images/female-profile.png';
    return 'assets/images/user/usrbig1.jpg';
  }
}
