import { formatDate } from '@angular/common';
export class MyProjects {
  id: number;
  projectTitle: string;
  clientName: string;
  startDate: string;
  endDate: string;
  deadLine: string;
  noOfMembers: string;
  priority: string;
  progress: string;
  status: string;
  description: string;
  teamName: string;

  constructor(myProjects: MyProjects) {
    {
      this.id = myProjects.id || this.getRandomID();
      this.projectTitle = myProjects.projectTitle;
      this.clientName = myProjects.clientName || '';
      this.startDate = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.endDate = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.deadLine = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.noOfMembers = myProjects.noOfMembers || '';
      this.priority = myProjects.priority || '';
      this.progress = myProjects.progress || '';
      this.status = myProjects.status || '';
      this.description = myProjects.description || '';
      this.teamName = myProjects.teamName || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
