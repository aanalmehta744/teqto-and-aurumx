import { formatDate } from '@angular/common';
export class Attendances {
  id: number;
  date: string;
  check_in: string;
  break: string;
  check_out: string;
  hours: string;
  status: string;
  details: string;
  isPaused?: boolean;
  is_paused?: number;
  elapsedTime?: string;
  pause_start?: string;

  constructor(attendances: Attendances) {
    {
      this.id = attendances.id || this.getRandomID();
      this.date = attendances.date;
      this.check_in = attendances.check_in || '';
      this.break = attendances.break || '';
      this.check_out = attendances.check_out || '';
      this.hours = attendances.hours || '';
      this.status = attendances.status || '';
      this.details = attendances.details || '';
    }
  }
  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
