export class LeaveBalance {
  id: number;
  img: string;
  name: string;
  prev: string;
  current: string;
  total: string;
  used: string;
  accepted: string;
  rejected: string;
  expired: string;
  carryOver: string;
  employee_id: number;
  fullName: string;
  leave_balance: number;
  used_unpaid_leave: number;
  used_sick_leave: number;
  total_paid_leave: number;
  used_paid_leave: number;
  current_balance: number;

  constructor(leaves: LeaveBalance) {
    {
      this.id = leaves.id || this.getRandomID();
      this.img = leaves.img || 'assets/images/user/usrbig1.jpg';
      this.name = leaves.name || '';
      this.prev = leaves.prev || '';
      this.current = leaves.current || '';
      this.total = leaves.total || '';
      this.used = leaves.used || '';
      this.accepted = leaves.accepted || '';
      this.rejected = leaves.rejected || '';
      this.expired = leaves.expired || '';
      this.carryOver = leaves.carryOver || '';
      this.leave_balance = leaves.leave_balance || 0;
      this.fullName = leaves.fullName || '';
      this.employee_id = leaves.employee_id || 0;
      this.used_unpaid_leave = leaves.used_unpaid_leave || 0;
      this.used_sick_leave = leaves.used_sick_leave || 0;
      this.total_paid_leave = leaves.total_paid_leave || 0;
      this.used_paid_leave = leaves.used_paid_leave || 0;
      this.current_balance = leaves.current_balance || 0;
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
