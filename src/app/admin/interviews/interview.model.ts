export type InterviewStatus = 'upcoming' | 'complete';

export interface Interview {
  id?: number;

  hr_name: string;
  candidate_name: string;
  candidate_number: string;

  linkedin_link?: string | null;

  resume?: string | null;
  photo?: string | null;

  interview_date: string;

  status: InterviewStatus;

  created_at?: string;
  updated_at?: string;
}