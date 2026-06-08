export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics: {
        Row: {
          category: string | null
          created_at: string
          id: string
          metadata: Json | null
          metric: string
          platform: string | null
          user_id: string
          value: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric: string
          platform?: string | null
          user_id: string
          value?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          metric?: string
          platform?: string | null
          user_id?: string
          value?: number | null
        }
        Relationships: []
      }
      flow_jobs: {
        Row: {
          aspect_ratio: string | null
          category: string | null
          created_at: string
          duration: string | null
          flow_generation_mode: string | null
          flow_media_type: string | null
          flow_mode: string | null
          flow_points_estimate: number | null
          id: string
          model: string | null
          platform: string | null
          prompt: string
          resolution: string | null
          source_variant: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
          variations: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          category?: string | null
          created_at?: string
          duration?: string | null
          flow_generation_mode?: string | null
          flow_media_type?: string | null
          flow_mode?: string | null
          flow_points_estimate?: number | null
          id?: string
          model?: string | null
          platform?: string | null
          prompt: string
          resolution?: string | null
          source_variant?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
          variations?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          category?: string | null
          created_at?: string
          duration?: string | null
          flow_generation_mode?: string | null
          flow_media_type?: string | null
          flow_mode?: string | null
          flow_points_estimate?: number | null
          id?: string
          model?: string | null
          platform?: string | null
          prompt?: string
          resolution?: string | null
          source_variant?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
          variations?: number | null
        }
        Relationships: []
      }
      image_generations: {
        Row: {
          created_at: string
          final_resolution: string | null
          generated_resolution: string | null
          id: string
          image_base64: string | null
          image_url: string | null
          model: string | null
          prompt: string
          provider: string
          resolution: string | null
          upscale_level: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          final_resolution?: string | null
          generated_resolution?: string | null
          id?: string
          image_base64?: string | null
          image_url?: string | null
          model?: string | null
          prompt: string
          provider: string
          resolution?: string | null
          upscale_level?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          final_resolution?: string | null
          generated_resolution?: string | null
          id?: string
          image_base64?: string | null
          image_url?: string | null
          model?: string | null
          prompt?: string
          provider?: string
          resolution?: string | null
          upscale_level?: string | null
          user_id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string
          id: string
          is_favorite: boolean
          model: string | null
          project_id: string | null
          prompt_id: string | null
          resolution: string | null
          title: string | null
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          model?: string | null
          project_id?: string | null
          prompt_id?: string | null
          resolution?: string | null
          title?: string | null
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_favorite?: boolean
          model?: string | null
          project_id?: string | null
          prompt_id?: string | null
          resolution?: string | null
          title?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "images_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      inspirations: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_saved: boolean
          reference_url: string | null
          thumbnail_url: string | null
          title: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_saved?: boolean
          reference_url?: string | null
          thumbnail_url?: string | null
          title: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_saved?: boolean
          reference_url?: string | null
          thumbnail_url?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      integrations: {
        Row: {
          account_label: string | null
          connected_at: string | null
          created_at: string
          id: string
          metadata: Json | null
          provider: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_label?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_label?: string | null
          connected_at?: string | null
          created_at?: string
          id?: string
          metadata?: Json | null
          provider?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          cover_url: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          duration: string | null
          flow_prompt: string | null
          id: string
          is_favorite: boolean
          kling_prompt: string | null
          language: string | null
          original_prompt: string | null
          platform: string | null
          project_id: string | null
          style: string | null
          title: string
          updated_at: string
          user_id: string
          veo_prompt: string | null
          youtube_prompt: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          duration?: string | null
          flow_prompt?: string | null
          id?: string
          is_favorite?: boolean
          kling_prompt?: string | null
          language?: string | null
          original_prompt?: string | null
          platform?: string | null
          project_id?: string | null
          style?: string | null
          title: string
          updated_at?: string
          user_id: string
          veo_prompt?: string | null
          youtube_prompt?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          duration?: string | null
          flow_prompt?: string | null
          id?: string
          is_favorite?: boolean
          kling_prompt?: string | null
          language?: string | null
          original_prompt?: string | null
          platform?: string | null
          project_id?: string | null
          style?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          veo_prompt?: string | null
          youtube_prompt?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prompts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_projects: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          hashtags: string | null
          id: string
          platform: string | null
          source_flow_job_id: string | null
          source_prompt_id: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string | null
          id?: string
          platform?: string | null
          source_flow_job_id?: string | null
          source_prompt_id?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          hashtags?: string | null
          id?: string
          platform?: string | null
          source_flow_job_id?: string | null
          source_prompt_id?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      trend_recreation_prompts: {
        Row: {
          alternative_title: string | null
          created_at: string
          hashtags: string | null
          hook: string | null
          id: string
          idea_base: string | null
          platform: string | null
          prompt_image: string | null
          prompt_video: string | null
          publication_description: string | null
          recommended_platforms: string | null
          short_script: string | null
          title: string
          trend_id: string | null
          updated_at: string
          user_id: string
          video_structure: string | null
          visual_style: string | null
        }
        Insert: {
          alternative_title?: string | null
          created_at?: string
          hashtags?: string | null
          hook?: string | null
          id?: string
          idea_base?: string | null
          platform?: string | null
          prompt_image?: string | null
          prompt_video?: string | null
          publication_description?: string | null
          recommended_platforms?: string | null
          short_script?: string | null
          title: string
          trend_id?: string | null
          updated_at?: string
          user_id: string
          video_structure?: string | null
          visual_style?: string | null
        }
        Update: {
          alternative_title?: string | null
          created_at?: string
          hashtags?: string | null
          hook?: string | null
          id?: string
          idea_base?: string | null
          platform?: string | null
          prompt_image?: string | null
          prompt_video?: string | null
          publication_description?: string | null
          recommended_platforms?: string | null
          short_script?: string | null
          title?: string
          trend_id?: string | null
          updated_at?: string
          user_id?: string
          video_structure?: string | null
          visual_style?: string | null
        }
        Relationships: []
      }
      trends: {
        Row: {
          category: string | null
          country: string | null
          created_at: string
          id: string
          language: string | null
          period: string | null
          platform: string | null
          ranking: number | null
          source_url: string | null
          thumbnail_url: string | null
          title: string
          user_id: string
          views: number | null
        }
        Insert: {
          category?: string | null
          country?: string | null
          created_at?: string
          id?: string
          language?: string | null
          period?: string | null
          platform?: string | null
          ranking?: number | null
          source_url?: string | null
          thumbnail_url?: string | null
          title: string
          user_id: string
          views?: number | null
        }
        Update: {
          category?: string | null
          country?: string | null
          created_at?: string
          id?: string
          language?: string | null
          period?: string | null
          platform?: string | null
          ranking?: number | null
          source_url?: string | null
          thumbnail_url?: string | null
          title?: string
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      videos: {
        Row: {
          aspect_ratio: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          is_favorite: boolean
          model: string | null
          project_id: string | null
          prompt_id: string | null
          resolution: string | null
          thumbnail_url: string | null
          title: string | null
          url: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_favorite?: boolean
          model?: string | null
          project_id?: string | null
          prompt_id?: string | null
          resolution?: string | null
          thumbnail_url?: string | null
          title?: string | null
          url: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          is_favorite?: boolean
          model?: string | null
          project_id?: string | null
          prompt_id?: string | null
          resolution?: string | null
          thumbnail_url?: string | null
          title?: string | null
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "videos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      viral_trends: {
        Row: {
          category: string
          channel_title: string | null
          comment_count: number | null
          country: string
          created_at: string
          creator_name: string | null
          embed_url: string | null
          external_id: string | null
          favorite: boolean
          id: string
          keywords: string | null
          likes: number | null
          platform: string
          published_at: string | null
          raw_payload: Json | null
          saved: boolean
          share_count: number | null
          source: string | null
          source_type: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          url: string | null
          user_id: string
          video_id: string | null
          views: number | null
          viral_score: number
        }
        Insert: {
          category: string
          channel_title?: string | null
          comment_count?: number | null
          country: string
          created_at?: string
          creator_name?: string | null
          embed_url?: string | null
          external_id?: string | null
          favorite?: boolean
          id?: string
          keywords?: string | null
          likes?: number | null
          platform: string
          published_at?: string | null
          raw_payload?: Json | null
          saved?: boolean
          share_count?: number | null
          source?: string | null
          source_type?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          url?: string | null
          user_id: string
          video_id?: string | null
          views?: number | null
          viral_score?: number
        }
        Update: {
          category?: string
          channel_title?: string | null
          comment_count?: number | null
          country?: string
          created_at?: string
          creator_name?: string | null
          embed_url?: string | null
          external_id?: string | null
          favorite?: boolean
          id?: string
          keywords?: string | null
          likes?: number | null
          platform?: string
          published_at?: string | null
          raw_payload?: Json | null
          saved?: boolean
          share_count?: number | null
          source?: string | null
          source_type?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          video_id?: string | null
          views?: number | null
          viral_score?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
