import { formatDate } from '@angular/common';

export class Leaves {
  id: number;
  employee_id: number;
  img: string;
  name: string;
  type: string;
  from: string;
  leaveTo: string;
  end_date: string;
  start_date: string;
  noOfDays: string;
  status: string;
  reason: string;
  note: string;
  leave_type: string;
  no_of_days: string;
  halfDay: string;
  sandwich_confirm: number;
  employee_name: string;
  employee_role: string;

  constructor(leaves: Partial<Leaves> = {}) {
    this.id = leaves.id || 0;
    this.employee_id = leaves.employee_id || 0;
    this.img = leaves.img || 'assets/images/user/usrbig1.jpg';
    this.name = leaves.name || '';
    this.type = leaves.type || '';
    this.leave_type = leaves.leave_type || '';
    this.from = leaves.from || formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.leaveTo = leaves.leaveTo || formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.end_date = leaves.end_date || formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.start_date = leaves.start_date || formatDate(new Date(), 'yyyy-MM-dd', 'en');
    this.reason = leaves.reason || '';
    this.noOfDays = leaves.noOfDays || '';
    this.status = leaves.status || '';
    this.note = leaves.note || '';
    this.no_of_days = leaves.no_of_days || '';
    this.halfDay = leaves.halfDay || '';
    this.sandwich_confirm = leaves.sandwich_confirm ?? 0;
    this.employee_name = leaves.employee_name || '';
    this.employee_role = leaves.employee_role || '';
  }

  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
