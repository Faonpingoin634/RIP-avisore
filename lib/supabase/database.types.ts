/**
 * Hand-written types mirroring `supabase/migrations/0001_init.sql`.
 * Keep in sync with the migration if the schema ever changes.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type ReviewVibe =
  | "paisible"
  | "voisins_bruyants"
  | "gothique_chic"
  | "touristique"
  | "hante"
  | "abandonne";

export type OsmType = "node" | "way" | "relation";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: { id: string; username: string; created_at: string };
        Insert: { id: string; username: string; created_at?: string };
        Update: { username?: string };
        Relationships: [];
      };
      cemeteries: {
        Row: {
          id: string;
          osm_type: OsmType;
          osm_id: number;
          name: string | null;
          latitude: number;
          longitude: number;
          tags: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          osm_type: OsmType;
          osm_id: number;
          name?: string | null;
          latitude: number;
          longitude: number;
          tags?: Json;
          created_at?: string;
        };
        Update: {
          name?: string | null;
          latitude?: number;
          longitude?: number;
          tags?: Json;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          cemetery_id: string;
          user_id: string;
          rating: number;
          humidity: number;
          vibes: ReviewVibe[];
          comment: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          cemetery_id: string;
          user_id: string;
          rating: number;
          humidity: number;
          vibes: ReviewVibe[];
          comment: string;
        };
        Update: {
          rating?: number;
          humidity?: number;
          vibes?: ReviewVibe[];
          comment?: string;
        };
        Relationships: [
          {
            foreignKeyName: "reviews_cemetery_id_fkey";
            columns: ["cemetery_id"];
            isOneToOne: false;
            referencedRelation: "cemeteries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "reviews_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      cemetery_ratings: {
        Row: {
          cemetery_id: string;
          review_count: number;
          avg_rating: number | null;
          avg_humidity: number | null;
        };
        Relationships: [];
      };
    };
    Functions: Record<never, never>;
    Enums: { review_vibe: ReviewVibe };
    CompositeTypes: Record<never, never>;
  };
};
