export type InterviewStatus = 'upcoming' | 'complete';

export type HrCallStatus = 'pending' | 'done' | 'no_response';

export type FinalCallStatus = 'pending' | 'select' | 'hold' | 'reject';

export type JoinedStatus = 'pending' | 'joined' | 'not_joined';

export type RoundStatus =
  | 'pending'
  | 'scheduled'
  | 'cleared'
  | 'rejected'
  | 'hold';

export type RoundType = 'hr' | 'technical' | 'ceo';


// A round assigned to (typically) a senior developer.
export interface InterviewRound {
  id?: number;
  interview_id?: number;
  round_type: RoundType | string;
  assigned_to_id?: number | null;
  assigned_to_name?: string | null;
  scheduled_date?: string | null;
  notes?: string | null;
  status: RoundStatus | string;
  created_at?: string;
  updated_at?: string;
}


export interface Interview {
  id?: number;

  hr_name: string;
  candidate_name: string;
  candidate_number: string;
  candidate_email?: string | null;

  // Position the candidate is being interviewed for (from departments).
  profile?: string | null;

  linkedin_link?: string | null;
  resume?: string | null;

  interview_date: string;

  // HR round.
  hr_call_details?: string | null;
  hr_call_status?: HrCallStatus | string;

  // CEO / final round.
  final_call_notes?: string | null;
  final_call_status?: FinalCallStatus | string;

  // After selection.
  joined_status?: JoinedStatus | string;
  joining_note?: string | null;

  status: InterviewStatus;

  rounds?: InterviewRound[];

  created_at?: string;
  updated_at?: string;
}


// Row shown on a senior developer's "assigned to me" card / page.
export interface AssignedRound {
  round_id: number;
  round_type: string;
  scheduled_date: string | null;
  status: string;
  notes: string | null;
  interview_id: number;
  candidate_name: string;
  profile: string | null;
  resume?: string | null;
  linkedin_link?: string | null;
  hr_call_details?: string | null;
}


// A manageable HR-call option (add / edit / delete, like departments).
export interface HrCallOption {
  id: number;
  name: string;
  created_at?: string;
  updated_at?: string;
}


// Minimal employee shape for the second-round assignee dropdown
// (Senior developers and Admins).
export interface SeniorDeveloper {
  id: number;
  fullName: string;
  department?: string;
  employee_level?: string;
  role?: string;
}
