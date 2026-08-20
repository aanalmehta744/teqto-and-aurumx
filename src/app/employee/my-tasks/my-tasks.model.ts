import { formatDate } from '@angular/common';
export class MyTasks {
  id: number;
  taskNo: string;
  title: string;
  projectTitle: string;
  client: string;
  status: string;
  priority: string;
  type: string;
  executor: string;
  date: string;
  details: string;
  note: string;
  create_date: string;
  due_date: string;
  done: number;
  employee_name: string;
  trainer_project_name: string;
  constructor(myTasks: MyTasks) {
    {
      this.id = myTasks.id || this.getRandomID();
      this.taskNo = myTasks.taskNo || '';
      this.title = myTasks.title || '';
      this.projectTitle = myTasks.projectTitle || '';
      this.client = myTasks.client || '';
      this.status = myTasks.status || '';
      this.priority = myTasks.priority || '';
      this.type = myTasks.type || '';
      this.executor = myTasks.executor || '';
      this.date = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
      this.details = myTasks.details || '';
      this.note = myTasks.note || '';
      this.create_date = myTasks.create_date || '';
      this.done = myTasks.done || 0;
      this.due_date = myTasks.due_date || '';
      this.employee_name = myTasks.employee_name || '';
      this.trainer_project_name = myTasks.trainer_project_name || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
