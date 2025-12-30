export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string | null
          id: string
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string | null
          id?: string
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_aliases: {
        Row: {
          alias_label: string
          alias_normalized: string
          brand_id: string | null
          created_at: string | null
          entity_type: string
          id: string
          is_active: boolean
          model_id: string | null
          priority: number
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          alias_label: string
          alias_normalized: string
          brand_id?: string | null
          created_at?: string | null
          entity_type: string
          id?: string
          is_active?: boolean
          model_id?: string | null
          priority?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          alias_label?: string
          alias_normalized?: string
          brand_id?: string | null
          created_at?: string | null
          entity_type?: string
          id?: string
          is_active?: boolean
          model_id?: string | null
          priority?: number
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_aliases_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "catalog_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_aliases_model_id_fkey"
            columns: ["model_id"]
            isOneToOne: false
            referencedRelation: "catalog_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_aliases_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_brand_groups: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          key: string
          label: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          key: string
          label: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          key?: string
          label?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_brand_groups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_brands: {
        Row: {
          canonical_label: string
          created_at: string | null
          group_id: string
          id: string
          is_active: boolean
          is_verified: boolean
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          canonical_label: string
          created_at?: string | null
          group_id: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          canonical_label?: string
          created_at?: string | null
          group_id?: string
          id?: string
          is_active?: boolean
          is_verified?: boolean
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_brands_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "catalog_brand_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_brands_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_candidates: {
        Row: {
          created_at: string | null
          created_by: string | null
          entity_type: string
          id: string
          normalized_text: string
          parent_brand_id: string | null
          raw_text: string
          status: string
          tenant_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          entity_type: string
          id?: string
          normalized_text: string
          parent_brand_id?: string | null
          raw_text: string
          status?: string
          tenant_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          entity_type?: string
          id?: string
          normalized_text?: string
          parent_brand_id?: string | null
          raw_text?: string
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_candidates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_candidates_parent_brand_fkey"
            columns: ["parent_brand_id"]
            isOneToOne: false
            referencedRelation: "catalog_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_candidates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_models: {
        Row: {
          brand_id: string
          canonical_label: string
          created_at: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          brand_id: string
          canonical_label: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          brand_id?: string
          canonical_label?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "catalog_models_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "catalog_brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "catalog_models_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string | null
          source: string | null
          subject: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name?: string | null
          source?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string | null
          source?: string | null
          subject?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_subscribers: {
        Row: {
          email: string
          id: string
          source: string | null
          subscribed_at: string
        }
        Insert: {
          email: string
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Update: {
          email?: string
          id?: string
          source?: string | null
          subscribed_at?: string
        }
        Relationships: []
      }
      marketplaces: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "marketplaces_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          id: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          unit_cost: number | null
          unit_price: number
          variant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          line_total: number
          order_id: string
          product_id: string
          quantity: number
          unit_cost?: number | null
          unit_price: number
          variant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          line_total?: number
          order_id?: string
          product_id?: string
          quantity?: number
          unit_cost?: number | null
          unit_price?: number
          variant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      order_shipping: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          line1: string | null
          line2: string | null
          name: string | null
          order_id: string
          phone: string | null
          postal_code: string | null
          state: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          line1?: string | null
          line2?: string | null
          name?: string | null
          order_id: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          line1?: string | null
          line2?: string | null
          name?: string | null
          order_id?: string
          phone?: string | null
          postal_code?: string | null
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_shipping_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: true
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cart_hash: string | null
          created_at: string | null
          currency: string | null
          expires_at: string | null
          fee: number | null
          fulfillment: string | null
          fulfillment_status: string | null
          id: string
          idempotency_key: string | null
          marketplace_id: string | null
          public_token: string | null
          refund_amount: number | null
          refunded_at: string | null
          seller_id: string | null
          shipped_at: string | null
          shipping: number
          shipping_carrier: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string | null
          subtotal: number
          tenant_id: string | null
          total: number
          tracking_number: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          cart_hash?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          fee?: number | null
          fulfillment?: string | null
          fulfillment_status?: string | null
          id?: string
          idempotency_key?: string | null
          marketplace_id?: string | null
          public_token?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_id?: string | null
          shipped_at?: string | null
          shipping: number
          shipping_carrier?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal: number
          tenant_id?: string | null
          total: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          cart_hash?: string | null
          created_at?: string | null
          currency?: string | null
          expires_at?: string | null
          fee?: number | null
          fulfillment?: string | null
          fulfillment_status?: string | null
          id?: string
          idempotency_key?: string | null
          marketplace_id?: string | null
          public_token?: string | null
          refund_amount?: number | null
          refunded_at?: string | null
          seller_id?: string | null
          shipped_at?: string | null
          shipping?: number
          shipping_carrier?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string | null
          subtotal?: number
          tenant_id?: string | null
          total?: number
          tracking_number?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_tags: {
        Row: {
          product_id: string
          tag_id: string
        }
        Insert: {
          product_id: string
          tag_id: string
        }
        Update: {
          product_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_tags_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          cost_cents: number | null
          id: string
          price_cents: number
          product_id: string
          size_label: string
          size_type: string
          stock: number
        }
        Insert: {
          cost_cents?: number | null
          id?: string
          price_cents: number
          product_id: string
          size_label: string
          size_type: string
          stock?: number
        }
        Update: {
          cost_cents?: number | null
          id?: string
          price_cents?: number
          product_id?: string
          size_label?: string
          size_type?: string
          stock?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand: string
          brand_is_verified: boolean
          category: string
          condition: string
          condition_note: string | null
          cost_cents: number
          created_at: string
          created_by: string | null
          default_shipping_price: number | null
          description: string | null
          id: string
          is_active: boolean
          marketplace_id: string | null
          model: string | null
          model_is_verified: boolean
          name: string
          parse_confidence: number | null
          parse_version: string | null
          seller_id: string | null
          shipping_override_cents: number | null
          sku: string
          tenant_id: string
          title_display: string
          title_raw: string
          updated_at: string
        }
        Insert: {
          brand: string
          brand_is_verified?: boolean
          category: string
          condition: string
          condition_note?: string | null
          cost_cents?: number
          created_at?: string
          created_by?: string | null
          default_shipping_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          marketplace_id?: string | null
          model?: string | null
          model_is_verified?: boolean
          name: string
          parse_confidence?: number | null
          parse_version?: string | null
          seller_id?: string | null
          shipping_override_cents?: number | null
          sku: string
          tenant_id: string
          title_display: string
          title_raw: string
          updated_at?: string
        }
        Update: {
          brand?: string
          brand_is_verified?: boolean
          category?: string
          condition?: string
          condition_note?: string | null
          cost_cents?: number
          created_at?: string
          created_by?: string | null
          default_shipping_price?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          marketplace_id?: string | null
          model?: string | null
          model_is_verified?: boolean
          name?: string
          parse_confidence?: number | null
          parse_version?: string | null
          seller_id?: string | null
          shipping_override_cents?: number | null
          sku?: string
          tenant_id?: string
          title_display?: string
          title_raw?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "marketplaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "sellers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          role: string | null
          stripe_customer_id: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          role?: string | null
          stripe_customer_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          role?: string | null
          stripe_customer_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      sellers: {
        Row: {
          created_at: string | null
          id: string
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sellers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_defaults: {
        Row: {
          category: string
          created_at: string | null
          default_price: number
          id: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          default_price?: number
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          default_price?: number
          id?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      shipping_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          city: string | null
          country: string | null
          full_name: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          full_name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          city?: string | null
          country?: string | null
          full_name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_pageviews: {
        Row: {
          created_at: string
          id: string
          path: string
          referrer: string | null
          session_id: string
          user_id: string | null
          visitor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          path: string
          referrer?: string | null
          session_id: string
          user_id?: string | null
          visitor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          visitor_id?: string
        }
        Relationships: []
      }
      stripe_events: {
        Row: {
          created: number
          id: string
          order_id: string | null
          payload_hash: string
          processed_at: string | null
          stripe_event_id: string
          type: string
        }
        Insert: {
          created: number
          id?: string
          order_id?: string | null
          payload_hash: string
          processed_at?: string | null
          stripe_event_id: string
          type: string
        }
        Update: {
          created?: number
          id?: string
          order_id?: string | null
          payload_hash?: string
          processed_at?: string | null
          stripe_event_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          group_key: string
          id: string
          label: string
          tenant_id: string | null
        }
        Insert: {
          group_key: string
          id?: string
          label: string
          tenant_id?: string | null
        }
        Update: {
          group_key?: string
          id?: string
          label?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          city: string | null
          country: string | null
          created_at: string | null
          id: string
          is_default: boolean | null
          line1: string | null
          line2: string | null
          name: string | null
          phone: string | null
          postal_code: string | null
          state: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          line1?: string | null
          line2?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          line1?: string | null
          line2?: string | null
          name?: string | null
          phone?: string | null
          postal_code?: string | null
          state?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      decrement_variant_stock: {
        Args: { p_quantity: number; p_variant_id: string }
        Returns: undefined
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_for_tenant: { Args: { target_tenant: string }; Returns: boolean }
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
