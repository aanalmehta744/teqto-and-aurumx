import { formatDate } from '@angular/common';

export class Calendar {
  id: string;
  title: string;
  category: string;
  startDate: string;  // frontend-friendly
  endDate: string;    // frontend-friendly
  start_date: string; // backend-friendly
  end_date: string;   // backend-friendly
  details: string;
employee_id: string;

  constructor(calendar: Partial<Calendar> = {}) {
    const now = new Date();
    this.id = calendar.id || '';
    this.employee_id = calendar.employee_id || '';
    this.title = calendar.title || '';
    this.category = calendar.category || '';
    this.startDate = calendar.startDate || formatDate(now, 'yyyy-MM-ddTHH:mm:ss', 'en');
    this.endDate = calendar.endDate || formatDate(now, 'yyyy-MM-ddTHH:mm:ss', 'en');
    this.start_date = calendar.start_date || formatDate(now, 'yyyy-MM-dd HH:mm:ss', 'en'); // local backend format
    this.end_date = calendar.end_date || formatDate(now, 'yyyy-MM-dd HH:mm:ss', 'en');     // local backend format
    this.details = calendar.details || '';
  }

  public getRandomID(): number {
    const S4 = () => Math.floor((1 + Math.random()) * 0x10000);
    return S4() + S4();
  }
}
