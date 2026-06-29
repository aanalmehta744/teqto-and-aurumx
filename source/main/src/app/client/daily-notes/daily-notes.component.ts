import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-daily-notes',
  templateUrl: './daily-notes.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  providers: [DatePipe],
})
export class DailyNotesComponent implements OnInit {
  bdeId: number = 0;
  stats = { total: 0, hot: 0, cold: 0, closed: 0, close_rate: 0 };
  clients: any[] = [];

  filterStatus = '';
  filterDate = '';
  filterSearch = '';

  selectedClient: any = null;
  clientNotes: any[] = [];

  newNote = { note_text: '', mood: 'neutral', next_action: '' };
  addingFor: number | null = null;
  saving = false;

  editingNote: any = null;

  moodOptions = [
    { value: 'positive', label: 'Positive', color: 'text-green-600', bg: 'bg-green-100', icon: '😊' },
    { value: 'neutral',  label: 'Neutral',  color: 'text-yellow-600', bg: 'bg-yellow-100', icon: '😐' },
    { value: 'negative', label: 'Negative', color: 'text-red-600', bg: 'bg-red-100', icon: '😟' },
  ];

  constructor(private http: HttpClient, private datePipe: DatePipe) {}

  ngOnInit() {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.bdeId = user.id;
    this.filterDate = this.datePipe.transform(new Date(), 'yyyy-MM-dd') || '';
    this.loadDashboard();
  }

  loadDashboard() {
    const params: any = { bde_id: this.bdeId };
    if (this.filterStatus) params.status = this.filterStatus;
    if (this.filterSearch) params.search = this.filterSearch;
    if (this.filterDate) params.date = this.filterDate;

    this.http.get<any>(`${environment.apiUrl}/client-daily-notes/dashboard`, { params })
      .subscribe({ next: d => { this.stats = d.stats; this.clients = d.clients; }, error: () => {} });
  }

  clearDateFilter() {
    this.filterDate = '';
    this.loadDashboard();
  }

  selectClient(client: any) {
    if (this.selectedClient?.id === client.id) {
      this.selectedClient = null;
      this.clientNotes = [];
      return;
    }
    this.selectedClient = client;
    this.addingFor = null;
    this.loadNotes(client.id);
  }

  loadNotes(clientId: number) {
    this.http.get<any[]>(`${environment.apiUrl}/client-daily-notes/notes/${clientId}`)
      .subscribe({ next: d => this.clientNotes = d, error: () => {} });
  }

  openAddNote(clientId: number) {
    this.addingFor = clientId;
    this.newNote = {
      note_text: '',
      mood: 'neutral',
      next_action: ''
    };
  }

  saveNote() {
    if (!this.newNote.note_text.trim() || !this.addingFor) return;
    this.saving = true;
    const payload = {
      client_id: this.addingFor,
      bde_id: this.bdeId,
      note_date: this.datePipe.transform(new Date(), 'yyyy-MM-dd'),
      ...this.newNote,
    };
    this.http.post(`${environment.apiUrl}/client-daily-notes/notes`, payload)
      .subscribe({
        next: () => {
          this.saving = false;
          this.addingFor = null;
          if (this.selectedClient?.id === payload.client_id) this.loadNotes(payload.client_id);
          this.loadDashboard();
        },
        error: () => { this.saving = false; }
      });
  }

  startEdit(note: any) {
    this.editingNote = { ...note };
  }

  saveEdit() {
    if (!this.editingNote) return;
    this.http.put(`${environment.apiUrl}/client-daily-notes/notes/${this.editingNote.id}`, {
      note_text: this.editingNote.note_text,
      mood: this.editingNote.mood,
      next_action: this.editingNote.next_action,
    }).subscribe({
      next: () => {
        this.editingNote = null;
        if (this.selectedClient) this.loadNotes(this.selectedClient.id);
        this.loadDashboard();
      },
      error: () => {}
    });
  }

  deleteNote(id: number) {
    if (!confirm('Delete this note?')) return;
    this.http.delete(`${environment.apiUrl}/client-daily-notes/notes/${id}`)
      .subscribe({
        next: () => {
          if (this.selectedClient) this.loadNotes(this.selectedClient.id);
          this.loadDashboard();
        },
        error: () => {}
      });
  }

  moodFor(val: string) {
    return this.moodOptions.find(m => m.value === val) || this.moodOptions[1];
  }

  statusColor(type: string) {
    return type === 'Close' ? 'bg-green-100 text-green-700'
         : type === 'Hot'   ? 'bg-red-100 text-red-700'
         : 'bg-blue-100 text-blue-700';
  }
}
