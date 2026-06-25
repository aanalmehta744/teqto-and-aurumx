import { formatDate } from '@angular/common';
export class Employees {
  id: number;
  img: string;
  name: string;
  fullName: string;
  email: string;
  date: string;
  role: string;
  mobile: string;
  department: string;
  degree: string;
  gender: string;
  address: string;
  joining_date: string;
  salary: string;
  dob: string;
  uploadImg: string;
  password: string;
  aadharCard: number;
  panCard: string;
  status: number;
  employment_type: string;
  termination_date: string;
  constructor(employees: Employees) {
    {
      this.id = employees.id;
      this.img = employees.img || 'assets/images/user/user1.jpg';
      this.name = employees.name || '';
      this.email = employees.email || '';
      this.date = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.dob = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.joining_date = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.role = employees.role || '';
      this.mobile = employees.mobile || '';
      this.department = employees.department || '';
      this.degree = employees.degree || '';
      this.gender = employees.gender || '';
      this.address = employees.address || '';
      this.salary = employees.salary || '';
      this.uploadImg = employees.uploadImg || '';
      this.fullName = employees.fullName || '';
      this.password = employees.password || '';
      this.aadharCard = employees.aadharCard || 0;
      this.panCard = employees.panCard || '';
      this.status = employees.status || 0;
      this.employment_type = employees.employment_type || '';
      this.termination_date = employees.termination_date || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
