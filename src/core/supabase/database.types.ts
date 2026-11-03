
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "consultations": {
                  Row: {
                    "consent_version": string,"consented_at": string,"created_at": string,"grade": Database["public"]['Enums']["school_grade"],"id": string,"memo": string | null,"message": string | null,"parent_name": string,"phone": string,"status": Database["public"]['Enums']["consultation_status"]
                  }
                  ComputedFields: never
                  Insert: {
                    "consent_version": string,"consented_at": string,"created_at"?: string,"grade": Database["public"]['Enums']["school_grade"],"id"?: string,"memo"?: string | null,"message"?: string | null,"parent_name": string,"phone": string,"status"?: Database["public"]['Enums']["consultation_status"]
                  }
                  Update: {
                    "consent_version"?: string,"consented_at"?: string,"created_at"?: string,"grade"?: Database["public"]['Enums']["school_grade"],"id"?: string,"memo"?: string | null,"message"?: string | null,"parent_name"?: string,"phone"?: string,"status"?: Database["public"]['Enums']["consultation_status"]
                  }
                  Relationships: [
                    
                  ]
                },"site_content": {
                  Row: {
                    "key": string,"updated_at": string,"value": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "key": string,"updated_at"?: string,"value": NonNullable<Json>
                  }
                  Update: {
                    "key"?: string,"updated_at"?: string,"value"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"student_private": {
                  Row: {
                    "guardian_name": string | null,"guardian_phone": string | null,"memo": string | null,"school": string | null,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "guardian_name"?: string | null,"guardian_phone"?: string | null,"memo"?: string | null,"school"?: string | null,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "guardian_name"?: string | null,"guardian_phone"?: string | null,"memo"?: string | null,"school"?: string | null,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "student_private_student_id_fkey"
      columns: ["student_id"]
isOneToOne: true
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"students": {
                  Row: {
                    "created_at": string,"grade": Database["public"]['Enums']["school_grade"],"id": string,"joined_at": string,"login_id": string,"must_change_password": boolean,"name": string,"status": Database["public"]['Enums']["student_status"],"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"grade": Database["public"]['Enums']["school_grade"],"id"?: string,"joined_at"?: string,"login_id": string,"must_change_password"?: boolean,"name": string,"status"?: Database["public"]['Enums']["student_status"],"user_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"grade"?: Database["public"]['Enums']["school_grade"],"id"?: string,"joined_at"?: string,"login_id"?: string,"must_change_password"?: boolean,"name"?: string,"status"?: Database["public"]['Enums']["student_status"],"user_id"?: string | null
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_user_exists":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"my_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"password_changed":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"submit_consultation":
{ Args: { "p_consent_version": string,"p_grade": Database["public"]['Enums']["school_grade"],"p_message": string,"p_parent_name": string,"p_phone": string }; Returns: string
                           }
          }
          Enums: {
            "consultation_status": "new"|"contacted"|"enrolled"|"on_hold","school_grade": "중1"|"중2"|"중3"|"고1"|"고2"|"고3","student_status": "active"|"paused"|"left"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "public": {
          Enums: {
            "consultation_status": ["new", "contacted", "enrolled", "on_hold"],"school_grade": ["중1", "중2", "중3", "고1", "고2", "고3"],"student_status": ["active", "paused", "left"]
          }
        }
} as const
