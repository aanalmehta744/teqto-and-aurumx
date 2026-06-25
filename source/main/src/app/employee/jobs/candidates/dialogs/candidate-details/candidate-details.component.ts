import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CandidatesService } from '../../candidates.service';
import { Candidates } from '../../candidates.model';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { MatIconModule } from '@angular/material/icon';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-candidate-details',
  standalone: true,
  imports: [CommonModule, BreadcrumbComponent, MatIconModule],
  templateUrl: './candidate-details.component.html',
  styleUrls: ['./candidate-details.component.scss']

})
export class CandidateDetailsComponent implements OnInit {
  candidateId!: number;
  candidate!: Candidates;

  statusOrder = ['new', 'screening', 'interviewing', 'offered', 'hired', 'rejected', 'backout'];
  displayedStatuses: string[] = [];

  constructor(private route: ActivatedRoute, private candidateService: CandidatesService) { }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.candidateId = +id;
        this.getCandidateDetails(this.candidateId);
      }
    });
  }

  getCandidateDetails(id: number): void {
    this.candidateService.getCandidateById(id).subscribe({
      next: (res) => {
        this.candidate = res;
        console.log("Selected candidate ", this.candidate);
        this.prepareStatusDisplay();
      },
      error: (err) => {
        console.error('Failed to fetch candidate:', err);
      }
    });
  }

  prepareStatusDisplay() {
    if (!this.candidate) return;

    const currentStatus = (this.candidate.status || '').trim().toLowerCase();
    const previousStatus = (this.candidate.previous_status || '').trim().toLowerCase();

    console.log('Current:', currentStatus);
    console.log('Previous:', previousStatus);

    if (currentStatus === 'rejected') {
      const prevIndex = this.statusOrder.indexOf(previousStatus);
      this.displayedStatuses = prevIndex >= 0 ? this.statusOrder.slice(0, prevIndex + 1) : [];
      this.displayedStatuses.push('rejected');  // Show only up to previous + rejected
    } else if (currentStatus === 'backout') {
      const prevIndex = this.statusOrder.indexOf(previousStatus);
      this.displayedStatuses = prevIndex >= 0 ? this.statusOrder.slice(0, prevIndex + 1) : [];
      this.displayedStatuses.push('backout');   // 👈 new backout flow
    }
    else if (this.statusOrder.includes(currentStatus)) {
      // Show full status except exclude 'rejected'
      this.displayedStatuses = this.statusOrder.filter(status => status !== 'rejected' && status !== 'backout');
    } else {
      console.warn('Current status not recognized:', currentStatus);
      this.displayedStatuses = this.statusOrder.filter(status => status !== 'rejected');
    }

    console.log('Displayed Statuses:', this.displayedStatuses);
  }

  getStatusClass(status: string): string {
    if (!this.candidate) return 'badge-passed';

    const currentStatus = (this.candidate.status || '').toLowerCase();
    const previousStatus = (this.candidate.previous_status || '').toLowerCase();

    const statusIndex = this.statusOrder.indexOf(status);
    const currentIndex = this.statusOrder.indexOf(currentStatus);
    const previousIndex = this.statusOrder.indexOf(previousStatus);

    if (status === 'rejected' && currentStatus === 'rejected') {
      return 'badge-rejected';       // red for current rejected
    }

    if (status === 'backout' && currentStatus === 'backout') {
      return 'badge-backout'; // 👈 orange (or any highlight you choose)
    }

    if (status === currentStatus) {
      return 'badge-active';         // blue for current
    }

    // All statuses before or equal to previous status are green
    if (previousIndex >= 0 && statusIndex >= 0 && statusIndex <= previousIndex) {
      return 'badge-previous';       // green for previous and all before it
    }

    // All others gray
    return 'badge-passed';
  }
  getResumeUrl(fileName: string): string {
    const baseUrl = environment.apiUrl.replace(/\/api$/, ''); // remove trailing /api
    return `${baseUrl}/uploads/resumes/${fileName}`;
  }
}
