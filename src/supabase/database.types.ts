export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      branches: {
        Row: {
          id: string;
          payload: string;
          parent_payload: string | null;
          parent_fen: string;
          fen: string;
          published_by: string;
          last_move_uci: string;
          last_move_san: string;
          status_kind: "active" | "check" | "checkmate" | "stalemate" | "draw";
          status_label: string;
          side_to_move: "white" | "black";
          is_final: boolean;
          state_created_at: string;
          recorded_at: string;
        };
        Insert: {
          id?: string;
          payload: string;
          parent_payload?: string | null;
          parent_fen: string;
          fen: string;
          published_by: string;
          last_move_uci: string;
          last_move_san: string;
          status_kind: "active" | "check" | "checkmate" | "stalemate" | "draw";
          status_label: string;
          side_to_move: "white" | "black";
          is_final: boolean;
          state_created_at: string;
          recorded_at?: string;
        };
        Update: {
          id?: string;
          payload?: string;
          parent_payload?: string | null;
          parent_fen?: string;
          fen?: string;
          published_by?: string;
          last_move_uci?: string;
          last_move_san?: string;
          status_kind?: "active" | "check" | "checkmate" | "stalemate" | "draw";
          status_label?: string;
          side_to_move?: "white" | "black";
          is_final?: boolean;
          state_created_at?: string;
          recorded_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      prune_old_finished_branch_paths: {
        Args: {
          max_branch_rows?: number;
          target_branch_rows?: number;
          max_finished_games?: number;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
