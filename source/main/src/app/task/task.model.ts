// import { formatDate } from '@angular/common';
// export class Task {
//   id: number;
//   employee_id: number;
//   project_id: number;
//   img: string;
//   name: string;
//   title: string;
//   done: boolean;
//   note: string;
//   priority: string;
//   due_date: string;
//   status: string;
//   trainer_project_name: string;
//   constructor(appointment: Task) {
//     {
//       this.id = appointment.id || 0;
//       this.employee_id = appointment.employee_id || 0;
//       this.project_id = appointment.project_id || 0;
//       this.img = appointment.img || 'assets/images/user/user1.jpg';
//       this.name = appointment.name || '';
//       this.title = appointment.title || '';
//       this.done = appointment.done || true;
//       this.due_date = formatDate(new Date(), 'yyyy-MM-dd', 'en') || '';
//       this.note = appointment.note || '';
//       this.priority = appointment.priority || '';
//       this.status = appointment.status || '';
//       this.trainer_project_name = appointment.trainer_project_name || '';
//     }
//   }
//   public getRandomID(): string {
//     const S4 = () => {
//       return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
//     };
//     return S4() + S4();
//   }
// }

import { formatDate } from '@angular/common';

export class Task {

  id: number;
  employee_id: number;
  // project_id: number | null;
  project_id: number | null;

  img: string;
  name: string;
  title: string;
  done: boolean;
  note: string;
  priority: string;
  due_date: string;
  status: string;
  trainer_project_name: string;

  constructor(appointment: Task) {

    this.id = appointment.id || 0;

    this.employee_id = appointment.employee_id || 0;

    // IMPORTANT:
    // Keep null when task has no project.
    this.project_id =
      appointment.project_id ?? null;
      

    this.img =
      appointment.img ||
      'assets/images/user/user1.jpg';

    this.name =
      appointment.name || '';

    this.title =
      appointment.title || '';

    this.done =
      appointment.done ?? true;

    this.due_date =
      appointment.due_date ||
      formatDate(
        new Date(),
        'yyyy-MM-dd',
        'en'
      );

    this.note =
      appointment.note || '';

    this.priority =
      appointment.priority || '';

    this.status =
      appointment.status || '';

    this.trainer_project_name =
      appointment.trainer_project_name || '';
  }

  public getRandomID(): string {

    const S4 = () => {
      return (
        ((1 + Math.random()) * 0x10000) |
        0
      )
        .toString(16)
        .substring(1);
    };

    return S4() + S4();
  }
}