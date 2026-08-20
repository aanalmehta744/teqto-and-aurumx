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
  selector: 'app-deals',
  templateUrl: './deals.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, BreadcrumbComponent, MatTableModule, MatIconModule, MatButtonModule],
})
export class DealsComponent implements OnInit {
  deals: any[] = [];
  dealsWon = 0;
  dealsLost = 0;
  showForm = false;
  editMode = false;
  submitting = false;
  userId: number | null = null;
  private api = `${environment.apiUrl}/bde`;

  form = {
    conversion_id: null as number | null,
    client_name: '',
    deal_value: null as number | null,
    client_type: '' as string,
    product_service: '',
    conversion_status: '' as string,
    conversion_date: '',
    closing_notes: '',
    lost_reason: '',
  };

  readonly clientTypeOptions = [
    { value: 'full_time', label: 'Full Time Client' },
    { value: 'part_time', label: 'Part Time Client' },
    { value: 'hourly', label: 'Hourly Client' },
    { value: 'project_base', label: 'Project Based' },
  ];

  displayedColumns = ['client_name', 'client_type', 'deal_value', 'product_service', 'conversion_status', 'conversion_date', 'actions'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.userId = user?.id || null;
    if (this.userId) this.loadDeals();
  }

  loadDeals(): void {
    this.http.get<any[]>(`${this.api}/deals/${this.userId}`).subscribe({
      next: (data) => {
        this.deals = data;
        this.dealsWon = data.filter(d => d.conversion_status === 'won').length;
        this.dealsLost = data.filter(d => d.conversion_status === 'lost').length;
      },
      error: (err) => console.error('Error loading deals:', err),
    });
  }

  openAdd(): void {
    this.editMode = false;
    this.form = { conversion_id: null, client_name: '', deal_value: null, client_type: '', product_service: '', conversion_status: '', conversion_date: new Date().toISOString().split('T')[0], closing_notes: '', lost_reason: '' };
    this.showForm = true;
  }

  openEdit(d: any): void {
    this.editMode = true;
    this.form = {
      conversion_id: d.conversion_id, client_name: d.client_name, deal_value: d.deal_value,
      client_type: d.client_type || '', product_service: d.product_service || '',
      conversion_status: d.conversion_status,
      conversion_date: d.conversion_date?.split('T')[0] || '', closing_notes: d.closing_notes || '',
      lost_reason: d.lost_reason || '',
    };
    this.showForm = true;
  }

  labelForType(type: string): string {
    return this.clientTypeOptions.find(o => o.value === type)?.label || '--';
  }

  submit(): void {
    if (!this.form.client_name || !this.form.conversion_status || !this.form.conversion_date) return;
    this.submitting = true;
    const payload = { ...this.form, user_id: this.userId };

    const req = this.editMode
      ? this.http.put(`${this.api}/deals/${this.form.conversion_id}`, payload)
      : this.http.post(`${this.api}/deals`, payload);

    req.subscribe({
      next: () => { this.showForm = false; this.submitting = false; this.loadDeals(); },
      error: (err) => { console.error(err); this.submitting = false; },
    });
  }

  delete(id: number): void {
    if (!confirm('Delete this deal?')) return;
    this.http.delete(`${this.api}/deals/${id}`).subscribe({
      next: () => this.loadDeals(),
      error: (err) => console.error(err),
    });
  }

  totalRevenue(): number {
    return this.deals.filter(d => d.conversion_status === 'won').reduce((sum, d) => sum + (d.deal_value || 0), 0);
  }

  cancel(): void { this.showForm = false; }
}
