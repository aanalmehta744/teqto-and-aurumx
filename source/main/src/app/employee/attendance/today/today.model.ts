// export class Today {
//   id: number;
//   img: string;
//   name: string;
//   first_in: string;
//   break: string;
//   last_out: string;
//   total: string;
//   status: string;
//   shift: string;
//   role: string;

//   constructor(today: Today) {
//     {
//       this.id = today.id || this.getRandomID();
//       this.img = today.img || 'assets/images/user/usrbig1.jpg';
//       this.name = today.name || '';
//       this.first_in = today.first_in || '';
//       this.break = today.break || '';
//       this.last_out = today.last_out || '';
//       this.total = today.total || '';
//       this.status = today.status || '';
//       this.shift = today.shift || '';
//       this.role = today.role || '';
//     }
//   }
//   public getRandomID(): number {
//     const S4 = () => {
//       return ((1 + Math.random()) * 0x10000) | 0;
//     };
//     return S4() + S4();
//   }
// }

export interface PauseHistory {
  id: number;
  pause_start: string;
  pause_end: string | null;
  duration: string | null;
}

export class Today {
  id: number;
  img: string;
  employee_id: number;
  name: string;
  fullName?: string;
  first_in: string;
  break: string;
  last_out: string;
  total: string;
  status: string;
  shift: string;
  role: string;
  pause_start?: string;
  pause_history: PauseHistory[];

  constructor(today: Today) {
    this.id = today.id || this.getRandomID();
    this.employee_id = today.employee_id || 0;
    this.img = today.img || 'assets/images/user/usrbig1.jpg';
    this.name = today.name || '';
    this.fullName = today.fullName || '';
    this.first_in = today.first_in || '';
    this.break = today.break || '';
    this.last_out = today.last_out || '';
    this.total = today.total || '';
    this.status = today.status || '';
    this.shift = today.shift || '';
    this.role = today.role || '';

    this.pause_start = today.pause_start || '';

    this.pause_history = today.pause_history || [];
  }

  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };

    return S4() + S4();
  }
}