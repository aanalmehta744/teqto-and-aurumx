export class MyLeaves {
  id: number;
  halfDay: string;
  applyDate: string;
  start_date: string;
  end_date: string;
  reason: string;
  leave_type: string;
  status: string;
  no_of_days: number;
  constructor(myLeaves: MyLeaves) {
    {
      this.id = myLeaves.id;
      this.halfDay = myLeaves.halfDay || '';
      this.applyDate = myLeaves.applyDate || '';
      this.start_date = myLeaves.start_date || '';
      this.end_date = myLeaves.end_date || '';
      this.reason = myLeaves.reason || '';
      this.leave_type = myLeaves.leave_type || '';
      this.status = myLeaves.status || '';
      this.no_of_days = myLeaves.no_of_days || 0;
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
