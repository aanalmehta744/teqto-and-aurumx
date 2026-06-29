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
  selector: 'app-meetings',
  templateUrl: './meetings.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, MatTableModule, MatIconModule, MatButtonModule],
})
export class MeetingsComponent implements OnInit {
  meetings: any[] = [];
  showForm = false;
  editMode = false;
  submitting = false;
  userId: number | null = null;
  private api = `${environment.apiUrl}/bde`;

  form = {
    meeting_id: null as number | null,
    client_name: '',
    meeting_date: '',
    meeting_time: '',
    meeting_mode: 'offline' as string,
    meeting_status: '' as string,
    meeting_outcome: '' as string,
    meeting_notes: '',
    next_meeting_date: '',
  };

  displayedColumns = ['client_name', 'meeting_date', 'meeting_mode', 'meeting_status', 'meeting_outcome', 'next_meeting_date', 'actions'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.userId = user?.id || null;
    if (this.userId) this.loadMeetings();
  }

  loadMeetings(): void {
    this.http.get<any[]>(`${this.api}/meetings/${this.userId}`).subscribe({
      next: (data) => (this.meetings = data),
      error: (err) => console.error('Error loading meetings:', err),
    });
  }

  openAdd(): void {
    this.editMode = false;
    this.form = { meeting_id: null, client_name: '', meeting_date: new Date().toISOString().split('T')[0], meeting_time: '', meeting_mode: 'offline', meeting_status: '', meeting_outcome: '', meeting_notes: '', next_meeting_date: '' };
    this.showForm = true;
  }

  openEdit(m: any): void {
    this.editMode = true;
    this.form = {
      meeting_id: m.meeting_id, client_name: m.client_name, meeting_date: m.meeting_date?.split('T')[0] || '',
      meeting_time: m.meeting_time || '', meeting_mode: m.meeting_mode || 'offline',
      meeting_status: m.meeting_status, meeting_outcome: m.meeting_outcome || '',
      meeting_notes: m.meeting_notes || '', next_meeting_date: m.next_meeting_date?.split('T')[0] || '',
    };
    this.showForm = true;
  }

  submit(): void {
    if (!this.form.client_name || !this.form.meeting_date || !this.form.meeting_status) return;
    this.submitting = true;
    const payload = { ...this.form, user_id: this.userId };

    const req = this.editMode
      ? this.http.put(`${this.api}/meetings/${this.form.meeting_id}`, payload)
      : this.http.post(`${this.api}/meetings`, payload);

    req.subscribe({
      next: () => { this.showForm = false; this.submitting = false; this.loadMeetings(); },
      error: (err) => { console.error(err); this.submitting = false; },
    });
  }

  delete(id: number): void {
    if (!confirm('Delete this meeting?')) return;
    this.http.delete(`${this.api}/meetings/${id}`).subscribe({
      next: () => this.loadMeetings(),
      error: (err) => console.error(err),
    });
  }

  cancel(): void { this.showForm = false; }
}
