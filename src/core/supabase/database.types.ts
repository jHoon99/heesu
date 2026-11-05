
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "public": {
          Tables: {
            "answers": {
                  Row: {
                    "body": string,"created_at": string,"id": string,"question_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: string,"question_id": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: string,"question_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "answers_question_id_fkey"
      columns: ["question_id"]
isOneToOne: false
      referencedRelation: "questions"
      referencedColumns: ["id"]
    }
                  ]
                },"attendance": {
                  Row: {
                    "session_id": string,"status": Database["public"]['Enums']["attendance_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "session_id": string,"status"?: Database["public"]['Enums']["attendance_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "session_id"?: string,"status"?: Database["public"]['Enums']["attendance_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "attendance_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "attendance_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "attendance_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"class_members": {
                  Row: {
                    "class_id": string,"created_at": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"student_id": string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "class_members_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "class_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"classes": {
                  Row: {
                    "capacity": number | null,"created_at": string,"id": string,"level": Database["public"]['Enums']["class_level"],"name": string,"schedule": NonNullable<Json>
                  }
                  ComputedFields: never
                  Insert: {
                    "capacity"?: number | null,"created_at"?: string,"id"?: string,"level": Database["public"]['Enums']["class_level"],"name": string,"schedule"?: NonNullable<Json>
                  }
                  Update: {
                    "capacity"?: number | null,"created_at"?: string,"id"?: string,"level"?: Database["public"]['Enums']["class_level"],"name"?: string,"schedule"?: NonNullable<Json>
                  }
                  Relationships: [
                    
                  ]
                },"clinic_items": {
                  Row: {
                    "created_at": string,"done_at": string | null,"id": string,"kind": Database["public"]['Enums']["clinic_kind"],"memo": string | null,"session_id": string | null,"status": Database["public"]['Enums']["clinic_status"],"student_id": string,"test_result_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"done_at"?: string | null,"id"?: string,"kind": Database["public"]['Enums']["clinic_kind"],"memo"?: string | null,"session_id"?: string | null,"status"?: Database["public"]['Enums']["clinic_status"],"student_id": string,"test_result_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"done_at"?: string | null,"id"?: string,"kind"?: Database["public"]['Enums']["clinic_kind"],"memo"?: string | null,"session_id"?: string | null,"status"?: Database["public"]['Enums']["clinic_status"],"student_id"?: string,"test_result_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clinic_items_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinic_items_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "clinic_items_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinic_items_test_result_id_fkey"
      columns: ["test_result_id"]
isOneToOne: false
      referencedRelation: "test_results"
      referencedColumns: ["id"]
    }
                  ]
                },"consents": {
                  Row: {
                    "consented_at": string,"created_at": string,"guardian_name": string,"id": string,"method": Database["public"]['Enums']["consent_method"],"student_id": string,"version": string
                  }
                  ComputedFields: never
                  Insert: {
                    "consented_at": string,"created_at"?: string,"guardian_name": string,"id"?: string,"method": Database["public"]['Enums']["consent_method"],"student_id": string,"version": string
                  }
                  Update: {
                    "consented_at"?: string,"created_at"?: string,"guardian_name"?: string,"id"?: string,"method"?: Database["public"]['Enums']["consent_method"],"student_id"?: string,"version"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "consents_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"consultations": {
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
                },"counsel_notes": {
                  Row: {
                    "body": string,"counseled_on": string,"created_at": string,"id": string,"method": Database["public"]['Enums']["counsel_method"],"party": Database["public"]['Enums']["counsel_party"],"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"counseled_on": string,"created_at"?: string,"id"?: string,"method": Database["public"]['Enums']["counsel_method"],"party": Database["public"]['Enums']["counsel_party"],"student_id": string
                  }
                  Update: {
                    "body"?: string,"counseled_on"?: string,"created_at"?: string,"id"?: string,"method"?: Database["public"]['Enums']["counsel_method"],"party"?: Database["public"]['Enums']["counsel_party"],"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "counsel_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "counsel_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"guardian_tokens": {
                  Row: {
                    "created_at": string,"expires_at": string,"id": string,"revoked_at": string | null,"student_id": string,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"expires_at": string,"id"?: string,"revoked_at"?: string | null,"student_id": string,"token_hash": string
                  }
                  Update: {
                    "created_at"?: string,"expires_at"?: string,"id"?: string,"revoked_at"?: string | null,"student_id"?: string,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "guardian_tokens_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "guardian_tokens_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"homework_checks": {
                  Row: {
                    "session_id": string,"status": Database["public"]['Enums']["homework_status"],"student_id": string,"submitted_at": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "session_id": string,"status"?: Database["public"]['Enums']["homework_status"],"student_id": string,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "session_id"?: string,"status"?: Database["public"]['Enums']["homework_status"],"student_id"?: string,"submitted_at"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "homework_checks_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "homework_checks_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "homework_checks_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"lesson_notes": {
                  Row: {
                    "created_at": string,"needs_concept_review": boolean,"needs_word_retest": boolean,"note": string | null,"session_id": string,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"needs_concept_review"?: boolean,"needs_word_retest"?: boolean,"note"?: string | null,"session_id": string,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "created_at"?: string,"needs_concept_review"?: boolean,"needs_word_retest"?: boolean,"note"?: string | null,"session_id"?: string,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "lesson_notes_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "lesson_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "lesson_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"materials": {
                  Row: {
                    "class_id": string,"created_at": string,"file_name": string,"id": string,"size_bytes": number,"storage_path": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"file_name": string,"id"?: string,"size_bytes": number,"storage_path": string,"title": string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"file_name"?: string,"id"?: string,"size_bytes"?: number,"storage_path"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "materials_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    }
                  ]
                },"payments": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"memo": string | null,"month": string,"paid_at": string | null,"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"memo"?: string | null,"month": string,"paid_at"?: string | null,"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"memo"?: string | null,"month"?: string,"paid_at"?: string | null,"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "payments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"points": {
                  Row: {
                    "amount": number,"created_at": string,"id": string,"reason": string,"session_id": string | null,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "amount": number,"created_at"?: string,"id"?: string,"reason": string,"session_id"?: string | null,"student_id": string
                  }
                  Update: {
                    "amount"?: number,"created_at"?: string,"id"?: string,"reason"?: string,"session_id"?: string | null,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "points_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "points_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "points_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"questions": {
                  Row: {
                    "answered_at": string | null,"body": string,"created_at": string,"id": string,"session_id": string | null,"student_id": string,"video_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "answered_at"?: string | null,"body": string,"created_at"?: string,"id"?: string,"session_id"?: string | null,"student_id": string,"video_id"?: string | null
                  }
                  Update: {
                    "answered_at"?: string | null,"body"?: string,"created_at"?: string,"id"?: string,"session_id"?: string | null,"student_id"?: string,"video_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "questions_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "questions_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "questions_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"sessions": {
                  Row: {
                    "class_id": string,"created_at": string,"date": string,"homework": string | null,"homework_due": string | null,"id": string,"summary": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"date": string,"homework"?: string | null,"homework_due"?: string | null,"id"?: string,"summary"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"date"?: string,"homework"?: string | null,"homework_due"?: string | null,"id"?: string,"summary"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sessions_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    }
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
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
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
                },"test_results": {
                  Row: {
                    "created_at": string,"id": string,"kind": Database["public"]['Enums']["test_kind"],"max_score": number,"memo": string | null,"pass_score": number | null,"score": number,"student_id": string,"taken_on": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"kind": Database["public"]['Enums']["test_kind"],"max_score": number,"memo"?: string | null,"pass_score"?: number | null,"score": number,"student_id": string,"taken_on": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"kind"?: Database["public"]['Enums']["test_kind"],"max_score"?: number,"memo"?: string | null,"pass_score"?: number | null,"score"?: number,"student_id"?: string,"taken_on"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "test_results_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "test_results_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"video_views": {
                  Row: {
                    "position_seconds": number,"student_id": string,"updated_at": string,"video_id": string,"watched_seconds": number
                  }
                  ComputedFields: never
                  Insert: {
                    "position_seconds"?: number,"student_id": string,"updated_at"?: string,"video_id": string,"watched_seconds"?: number
                  }
                  Update: {
                    "position_seconds"?: number,"student_id"?: string,"updated_at"?: string,"video_id"?: string,"watched_seconds"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "video_views_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "video_views_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "video_views_video_id_fkey"
      columns: ["video_id"]
isOneToOne: false
      referencedRelation: "videos"
      referencedColumns: ["id"]
    }
                  ]
                },"videos": {
                  Row: {
                    "class_id": string,"created_at": string,"duration_seconds": number,"id": string,"published_at": string,"school": string | null,"storage_path": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "class_id": string,"created_at"?: string,"duration_seconds": number,"id"?: string,"published_at"?: string,"school"?: string | null,"storage_path": string,"title": string
                  }
                  Update: {
                    "class_id"?: string,"created_at"?: string,"duration_seconds"?: number,"id"?: string,"published_at"?: string,"school"?: string | null,"storage_path"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "videos_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "class_roster": {
                  Row: {
                    "class_id": string | null,"grade": Database["public"]['Enums']["school_grade"] | null,"name": string | null,"status": Database["public"]['Enums']["student_status"] | null,"student_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "class_members_class_id_fkey"
      columns: ["class_id"]
isOneToOne: false
      referencedRelation: "classes"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "class_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "class_members_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    }
                  ]
                },"clinic_board": {
                  Row: {
                    "created_at": string | null,"done_at": string | null,"grade": Database["public"]['Enums']["school_grade"] | null,"id": string | null,"kind": Database["public"]['Enums']["clinic_kind"] | null,"memo": string | null,"session_date": string | null,"session_id": string | null,"status": Database["public"]['Enums']["clinic_status"] | null,"student_id": string | null,"student_name": string | null,"test_date": string | null,"test_result_id": string | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "clinic_items_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sessions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinic_items_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "student_point_totals"
      referencedColumns: ["student_id"]
    },{
      foreignKeyName: "clinic_items_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "students"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "clinic_items_test_result_id_fkey"
      columns: ["test_result_id"]
isOneToOne: false
      referencedRelation: "test_results"
      referencedColumns: ["id"]
    }
                  ]
                },"student_point_totals": {
                  Row: {
                    "grade": Database["public"]['Enums']["school_grade"] | null,"name": string | null,"status": Database["public"]['Enums']["student_status"] | null,"student_id": string | null,"total": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                }
          }
          Functions: {
            "admin_user_exists":
{ Args: { "p_user_id": string }; Returns: boolean
                           },
"guardian_view":
{ Args: { "p_token": string }; Returns: Json
                           },
"issue_guardian_token":
{ Args: { "p_student_id": string }; Returns: string
                           },
"my_rank":
{ Args: Record<PropertyKey, never>; Returns: {
              "rank": number,"total": number
            }[]
                           },
"my_role":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"password_changed":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"save_video_progress":
{ Args: { "p_position_seconds": number,"p_video_id": string,"p_watched_seconds": number }; Returns: number
                           },
"submit_consultation":
{ Args: { "p_consent_version": string,"p_grade": Database["public"]['Enums']["school_grade"],"p_message": string,"p_parent_name": string,"p_phone": string }; Returns: string
                           },
"submit_homework":
{ Args: { "p_session_id": string }; Returns: string
                           }
          }
          Enums: {
            "attendance_status": "none"|"present"|"late"|"absent"|"makeup","class_level": "middle"|"high","clinic_kind": "word_retest"|"concept_review","clinic_status": "open"|"done","consent_method": "written"|"phone"|"kakao","consultation_status": "new"|"contacted"|"enrolled"|"on_hold","counsel_method": "in_person"|"phone"|"kakao","counsel_party": "guardian"|"student","homework_status": "none"|"done"|"missing","school_grade": "중1"|"중2"|"중3"|"고1"|"고2"|"고3","student_status": "active"|"paused"|"left","test_kind": "word"|"grammar"
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
            "attendance_status": ["none", "present", "late", "absent", "makeup"],"class_level": ["middle", "high"],"clinic_kind": ["word_retest", "concept_review"],"clinic_status": ["open", "done"],"consent_method": ["written", "phone", "kakao"],"consultation_status": ["new", "contacted", "enrolled", "on_hold"],"counsel_method": ["in_person", "phone", "kakao"],"counsel_party": ["guardian", "student"],"homework_status": ["none", "done", "missing"],"school_grade": ["중1", "중2", "중3", "고1", "고2", "고3"],"student_status": ["active", "paused", "left"],"test_kind": ["word", "grammar"]
          }
        }
} as const
