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
  clients: any[] = [];

  constructor(
    private projectService: MyProjectsService
  ) { }

  ngOnInit() {
    this.loadProjects();
  }

  loadProjects() {
    // NEW CODE: A BA is a team MEMBER of projects (not the client owner), so use the
    // membership-based source; BDE owns clients, so keep the client-ownership source.
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const isBA = String(user.department || '').trim().toLowerCase() === 'ba';
    const source$ = isBA
      ? this.projectService.getProjectTeamByMembership()
      : this.projectService.getProjectTeam();

    source$.subscribe((projects: any[]) => {
      // Group projects by client
      const grouped: any = {};

      projects.forEach(proj => {
        const clientId = proj.clientId || proj.fullName; // Use clientId if available
        if (!grouped[clientId]) {
          grouped[clientId] = {
            client: {
              fullName: proj.fullName,
              email: proj.email,
              mobile: proj.mobile,
              country: proj.country,
            },
            projects: []
          };
        }
        grouped[clientId].projects.push(proj);
      });

      // Convert to array for template iteration
      this.clients = Object.values(grouped);

      console.log(this.clients);
    });

  }

  getMemberImage(member: any): string {
    if (member.uploadImg?.startsWith('http')) return member.uploadImg;
    if (member.gender === 'Male') return 'assets/images/male-profile.png';
    if (member.gender === 'Female') return 'assets/images/female-profile.png';
    return 'assets/images/user/usrbig1.jpg';
  }
}