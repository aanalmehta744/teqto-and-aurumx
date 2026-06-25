export class Candidates {
  id: number;
  full_name: string;
  img: string;
  mobile: string;
  email: string;
  linkedin: string;
  address: string;
  gender: string;
  experience: string;
  last_company: string;
  last_ctc: string;
  resume: string;
  created_at: string;
  job_id: string;
  status: string;
  previous_status: string;
  title: string;
  salary: number;
  department: string;
  experience_required: number;
  description: string;
  remarks: string;


  constructor(candidates: Partial<Candidates>) {
    this.id = candidates.id || 0;
    this.full_name = candidates.full_name || '';
    this.img = candidates.img || '';
    this.mobile = candidates.mobile || '';
    this.email = candidates.email || '';
    this.linkedin = candidates.linkedin || '';
    this.address = candidates.address || '';
    this.gender = candidates.gender || '';
    this.experience = candidates.experience || '';
    this.last_company = candidates.last_company || '';
    this.last_ctc = candidates.last_ctc || '';
    this.resume = candidates.resume || '';
    this.created_at = candidates.created_at || '';
    this.job_id = candidates.job_id || '';
    this.status = candidates.status || '';
    this.previous_status = candidates.previous_status || '';
    this.title = candidates.title || '';
    this.salary = candidates.salary || 0;
    this.department = candidates.department || '';
    this.experience_required = candidates.experience_required || 0;
    this.description = candidates.description || '';
    this.remarks = candidates.remarks || '';
  }

  public getRandomID(): number {
    const S4 = () => {
      return ((1 + Math.random()) * 0x10000) | 0;
    };
    return S4() + S4();
  }
}
