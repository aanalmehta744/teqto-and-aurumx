import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { BreadcrumbComponent } from '@shared/components/breadcrumb/breadcrumb.component';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-kpi-master',
  templateUrl: './kpi-master.component.html',
  standalone: true,
  imports: [
    CommonModule, FormsModule, BreadcrumbComponent,
    MatTableModule, MatIconModule, MatButtonModule,
    MatSelectModule, MatFormFieldModule, MatInputModule, MatTooltipModule,
  ],
})
export class KpiMasterComponent implements OnInit {
  kpis: any[] = [];
  showForm = false;
  editMode = false;
  submitting = false;
  currentUser: any;
  private api = `${environment.apiUrl}/kpi/master`;

  form = {
    kpi_id: null as number | null,
    kpi_name: '',
    kpi_description: '',
    unit: '',
    kpi_type: '' as string,
    is_active: 1,
  };

  kpiTypes = [
    { value: 'calls', label: 'Calls' },
    { value: 'meetings', label: 'Meetings' },
    { value: 'conversions_count', label: 'Conversions (Count)' },
    { value: 'conversions_revenue', label: 'Conversions (Revenue ₹)' },
  ];

  displayedColumns = ['kpi_name', 'kpi_type', 'unit', 'is_active', 'actions'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.loadKpis();
  }

  loadKpis(): void {
    this.http.get<any[]>(this.api).subscribe({
      next: (data) => (this.kpis = data),
      error: (err) => console.error('Error loading KPIs:', err),
    });
  }

  openAdd(): void {
    this.editMode = false;
    this.form = { kpi_id: null, kpi_name: '', kpi_description: '', unit: '', kpi_type: '', is_active: 1 };
    this.showForm = true;
  }

  openEdit(kpi: any): void {
    this.editMode = true;
    this.form = {
      kpi_id: kpi.kpi_id,
      kpi_name: kpi.kpi_name,
      kpi_description: kpi.kpi_description || '',
      unit: kpi.unit,
      kpi_type: kpi.kpi_type,
      is_active: kpi.is_active,
    };
    this.showForm = true;
  }

  submit(): void {
    if (!this.form.kpi_name || !this.form.unit || !this.form.kpi_type) return;
    this.submitting = true;
    const payload = { ...this.form, created_by: this.currentUser?.id };

    const req = this.editMode
      ? this.http.put(`${this.api}/${this.form.kpi_id}`, payload)
      : this.http.post(this.api, payload);

    req.subscribe({
      next: () => { this.showForm = false; this.submitting = false; this.loadKpis(); },
      error: (err) => { console.error(err); this.submitting = false; },
    });
  }

  delete(id: number): void {
    if (!confirm('Delete this KPI?')) return;
    this.http.delete(`${this.api}/${id}`).subscribe({
      next: () => this.loadKpis(),
      error: (err) => console.error(err),
    });
  }

  kpiTypeLabel(type: string): string {
    return this.kpiTypes.find(t => t.value === type)?.label || type;
  }

  cancel(): void { this.showForm = false; }
}
