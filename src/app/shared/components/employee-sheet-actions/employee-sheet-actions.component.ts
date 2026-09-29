import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import { environment } from 'environments/environment';

type SheetField = { key: string; label: string; required?: boolean };

@Component({
  selector: 'app-employee-sheet-actions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div *ngIf="canManage" class="flex flex-wrap gap-2">
      <button mat-stroked-button type="button" (click)="fileInput.click()" [disabled]="busy">
        <mat-icon>upload_file</mat-icon> Import Sheet
      </button>
      <input #fileInput type="file" class="hidden" accept=".xlsx,.xls,.csv" (change)="importFile($event)">
      <button *ngIf="exportEnabled" mat-stroked-button type="button" (click)="exportSheet()" [disabled]="busy">
        <mat-icon>download</mat-icon> Export Sheet
      </button>
    </div>
  `,
})
export class EmployeeSheetActionsComponent {
  @Input() exportEnabled = true;
  private readonly apiUrl = `${environment.apiUrl}/employees`;
  busy = false;
  canManage = false;

  private readonly fields: SheetField[] = [
    { key: 'fullName', label: 'Full Name', required: true },
    { key: 'email', label: 'Email', required: true },
    { key: 'mobile', label: 'Mobile', required: true },
    { key: 'gender', label: 'Gender', required: true },
    { key: 'password', label: 'Password', required: true },
    { key: 'department', label: 'Department', required: true },
    { key: 'dob', label: 'Date of Birth', required: true },
    { key: 'joining_date', label: 'Joining Date', required: true },
    { key: 'salary', label: 'Salary', required: true },
    { key: 'role', label: 'Role' },
    { key: 'employee_level', label: 'Employee Level' },
    { key: 'address', label: 'Address' },
    { key: 'status', label: 'Status' },
    { key: 'employment_type', label: 'Employment Type' },
    { key: 'termination_date', label: 'Termination Date' },
  ];

  constructor(private http: HttpClient) {
    try {
      const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
      this.canManage = String(user?.role || '').trim().toLowerCase() === 'admin' || String(user?.department || '').trim().toLowerCase() === 'hr';
    } catch {
      this.canManage = false;
    }
  }

  async importFile(event: Event): Promise<void> {
    if (!this.canManage) return;
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const matrix = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, defval: '' });
      const headers = (matrix[0] || []).map((value: any) => String(value).trim());
      const rows = matrix.slice(1).filter((row: any[]) => row.some(value => String(value ?? '').trim() !== ''));
      if (!headers.length || !rows.length) {
        await Swal.fire({ icon: 'warning', title: 'Empty sheet', text: 'The selected sheet has no employee rows.' });
        return;
      }

      const mapping = await this.chooseMapping(headers);
      if (!mapping) return;
      const mappedRows = rows.map((row: any[]) => this.mapRow(row, mapping));
      const missingRequired = this.fields.filter(field => field.required && mapping[field.key] === '');
      if (missingRequired.length) {
        await Swal.fire({ icon: 'error', title: 'Map required columns', text: `Map these required fields: ${missingRequired.map(field => field.label).join(', ')}.` });
        return;
      }

      this.busy = true;
      const existing = await firstValueFrom(this.http.get<any[]>(this.apiUrl));
      const emailKeys = new Set(existing.map(employee => this.cleanKey(employee.email)).filter(Boolean));
      let added = 0;
      let duplicates = 0;
      let invalid = 0;
      let failed = 0;
      let firstFailure = '';
      let firstInvalid = '';

      for (const row of mappedRows) {
        const employee = this.prepareEmployee(row);
        const validationError = this.employeeValidationError(employee);
        if (validationError) {
          invalid++;
          firstInvalid ||= validationError;
          continue;
        }
        const emailKey = this.cleanKey(employee['email']);
        if (emailKeys.has(emailKey)) {
          duplicates++;
          continue;
        }

        try {
          await firstValueFrom(this.http.post(this.apiUrl, this.toFormData(employee)));
          added++;
          emailKeys.add(emailKey);
        } catch (error: any) {
          const message = typeof error === 'string' ? error : error?.error?.message || error?.message || 'Unknown server error';
          if (/already exists|duplicate/i.test(message)) duplicates++;
          else {
            failed++;
            firstFailure ||= message;
          }
        }
      }

      this.busy = false;
      await Swal.fire({
        icon: failed ? 'error' : duplicates || invalid ? 'warning' : 'success',
        title: 'Import complete',
        text: `${added} employee(s) added, ${duplicates} existing email duplicate(s) skipped, ${invalid} invalid row(s) skipped${invalid ? `. First invalid row: ${firstInvalid}` : ''}${failed ? `. ${failed} row(s) failed. First server error: ${firstFailure}` : '.'}`,
      });
      if (added > 0) window.dispatchEvent(new Event('employee-sheet-imported'));
    } catch (error: any) {
      this.busy = false;
      await Swal.fire({ icon: 'error', title: 'Import failed', text: typeof error === 'string' ? error : error?.error?.message || 'Could not read or import this file.' });
    }
  }

  async exportSheet(): Promise<void> {
    if (!this.canManage) return;
    this.busy = true;
    try {
      const employees = await firstValueFrom(this.http.get<any[]>(this.apiUrl));
      const rows = employees.map(employee => ({
        'Full Name': employee.fullName || '',
        Email: employee.email || '',
        Mobile: employee.mobile || '',
        Gender: employee.gender || '',
        Department: employee.department || '',
        Designation: employee.employee_level || 'Intern',
        Role: employee.role || '',
        'Date of Birth': this.dateForSheet(employee.dob),
        'Joining Date': this.dateForSheet(employee.joining_date),
        Salary: employee.salary ?? '',
        Status: Number(employee.status) === 1 ? 'Active' : 'Inactive',
        'Employment Type': Number(employee.employment_type) === 1 ? 'Full-time' : 'Part-time',
        Address: employee.address || '',
        'Termination Date': this.dateForSheet(employee.termination_date),
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
      XLSX.writeFile(workbook, 'employees.xlsx');
    } catch (error: any) {
      await Swal.fire({ icon: 'error', title: 'Export failed', text: typeof error === 'string' ? error : 'Could not export employee data.' });
    } finally {
      this.busy = false;
    }
  }

  private async chooseMapping(headers: string[]): Promise<Record<string, string> | null> {
    const options = headers.map((header, index) => `<option value="${index}">${this.escapeHtml(header || `Column ${index + 1}`)}</option>`).join('');
    const fieldsHtml = this.fields.map(field => {
      const target = this.normalize(field.key);
      const match = headers.findIndex(header => this.normalize(header) === target || this.normalize(header) === this.normalize(field.label));
      return `<label style="display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:12px;margin:8px 0;text-align:left"><span>${this.escapeHtml(field.label)}${field.required ? ' *' : ''}</span><select id="map-${field.key}" class="swal2-select" style="width:100%;margin:0"><option value="">— Skip —</option>${options}</select></label><input type="hidden" id="guess-${field.key}" value="${match}">`;
    }).join('');

    const result = await Swal.fire({
      title: 'Map sheet columns',
      html: `<p style="text-align:left">Choose which sheet column matches each employee field. Fields marked * are required.</p><div style="max-height:55vh;overflow:auto;padding:0 4px">${fieldsHtml}</div>`,
      width: 720,
      showCancelButton: true,
      confirmButtonText: 'Continue',
      didOpen: () => this.fields.forEach(field => {
        const guess = (document.getElementById(`guess-${field.key}`) as HTMLInputElement)?.value;
        if (guess && Number(guess) >= 0) (document.getElementById(`map-${field.key}`) as HTMLSelectElement).value = guess;
      }),
      preConfirm: () => Object.fromEntries(this.fields.map(field => [field.key, (document.getElementById(`map-${field.key}`) as HTMLSelectElement).value])),
    });
    return result.isConfirmed ? result.value as Record<string, string> : null;
  }

  private mapRow(row: any[], mapping: Record<string, string>): Record<string, any> {
    return Object.fromEntries(this.fields.map(field => {
      const index = mapping[field.key];
      return [field.key, index === '' || index === undefined ? '' : row[Number(index)] ?? ''];
    }));
  }

  private prepareEmployee(row: Record<string, any>): Record<string, any> {
    return {
      ...row,
      fullName: String(row['fullName'] || '').trim(),
      email: String(row['email'] || '').trim(),
      mobile: this.canonicalMobile(row['mobile']),
      gender: String(row['gender'] || '').trim(),
      department: String(row['department'] || '').trim(),
      role: String(row['role'] || 'Employee').trim(),
      employee_level: ['Senior', 'Intern'].includes(String(row['employee_level'] || '').trim()) ? String(row['employee_level']).trim() : 'Intern',
      dob: this.toDateString(row['dob']),
      joining_date: this.toDateString(row['joining_date']),
      termination_date: this.toDateString(row['termination_date']),
      salary: Number(row['salary']),
      status: this.toBoolean(row['status'], true),
      employment_type: this.toBoolean(row['employment_type'], true),
      address: String(row['address'] || '').trim(),
      password: String(row['password'] ?? ''),
    };
  }

  private toFormData(employee: Record<string, any>): FormData {
    const body = new FormData();
    Object.entries(employee).forEach(([key, value]) => body.append(key, String(value ?? '')));
    return body;
  }

  private employeeValidationError(employee: Record<string, any>): string {
    if (!employee['fullName']) return 'Full Name is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(employee['email'])) return 'Email is missing or invalid.';
    if (!/^\d{10}$/.test(employee['mobile'])) return 'Mobile must contain 10 digits.';
    if (!employee['gender']) return 'Gender is required.';
    if (!employee['password'] || employee['password'].length < 6) return 'Password must contain at least 6 characters.';
    if (!employee['department']) return 'Department is required.';
    if (!employee['dob']) return 'Date of Birth is missing or invalid.';
    if (!employee['joining_date']) return 'Joining Date is missing or invalid.';
    if (!Number.isFinite(Number(employee['salary'])) || employee['salary'] < 1) return 'Salary must be a number greater than zero.';
    return '';
  }

  private toDateString(value: any): string {
    if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    const localDate = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (localDate) {
      const [, day, month, year] = localDate;
      const parsedDay = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
      if (parsedDay.getUTCDate() === Number(day) && parsedDay.getUTCMonth() === Number(month) - 1) return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    const parsed = new Date(raw);
    return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString().slice(0, 10);
  }

  private dateForSheet(value: any): string {
    const date = this.toDateString(value);
    return date;
  }

  private toBoolean(value: any, defaultValue: boolean): boolean {
    if (value === '' || value === null || value === undefined) return defaultValue;
    return ['1', 'true', 'yes', 'active', 'full-time', 'full time'].includes(String(value).trim().toLowerCase());
  }

  private cleanKey(value: any): string { return String(value ?? '').trim().toLowerCase(); }
  private canonicalMobile(value: any): string {
    const digits = String(value ?? '').replace(/\D/g, '');
    return digits.length > 10 ? digits.slice(-10) : digits;
  }
  private normalize(value: string): string { return value.toLowerCase().replace(/[^a-z0-9]/g, ''); }
  private escapeHtml(value: string): string {
    const escaped: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return value.replace(/[&<>"']/g, char => escaped[char]);
  }
}
