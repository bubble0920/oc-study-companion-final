export type StudyPlanStatus =
  | "planned"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface StudyPlan {
  id: string;
  date: string;
  title: string;
  startTime: string;
  duration: number;
  breakDuration: number;
  status: StudyPlanStatus;
  actualStartTime: string | null;
  actualEndTime: string | null;
  actualDuration: number;
}

export interface StudySession {
  id: string;
  planId: string;
  startTime: string;
  endTime: string | null;
  duration: number;
  completed: boolean;
}
