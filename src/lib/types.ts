// Shared domain types for the Builder's Assembly mentorship portal.

export type TacticStatus = "committed" | "working_on" | "completed" | "blocked";
export type GoalStatus = "active" | "achieved" | "missed";

export type Member = {
  id: string;
  user_id: string;
  name: string;
  email: string;
  avatar_url: string | null;
  role: "member" | "admin";
  is_active: boolean;
  created_at: string;
};

export type Cycle = {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  created_at: string;
};

// A venture = a business. Top-level container for goals, board, readiness.
// Runs its own 90-day sprint from start_date.
export type Project = {
  id: string;
  member_id: string;
  name: string;
  description: string;
  color: string | null;
  start_date: string; // YYYY-MM-DD — anchors the 90-day sprint
  is_active: boolean;
  created_at: string;
};

export type Goal = {
  id: string;
  member_id: string;
  cycle_id: string | null;
  project_id: string | null;
  title: string;
  why: string;
  target_metric: string;
  target_value: number | null;
  current_value: number;
  status: GoalStatus;
  the_bet: string | null;
  source_idea_id: string | null;
  end_date: string | null;
  color: string | null;
  created_at: string;
};

export type Idea = {
  id: string;
  member_id: string;
  cycle_id: string;
  content: string;
  is_chosen: boolean;
  created_at: string;
};

export type BetStatus = "backlog" | "promoted" | "dropped";

// A ranked, persistent candidate direction from the brainstorm. Top-ranked
// bets get promoted into 90-day goals; the rest stay as a backlog ("next up").
export type Bet = {
  id: string;
  project_id: string;
  member_id: string;
  cycle_id: string | null;
  title: string;
  note: string;
  rank: number; // 1 = top priority
  status: BetStatus;
  source_idea_id: string | null;
  goal_id: string | null;
  created_at: string;
};

export type Tactic = {
  id: string;
  user_id: string;
  member_id: string | null;
  goal_id: string | null;
  project_id: string | null;
  title: string;
  description: string;
  status: TacticStatus;
  position: number;
  week_number: number | null;
  notes: string;
  deadline: string | null;
  created_at: string;
};

export type WeeklyCheckin = {
  id: string;
  member_id: string;
  cycle_id: string;
  week_number: number;
  tactics_committed: number;
  tactics_completed: number;
  score: number | null;
  reflection: string;
  created_at: string;
};
