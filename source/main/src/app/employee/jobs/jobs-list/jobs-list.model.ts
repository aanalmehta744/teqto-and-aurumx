import { formatDate } from '@angular/common';
export class JobsList {
  id: number;
  title: string;
  status: string;
  date: string;
  role: string;
  vacancies: string;
  closedVacancies: string;
  department: string;
  jobType: string;
  description: string;
  constructor(jobsList: JobsList) {
    {
      this.id = jobsList.id || this.getRandomID();
      this.title = jobsList.title || '';
      this.status = jobsList.status || '';
      this.date = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.role = jobsList.role || '';
      this.vacancies = jobsList.vacancies || '';
      this.closedVacancies = jobsList.closedVacancies || '';
      this.department = jobsList.department || '';
      this.jobType = jobsList.jobType || '';
      this.description = jobsList.description || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
