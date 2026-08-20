import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { environment } from 'environments/environment';

@Component({
  selector: 'app-announcement-banner',
  templateUrl: './announcement-banner.component.html',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule, MatTooltipModule],
})
export class AnnouncementBannerComponent implements OnInit {
  announcements: any[] = [];
  canManage = false;
  currentUser: any = null;
  apiBase = environment.apiUrl;
  @Input() hideOwnAddButton = false;

  showForm = false;
  submitting = false;
  newTitle = '';
  newText = '';
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  private baseUrl = `${environment.apiUrl}/announcements`;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const role = (this.currentUser?.role || '').toLowerCase();
    const dept = (this.currentUser?.department || '').toLowerCase();
    this.canManage = role === 'admin' || dept === 'hr';
    this.loadAnnouncements();
  }

  loadAnnouncements(): void {
    this.http.get<any[]>(this.baseUrl).subscribe({
      next: (data) => (this.announcements = data),
      error: (err) => console.error('Error loading announcements:', err),
    });
  }

  onFileChange(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => (this.previewUrl = e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  submitAnnouncement(): void {
    if (!this.newText.trim()) return;
    this.submitting = true;

    const fd = new FormData();
    fd.append('title', this.newTitle.trim());
    fd.append('text', this.newText.trim());
    fd.append('created_by', this.currentUser?.id || '');
    if (this.selectedFile) fd.append('image', this.selectedFile);

    this.http.post(this.baseUrl, fd).subscribe({
      next: () => {
        this.showForm = false;
        this.newTitle = '';
        this.newText = '';
        this.selectedFile = null;
        this.previewUrl = null;
        this.submitting = false;
        this.loadAnnouncements();
      },
      error: (err) => {
        console.error('Error posting announcement:', err);
        this.submitting = false;
      },
    });
  }

  deleteAnnouncement(id: number): void {
    if (!confirm('Delete this announcement?')) return;
    this.http.delete(`${this.baseUrl}/${id}`).subscribe({
      next: () => this.loadAnnouncements(),
      error: (err) => console.error('Error deleting:', err),
    });
  }

  imageUrl(filename: string): string {
    if (filename?.startsWith('http')) return filename;
    return '';
  }

  cancelForm(): void {
    this.showForm = false;
    this.newTitle = '';
    this.newText = '';
    this.selectedFile = null;
    this.previewUrl = null;
  }
}
