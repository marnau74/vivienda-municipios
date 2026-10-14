
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "alquiler_indice": {
                  Row: {
                    "anio": number,"indice": number,"territorio": string,"variacion_anual": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anio": number,"indice": number,"territorio": string,"variacion_anual"?: number | null
                  }
                  Update: {
                    "anio"?: number,"indice"?: number,"territorio"?: string,"variacion_anual"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "alquiler_indice_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "alquiler_municipio"
      referencedColumns: ["codigo"]
    },{
      foreignKeyName: "alquiler_indice_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "territorio"
      referencedColumns: ["codigo"]
    }
                  ]
                },"carga": {
                  Row: {
                    "cargada_en": string,"filas": number,"id": number,"tabla_ine": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cargada_en"?: string,"filas": number,"id"?: never,"tabla_ine": string
                  }
                  Update: {
                    "cargada_en"?: string,"filas"?: number,"id"?: never,"tabla_ine"?: string
                  }
                  Relationships: [
                    
                  ]
                },"comparacion": {
                  Row: {
                    "creada_en": string,"id": string,"nombre": string,"territorios": (string)[],"usuario": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creada_en"?: string,"id"?: string,"nombre": string,"territorios": (string)[],"usuario"?: string
                  }
                  Update: {
                    "creada_en"?: string,"id"?: string,"nombre"?: string,"territorios"?: (string)[],"usuario"?: string
                  }
                  Relationships: [
                    
                  ]
                },"seguimiento": {
                  Row: {
                    "creado_en": string,"territorio": string,"usuario": string
                  }
                  ComputedFields: never
                  Insert: {
                    "creado_en"?: string,"territorio": string,"usuario"?: string
                  }
                  Update: {
                    "creado_en"?: string,"territorio"?: string,"usuario"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "seguimiento_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "alquiler_municipio"
      referencedColumns: ["codigo"]
    },{
      foreignKeyName: "seguimiento_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "territorio"
      referencedColumns: ["codigo"]
    }
                  ]
                },"territorio": {
                  Row: {
                    "codigo": string,"codigo_ine": string,"nivel": string,"nombre": string,"padre": string | null,"slug": string
                  }
                  ComputedFields: never
                  Insert: {
                    "codigo": string,"codigo_ine": string,"nivel": string,"nombre": string,"padre"?: string | null,"slug": string
                  }
                  Update: {
                    "codigo"?: string,"codigo_ine"?: string,"nivel"?: string,"nombre"?: string,"padre"?: string | null,"slug"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "territorio_padre_fkey"
      columns: ["padre"]
isOneToOne: false
      referencedRelation: "alquiler_municipio"
      referencedColumns: ["codigo"]
    },{
      foreignKeyName: "territorio_padre_fkey"
      columns: ["padre"]
isOneToOne: false
      referencedRelation: "territorio"
      referencedColumns: ["codigo"]
    }
                  ]
                },"vivienda_turistica": {
                  Row: {
                    "periodo": string,"plazas": number | null,"porcentaje": number | null,"territorio": string,"viviendas": number | null
                  }
                  ComputedFields: never
                  Insert: {
                    "periodo": string,"plazas"?: number | null,"porcentaje"?: number | null,"territorio": string,"viviendas"?: number | null
                  }
                  Update: {
                    "periodo"?: string,"plazas"?: number | null,"porcentaje"?: number | null,"territorio"?: string,"viviendas"?: number | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "vivienda_turistica_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "alquiler_municipio"
      referencedColumns: ["codigo"]
    },{
      foreignKeyName: "vivienda_turistica_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "territorio"
      referencedColumns: ["codigo"]
    }
                  ]
                }
          }
          Views: {
            "alquiler_municipio": {
                  Row: {
                    "anio": number | null,"codigo": string | null,"nombre": string | null,"provincia": string | null,"slug": string | null,"subida_desde_2015": number | null,"variacion_anual": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    
                  ]
                },"vivienda_turistica_ultima": {
                  Row: {
                    "periodo": string | null,"plazas": number | null,"porcentaje": number | null,"territorio": string | null,"viviendas": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "vivienda_turistica_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "alquiler_municipio"
      referencedColumns: ["codigo"]
    },{
      foreignKeyName: "vivienda_turistica_territorio_fkey"
      columns: ["territorio"]
isOneToOne: false
      referencedRelation: "territorio"
      referencedColumns: ["codigo"]
    }
                  ]
                }
          }
          Functions: {
            "buscar_municipios":
{ Args: { "limite"?: number,"texto": string }; Returns: {
              "codigo": string,"nombre": string,"provincia": string,"slug": string
            }[]
                           },
"sin_tildes":
{ Args: { "texto": string }; Returns: string
                           }
          }
          Enums: {
            [_ in never]: never
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
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
