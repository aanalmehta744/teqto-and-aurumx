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
  selector: 'app-calls',
  templateUrl: './calls.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, MatTableModule, MatIconModule, MatButtonModule],
})
export class CallsComponent implements OnInit {
  calls: any[] = [];
  showForm = false;
  editMode = false;
  submitting = false;
  userId: number | null = null;
  private api = `${environment.apiUrl}/bde`;

  form = {
    call_id: null as number | null,
    customer_name: '',
    phone_number: '',
    call_date: '',
    call_duration: '',
    call_status: '' as string,
    call_outcome: '' as string,
    call_notes: '',
    next_action_date: '',
  };

  displayedColumns = ['customer_name', 'phone_number', 'call_date', 'call_status', 'call_outcome', 'call_duration', 'next_action_date', 'actions'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.userId = user?.id || null;
    if (this.userId) this.loadCalls();
  }

  loadCalls(): void {
    this.http.get<any[]>(`${this.api}/calls/${this.userId}`).subscribe({
      next: (data) => (this.calls = data),
      error: (err) => console.error('Error loading calls:', err),
    });
  }

  openAdd(): void {
    this.editMode = false;
    this.form = { call_id: null, customer_name: '', phone_number: '', call_date: new Date().toISOString().split('T')[0], call_duration: '', call_status: '', call_outcome: '', call_notes: '', next_action_date: '' };
    this.showForm = true;
  }

  openEdit(c: any): void {
    this.editMode = true;
    this.form = {
      call_id: c.call_id, customer_name: c.customer_name, phone_number: c.phone_number || '',
      call_date: c.call_date?.split('T')[0] || '', call_duration: c.call_duration || '',
      call_status: c.call_status, call_outcome: c.call_outcome || '',
      call_notes: c.call_notes || '', next_action_date: c.next_action_date?.split('T')[0] || '',
    };
    this.showForm = true;
  }

  submit(): void {
    if (!this.form.customer_name || !this.form.call_date || !this.form.call_status) return;
    this.submitting = true;
    const payload = { ...this.form, user_id: this.userId };

    const req = this.editMode
      ? this.http.put(`${this.api}/calls/${this.form.call_id}`, payload)
      : this.http.post(`${this.api}/calls`, payload);

    req.subscribe({
      next: () => { this.showForm = false; this.submitting = false; this.loadCalls(); },
      error: (err) => { console.error(err); this.submitting = false; },
    });
  }

  delete(id: number): void {
    if (!confirm('Delete this call log?')) return;
    this.http.delete(`${this.api}/calls/${id}`).subscribe({
      next: () => this.loadCalls(),
      error: (err) => console.error(err),
    });
  }

  cancel(): void { this.showForm = false; }
}
