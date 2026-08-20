export class EmployeeSalary {
  id: number;
  img: string;
  name: string;
  fullName: string;
  email: string;
  payslip: string;
  role: string;
  empID: string;
  department: string;
  salary: number;
  finalSalary: number;
  base_salary: number;
  unpaid_leave_days: number;
  year: number;
  month: number;
  generatedAt: string;
  // ✅ Add these new fields
  presentDays: number;
  absentDays: number;
  totalPresentDays: number;
  leaveDays: number;
  weekendDays: number;
  holidayDays?: number;
  totalPaidDays: number;
  employeeId: string;
  unpaidLeaveDays: number;
  paidLeaveDays: number;
  dailySalary: number;
  netSalary: number;
  leaveDeduction: number;
  halfDayDeduction?: number;
  presentDaySalary?: number;
  paidDaySalary?: number;
  salaryDeduction?: number;
  absentDayDeduction?: number;
  workingDays: number;
  totalDays: number;
  halfDays: number;
  sandwichDays?: number;
  totalLeaveDays?: number;
  totalWorkingDays?: number;
  addonAmount?: number;
  // added code below is — BDE incentive amount from employees table
  incentiveAmount?: number;
  constructor(employeeSalary: EmployeeSalary) {
    {
      this.id = employeeSalary.id || this.getRandomID();
      this.img = employeeSalary.img || 'assets/images/user/user1.jpg';
      this.name = employeeSalary.name || '';
      this.fullName = employeeSalary.fullName || '';
      this.email = employeeSalary.email || '';
      this.payslip = employeeSalary.payslip || '';
      this.role = employeeSalary.role || '';
      this.empID = employeeSalary.empID || '';
      this.department = employeeSalary.department || '';
      this.salary = Number(employeeSalary.salary) || 0;
      this.finalSalary = Number(employeeSalary.finalSalary) || 0;
      this.base_salary = Number(employeeSalary.base_salary) || 0;
      this.unpaid_leave_days = employeeSalary.unpaid_leave_days || 0;
      this.year = employeeSalary.year || 0;
      this.month = employeeSalary.month || 0;
      this.generatedAt = employeeSalary.generatedAt || '';
      this.presentDays = employeeSalary.presentDays || 0;
      this.absentDays = employeeSalary.absentDays || 0;
      this.totalPresentDays = employeeSalary.totalPresentDays || 0;
      this.leaveDays = employeeSalary.leaveDays || 0;
      this.weekendDays = employeeSalary.weekendDays || 0;
      this.totalPaidDays = employeeSalary.totalPaidDays || 0;
      this.employeeId = employeeSalary.employeeId || '';
      this.unpaidLeaveDays = employeeSalary.unpaidLeaveDays || 0;
      this.paidLeaveDays = employeeSalary.paidLeaveDays || 0;
      this.dailySalary = employeeSalary.dailySalary || 0;
      this.netSalary = employeeSalary.netSalary || 0;
      this.leaveDeduction = employeeSalary.leaveDeduction || 0;
      this.workingDays = employeeSalary.workingDays || 0;
      this.totalDays = employeeSalary.totalDays || 0;
      this.halfDays = employeeSalary.halfDays || 0;
      this.sandwichDays = employeeSalary.sandwichDays || 0;
      this.totalLeaveDays = employeeSalary.totalLeaveDays || 0;
      this.totalWorkingDays = employeeSalary.totalWorkingDays || 0;
      this.addonAmount = Number(employeeSalary.addonAmount) || 0;
      // added code below is
      this.incentiveAmount = Number(employeeSalary.incentiveAmount) || 0;
    }

  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
