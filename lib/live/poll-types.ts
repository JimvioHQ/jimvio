export type LivePollPublic = {
  id: string;
  session_id: string;
  question: string;
  options: { id: string; label: string; votes: number }[];
  status: string;
  created_at: string;
  ended_at: string | null;
  my_option_index: number | null;
};
