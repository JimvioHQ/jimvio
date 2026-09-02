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
      admin_audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip: string | null
          metadata: Json
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip?: string | null
          metadata?: Json
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_campaigns: {
        Row: {
          attribution_model: string
          attribution_window_days: number
          budget_amount: number | null
          budget_spent: number
          commission_rate: number
          community_id: string | null
          created_at: string
          created_by: string
          currency: string
          description: string | null
          ends_at: string | null
          id: string
          metadata: Json
          name: string
          product_id: string | null
          starts_at: string | null
          status: string
          tracking_code: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          attribution_model?: string
          attribution_window_days?: number
          budget_amount?: number | null
          budget_spent?: number
          commission_rate?: number
          community_id?: string | null
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          name: string
          product_id?: string | null
          starts_at?: string | null
          status?: string
          tracking_code: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          attribution_model?: string
          attribution_window_days?: number
          budget_amount?: number | null
          budget_spent?: number
          commission_rate?: number
          community_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          product_id?: string | null
          starts_at?: string | null
          status?: string
          tracking_code?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_campaigns_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          campaign_id: string | null
          converted: boolean | null
          converted_at: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          is_unique: boolean
          link_id: string
          referrer: string | null
          session_id: string | null
          session_key: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          campaign_id?: string | null
          converted?: boolean | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          is_unique?: boolean
          link_id: string
          referrer?: string | null
          session_id?: string | null
          session_key?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          campaign_id?: string | null
          converted?: boolean | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          is_unique?: boolean
          link_id?: string
          referrer?: string | null
          session_id?: string | null
          session_key?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "affiliate_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          attributed_at: string | null
          attribution_model: string
          campaign_id: string | null
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          lifecycle_status: string
          link_id: string | null
          notes: string | null
          order_amount: number
          order_id: string
          order_item_id: string | null
          original_commission_amount: number | null
          paid_at: string | null
          payout_id: string | null
          product_id: string | null
          refunded_amount: number
          status: Database["public"]["Enums"]["payout_status"] | null
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          affiliate_id: string
          attributed_at?: string | null
          attribution_model?: string
          campaign_id?: string | null
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          lifecycle_status?: string
          link_id?: string | null
          notes?: string | null
          order_amount: number
          order_id: string
          order_item_id?: string | null
          original_commission_amount?: number | null
          paid_at?: string | null
          payout_id?: string | null
          product_id?: string | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          affiliate_id?: string
          attributed_at?: string | null
          attribution_model?: string
          campaign_id?: string | null
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          lifecycle_status?: string
          link_id?: string | null
          notes?: string | null
          order_amount?: number
          order_id?: string
          order_item_id?: string | null
          original_commission_amount?: number | null
          paid_at?: string | null
          payout_id?: string | null
          product_id?: string | null
          refunded_amount?: number
          status?: Database["public"]["Enums"]["payout_status"] | null
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "affiliate_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_ledger: {
        Row: {
          affiliate_id: string
          amount: number
          balance_available_after: number | null
          balance_pending_after: number | null
          commission_id: string | null
          created_at: string
          currency: string
          entry_type: string
          id: string
          metadata: Json
          note: string | null
        }
        Insert: {
          affiliate_id: string
          amount: number
          balance_available_after?: number | null
          balance_pending_after?: number | null
          commission_id?: string | null
          created_at?: string
          currency?: string
          entry_type: string
          id?: string
          metadata?: Json
          note?: string | null
        }
        Update: {
          affiliate_id?: string
          amount?: number
          balance_available_after?: number | null
          balance_pending_after?: number | null
          commission_id?: string | null
          created_at?: string
          currency?: string
          entry_type?: string
          id?: string
          metadata?: Json
          note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_ledger_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_ledger_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "affiliate_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_links: {
        Row: {
          affiliate_id: string
          campaign_id: string | null
          commission_rate: number | null
          created_at: string | null
          custom_slug: string | null
          destination_url: string
          expires_at: string | null
          full_url: string | null
          id: string
          is_active: boolean | null
          link_code: string
          product_id: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_earnings: number | null
          unique_clicks: number | null
          vendor_id: string | null
        }
        Insert: {
          affiliate_id: string
          campaign_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_slug?: string | null
          destination_url: string
          expires_at?: string | null
          full_url?: string | null
          id?: string
          is_active?: boolean | null
          link_code?: string
          product_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          unique_clicks?: number | null
          vendor_id?: string | null
        }
        Update: {
          affiliate_id?: string
          campaign_id?: string | null
          commission_rate?: number | null
          created_at?: string | null
          custom_slug?: string | null
          destination_url?: string
          expires_at?: string | null
          full_url?: string | null
          id?: string
          is_active?: boolean | null
          link_code?: string
          product_id?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          unique_clicks?: number | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_links_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "affiliate_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_links_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliates: {
        Row: {
          affiliate_code: string
          available_balance: number | null
          bio: string | null
          conversion_rate: number | null
          created_at: string | null
          id: string
          is_active: boolean | null
          niche: string[] | null
          paid_earnings: number | null
          payout_account: string | null
          payout_method: string | null
          pending_earnings: number | null
          social_links: Json | null
          tier: string | null
          total_clicks: number | null
          total_conversions: number | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          affiliate_code?: string
          available_balance?: number | null
          bio?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          niche?: string[] | null
          paid_earnings?: number | null
          payout_account?: string | null
          payout_method?: string | null
          pending_earnings?: number | null
          social_links?: Json | null
          tier?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          affiliate_code?: string
          available_balance?: number | null
          bio?: string | null
          conversion_rate?: number | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          niche?: string[] | null
          paid_earnings?: number | null
          payout_account?: string | null
          payout_method?: string | null
          pending_earnings?: number | null
          social_links?: Json | null
          tier?: string | null
          total_clicks?: number | null
          total_conversions?: number | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          author_name: string
          body: string | null
          category: string
          created_at: string
          excerpt: string
          id: string
          image_url: string | null
          is_published: boolean
          published_at: string
          read_time_minutes: number
          slug: string
          title: string
        }
        Insert: {
          author_name: string
          body?: string | null
          category?: string
          created_at?: string
          excerpt: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string
          read_time_minutes?: number
          slug: string
          title: string
        }
        Update: {
          author_name?: string
          body?: string | null
          category?: string
          created_at?: string
          excerpt?: string
          id?: string
          image_url?: string | null
          is_published?: boolean
          published_at?: string
          read_time_minutes?: number
          slug?: string
          title?: string
        }
        Relationships: []
      }
      bookmark_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookmark_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      buying_lead_offers: {
        Row: {
          buying_request_id: string
          created_at: string
          id: string
          message: string | null
          offered_price: number | null
          status: string
          vendor_id: string
        }
        Insert: {
          buying_request_id: string
          created_at?: string
          id?: string
          message?: string | null
          offered_price?: number | null
          status?: string
          vendor_id: string
        }
        Update: {
          buying_request_id?: string
          created_at?: string
          id?: string
          message?: string | null
          offered_price?: number | null
          status?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "buying_lead_offers_buying_request_id_fkey"
            columns: ["buying_request_id"]
            isOneToOne: false
            referencedRelation: "buying_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buying_lead_offers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      buying_requests: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buyer_id: string
          category: string | null
          created_at: string
          delivery_country: string | null
          description: string | null
          id: string
          product_name: string
          quantity_needed: number
          status: string
          updated_at: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buyer_id: string
          category?: string | null
          created_at?: string
          delivery_country?: string | null
          description?: string | null
          id?: string
          product_name: string
          quantity_needed?: number
          status?: string
          updated_at?: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string
          category?: string | null
          created_at?: string
          delivery_country?: string | null
          description?: string | null
          id?: string
          product_name?: string
          quantity_needed?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "buying_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          added_at: string
          affiliate_link_id: string | null
          cart_id: string
          currency_at_add: string
          id: string
          product_id: string
          product_source: string
          quantity: number
          source_metadata: Json
          unit_price_at_add: number
          updated_at: string
          variant_id: string | null
          vendor_id: string
        }
        Insert: {
          added_at?: string
          affiliate_link_id?: string | null
          cart_id: string
          currency_at_add: string
          id?: string
          product_id: string
          product_source?: string
          quantity?: number
          source_metadata?: Json
          unit_price_at_add: number
          updated_at?: string
          variant_id?: string | null
          vendor_id: string
        }
        Update: {
          added_at?: string
          affiliate_link_id?: string | null
          cart_id?: string
          currency_at_add?: string
          id?: string
          product_id?: string
          product_source?: string
          quantity?: number
          source_metadata?: Json
          unit_price_at_add?: number
          updated_at?: string
          variant_id?: string | null
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_affiliate_link_id_fkey"
            columns: ["affiliate_link_id"]
            isOneToOne: false
            referencedRelation: "affiliate_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cart_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          item_count: number
          last_activity_at: string
          metadata: Json
          subtotal: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          item_count?: number
          last_activity_at?: string
          metadata?: Json
          subtotal?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          item_count?: number
          last_activity_at?: string
          metadata?: Json
          subtotal?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "carts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_ai_recommendations: {
        Row: {
          action: string
          category: string
          generated_at: string
          id: string
          issue: string
          priority: number
          product_count: number
          recommendation: string
        }
        Insert: {
          action: string
          category: string
          generated_at?: string
          id?: string
          issue: string
          priority?: number
          product_count?: number
          recommendation: string
        }
        Update: {
          action?: string
          category?: string
          generated_at?: string
          id?: string
          issue?: string
          priority?: number
          product_count?: number
          recommendation?: string
        }
        Relationships: []
      }
      cj_auto_publish_analytics: {
        Row: {
          admin_override_count: number
          avg_enrichment_time_ms: number | null
          avg_publish_score: number
          avg_publish_time_ms: number | null
          avg_queue_time_ms: number | null
          avg_supplier_quality: number
          catalog_health_percent: number
          duplicate_blocked_count: number
          duplicate_rate: number
          id: string
          marketplace_health_percent: number
          missing_description: number
          missing_images: number
          missing_shipping: number
          missing_stock: number
          missing_supplier: number
          missing_variants: number
          missing_video: number
          pending_enrichment: number
          publish_percent: number
          published_count: number
          ready_count: number
          ready_percent: number
          requirements_missing: number
          snapshot_at: string
          total_products: number
          trending_missing: number
          unpublished_count: number
        }
        Insert: {
          admin_override_count?: number
          avg_enrichment_time_ms?: number | null
          avg_publish_score?: number
          avg_publish_time_ms?: number | null
          avg_queue_time_ms?: number | null
          avg_supplier_quality?: number
          catalog_health_percent?: number
          duplicate_blocked_count?: number
          duplicate_rate?: number
          id?: string
          marketplace_health_percent?: number
          missing_description?: number
          missing_images?: number
          missing_shipping?: number
          missing_stock?: number
          missing_supplier?: number
          missing_variants?: number
          missing_video?: number
          pending_enrichment?: number
          publish_percent?: number
          published_count?: number
          ready_count?: number
          ready_percent?: number
          requirements_missing?: number
          snapshot_at?: string
          total_products?: number
          trending_missing?: number
          unpublished_count?: number
        }
        Update: {
          admin_override_count?: number
          avg_enrichment_time_ms?: number | null
          avg_publish_score?: number
          avg_publish_time_ms?: number | null
          avg_queue_time_ms?: number | null
          avg_supplier_quality?: number
          catalog_health_percent?: number
          duplicate_blocked_count?: number
          duplicate_rate?: number
          id?: string
          marketplace_health_percent?: number
          missing_description?: number
          missing_images?: number
          missing_shipping?: number
          missing_stock?: number
          missing_supplier?: number
          missing_variants?: number
          missing_video?: number
          pending_enrichment?: number
          publish_percent?: number
          published_count?: number
          ready_count?: number
          ready_percent?: number
          requirements_missing?: number
          snapshot_at?: string
          total_products?: number
          trending_missing?: number
          unpublished_count?: number
        }
        Relationships: []
      }
      cj_auto_publish_events: {
        Row: {
          admin_override: boolean
          created_at: string
          event_type: string
          failure_reasons: Json
          id: string
          pending_reasons: Json
          pid: string | null
          processing_time_ms: number | null
          product_id: string | null
          published: boolean
          ready: boolean
          score: number
          status: string | null
          supplier: string | null
          user_id: string | null
        }
        Insert: {
          admin_override?: boolean
          created_at?: string
          event_type?: string
          failure_reasons?: Json
          id?: string
          pending_reasons?: Json
          pid?: string | null
          processing_time_ms?: number | null
          product_id?: string | null
          published?: boolean
          ready?: boolean
          score?: number
          status?: string | null
          supplier?: string | null
          user_id?: string | null
        }
        Update: {
          admin_override?: boolean
          created_at?: string
          event_type?: string
          failure_reasons?: Json
          id?: string
          pending_reasons?: Json
          pid?: string | null
          processing_time_ms?: number | null
          product_id?: string | null
          published?: boolean
          ready?: boolean
          score?: number
          status?: string | null
          supplier?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cj_auto_publish_queue: {
        Row: {
          attempts: number
          batch_id: string | null
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          pid: string
          priority: number
          product_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          batch_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          pid: string
          priority?: number
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          batch_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          pid?: string
          priority?: number
          product_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cj_catalog_health: {
        Row: {
          avg_publish_time_ms: number | null
          avg_queue_time_ms: number | null
          avg_supplier_quality: number
          draft_count: number
          duplicate_count: number
          duplicate_rate: number
          health_label: string
          health_percent: number
          hidden_count: number
          id: string
          marketplace_health: number
          pending_count: number
          publish_percent: number
          published_count: number
          ready_count: number
          ready_percent: number
          shipping_issues: number
          snapshot_at: string
          supplier_issues: number
          unpublished_count: number
          video_missing: number
        }
        Insert: {
          avg_publish_time_ms?: number | null
          avg_queue_time_ms?: number | null
          avg_supplier_quality?: number
          draft_count?: number
          duplicate_count?: number
          duplicate_rate?: number
          health_label?: string
          health_percent?: number
          hidden_count?: number
          id?: string
          marketplace_health?: number
          pending_count?: number
          publish_percent?: number
          published_count?: number
          ready_count?: number
          ready_percent?: number
          shipping_issues?: number
          snapshot_at?: string
          supplier_issues?: number
          unpublished_count?: number
          video_missing?: number
        }
        Update: {
          avg_publish_time_ms?: number | null
          avg_queue_time_ms?: number | null
          avg_supplier_quality?: number
          draft_count?: number
          duplicate_count?: number
          duplicate_rate?: number
          health_label?: string
          health_percent?: number
          hidden_count?: number
          id?: string
          marketplace_health?: number
          pending_count?: number
          publish_percent?: number
          published_count?: number
          ready_count?: number
          ready_percent?: number
          shipping_issues?: number
          snapshot_at?: string
          supplier_issues?: number
          unpublished_count?: number
          video_missing?: number
        }
        Relationships: []
      }
      cj_catalog_scan_state: {
        Row: {
          cycle_number: number
          cycle_started_at: string
          id: string
          last_batch_at: string | null
          last_batch_size: number
          last_pid: string
          metadata: Json
          status: string
          total_scanned: number
          updated_at: string
        }
        Insert: {
          cycle_number?: number
          cycle_started_at?: string
          id?: string
          last_batch_at?: string | null
          last_batch_size?: number
          last_pid?: string
          metadata?: Json
          status?: string
          total_scanned?: number
          updated_at?: string
        }
        Update: {
          cycle_number?: number
          cycle_started_at?: string
          id?: string
          last_batch_at?: string | null
          last_batch_size?: number
          last_pid?: string
          metadata?: Json
          status?: string
          total_scanned?: number
          updated_at?: string
        }
        Relationships: []
      }
      cj_catalog_sync_runs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          job_type: string
          metadata: Json
          started_at: string
          status: string
          total_errors: number
          total_fetched: number
          total_saved: number
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_type: string
          metadata?: Json
          started_at?: string
          status?: string
          total_errors?: number
          total_fetched?: number
          total_saved?: number
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          job_type?: string
          metadata?: Json
          started_at?: string
          status?: string
          total_errors?: number
          total_fetched?: number
          total_saved?: number
        }
        Relationships: []
      }
      cj_enrichment_queue: {
        Row: {
          attempts: number
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          pid: string
          priority: number
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          pid: string
          priority?: number
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          pid?: string
          priority?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_enrichment_queue_pid_fkey"
            columns: ["pid"]
            isOneToOne: true
            referencedRelation: "cj_raw_products"
            referencedColumns: ["pid"]
          },
        ]
      }
      cj_logs: {
        Row: {
          action: string
          created_at: string
          error: string | null
          id: string
          message: string
          order_id: string | null
          request: string | null
          response: string | null
        }
        Insert: {
          action: string
          created_at?: string
          error?: string | null
          id?: string
          message: string
          order_id?: string | null
          request?: string | null
          response?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          error?: string | null
          id?: string
          message?: string
          order_id?: string | null
          request?: string | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cj_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_order_queue: {
        Row: {
          attempts: number
          cj_order_id: string | null
          created_at: string
          id: string
          last_error: string | null
          next_attempt_at: string
          order_id: string
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          cj_order_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          order_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          cj_order_id?: string | null
          created_at?: string
          id?: string
          last_error?: string | null
          next_attempt_at?: string
          order_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_order_queue_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_product_duplicates: {
        Row: {
          blocked: boolean
          detected_at: string
          duplicate_pid: string
          id: string
          pid: string
          similarity: number
        }
        Insert: {
          blocked?: boolean
          detected_at?: string
          duplicate_pid: string
          id?: string
          pid: string
          similarity: number
        }
        Update: {
          blocked?: boolean
          detected_at?: string
          duplicate_pid?: string
          id?: string
          pid?: string
          similarity?: number
        }
        Relationships: []
      }
      cj_product_intelligence: {
        Row: {
          auto_publish_failures: Json
          auto_publish_ready: boolean
          auto_publish_ready_at: string | null
          auto_publish_score: number
          auto_publish_status: string
          auto_unpublish_reason: string | null
          badges: Json
          catalog_tier: string
          confidence_score: number
          created_at: string
          delivery_days: number | null
          description_length: number
          duplicate_blocked: boolean
          duplicate_ref_pid: string | null
          duplicate_similarity: number | null
          enriched_at: string | null
          enrichment_attempts: number
          enrichment_status: string
          has_video: boolean
          health_score: number
          image_count: number
          is_admin_override: boolean
          is_published_active: boolean
          last_auto_publish_check: string | null
          last_error: string | null
          last_quality_check: string | null
          last_scanned_at: string | null
          linked_product_id: string | null
          margin_percent: number | null
          opportunity_score: number
          pending_enrichment_reasons: Json
          pid: string
          publish_priority: number
          publish_tier: string | null
          quality_confidence: string | null
          quality_explanation: string | null
          quality_scores: Json
          rating: number | null
          review_count: number
          scored_at: string | null
          supplier_reputation_score: number | null
          supplier_verified: boolean
          trending: boolean
          updated_at: string
          verified_warehouse: number | null
          video_count: number
        }
        Insert: {
          auto_publish_failures?: Json
          auto_publish_ready?: boolean
          auto_publish_ready_at?: string | null
          auto_publish_score?: number
          auto_publish_status?: string
          auto_unpublish_reason?: string | null
          badges?: Json
          catalog_tier?: string
          confidence_score?: number
          created_at?: string
          delivery_days?: number | null
          description_length?: number
          duplicate_blocked?: boolean
          duplicate_ref_pid?: string | null
          duplicate_similarity?: number | null
          enriched_at?: string | null
          enrichment_attempts?: number
          enrichment_status?: string
          has_video?: boolean
          health_score?: number
          image_count?: number
          is_admin_override?: boolean
          is_published_active?: boolean
          last_auto_publish_check?: string | null
          last_error?: string | null
          last_quality_check?: string | null
          last_scanned_at?: string | null
          linked_product_id?: string | null
          margin_percent?: number | null
          opportunity_score?: number
          pending_enrichment_reasons?: Json
          pid: string
          publish_priority?: number
          publish_tier?: string | null
          quality_confidence?: string | null
          quality_explanation?: string | null
          quality_scores?: Json
          rating?: number | null
          review_count?: number
          scored_at?: string | null
          supplier_reputation_score?: number | null
          supplier_verified?: boolean
          trending?: boolean
          updated_at?: string
          verified_warehouse?: number | null
          video_count?: number
        }
        Update: {
          auto_publish_failures?: Json
          auto_publish_ready?: boolean
          auto_publish_ready_at?: string | null
          auto_publish_score?: number
          auto_publish_status?: string
          auto_unpublish_reason?: string | null
          badges?: Json
          catalog_tier?: string
          confidence_score?: number
          created_at?: string
          delivery_days?: number | null
          description_length?: number
          duplicate_blocked?: boolean
          duplicate_ref_pid?: string | null
          duplicate_similarity?: number | null
          enriched_at?: string | null
          enrichment_attempts?: number
          enrichment_status?: string
          has_video?: boolean
          health_score?: number
          image_count?: number
          is_admin_override?: boolean
          is_published_active?: boolean
          last_auto_publish_check?: string | null
          last_error?: string | null
          last_quality_check?: string | null
          last_scanned_at?: string | null
          linked_product_id?: string | null
          margin_percent?: number | null
          opportunity_score?: number
          pending_enrichment_reasons?: Json
          pid?: string
          publish_priority?: number
          publish_tier?: string | null
          quality_confidence?: string | null
          quality_explanation?: string | null
          quality_scores?: Json
          rating?: number | null
          review_count?: number
          scored_at?: string | null
          supplier_reputation_score?: number | null
          supplier_verified?: boolean
          trending?: boolean
          updated_at?: string
          verified_warehouse?: number | null
          video_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "cj_product_intelligence_pid_fkey"
            columns: ["pid"]
            isOneToOne: true
            referencedRelation: "cj_raw_products"
            referencedColumns: ["pid"]
          },
        ]
      }
      cj_product_map: {
        Row: {
          cj_pid: string
          created_at: string
          product_id: string
          updated_at: string
        }
        Insert: {
          cj_pid: string
          created_at?: string
          product_id: string
          updated_at?: string
        }
        Update: {
          cj_pid?: string
          created_at?: string
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cj_product_map_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_product_search_index: {
        Row: {
          category: string | null
          description_snippet: string | null
          linked_product_id: string | null
          pid: string
          search_text: string
          sku: string | null
          supplier: string | null
          tags: string[]
          title: string | null
          updated_at: string
          warehouse: string | null
        }
        Insert: {
          category?: string | null
          description_snippet?: string | null
          linked_product_id?: string | null
          pid: string
          search_text?: string
          sku?: string | null
          supplier?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          warehouse?: string | null
        }
        Update: {
          category?: string | null
          description_snippet?: string | null
          linked_product_id?: string | null
          pid?: string
          search_text?: string
          sku?: string | null
          supplier?: string | null
          tags?: string[]
          title?: string | null
          updated_at?: string
          warehouse?: string | null
        }
        Relationships: []
      }
      cj_raw_products: {
        Row: {
          cost: number | null
          country_code: string | null
          created_at: string
          image: string | null
          list_synced_at: string
          orders: number
          pid: string
          raw_payload: Json
          sell_price: number | null
          sku: string | null
          stock: number
          supplier: string | null
          title: string
          updated_at: string
          warehouse: string | null
        }
        Insert: {
          cost?: number | null
          country_code?: string | null
          created_at?: string
          image?: string | null
          list_synced_at?: string
          orders?: number
          pid: string
          raw_payload?: Json
          sell_price?: number | null
          sku?: string | null
          stock?: number
          supplier?: string | null
          title?: string
          updated_at?: string
          warehouse?: string | null
        }
        Update: {
          cost?: number | null
          country_code?: string | null
          created_at?: string
          image?: string | null
          list_synced_at?: string
          orders?: number
          pid?: string
          raw_payload?: Json
          sell_price?: number | null
          sku?: string | null
          stock?: number
          supplier?: string | null
          title?: string
          updated_at?: string
          warehouse?: string | null
        }
        Relationships: []
      }
      cj_scan_failures: {
        Row: {
          attempts: number
          created_at: string
          last_error: string | null
          next_retry_at: string
          pid: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          last_error?: string | null
          next_retry_at?: string
          pid: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          last_error?: string | null
          next_retry_at?: string
          pid?: string
          updated_at?: string
        }
        Relationships: []
      }
      cj_signal_watch_queue: {
        Row: {
          attempts: number
          created_at: string
          last_error: string | null
          next_attempt_at: string
          pid: string
          priority: number
          signals: Json
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          last_error?: string | null
          next_attempt_at?: string
          pid: string
          priority?: number
          signals?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          created_at?: string
          last_error?: string | null
          next_attempt_at?: string
          pid?: string
          priority?: number
          signals?: Json
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      cj_supplier_reputation: {
        Row: {
          blacklisted: boolean
          created_at: string
          last_calculated: string
          metrics: Json
          product_count: number
          reliability_score: number
          reputation_label: string
          reputation_score: number
          shipping_score: number
          stock_stability: number
          supplier_id: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          blacklisted?: boolean
          created_at?: string
          last_calculated?: string
          metrics?: Json
          product_count?: number
          reliability_score?: number
          reputation_label?: string
          reputation_score?: number
          shipping_score?: number
          stock_stability?: number
          supplier_id: string
          supplier_name?: string
          updated_at?: string
        }
        Update: {
          blacklisted?: boolean
          created_at?: string
          last_calculated?: string
          metrics?: Json
          product_count?: number
          reliability_score?: number
          reputation_label?: string
          reputation_score?: number
          shipping_score?: number
          stock_stability?: number
          supplier_id?: string
          supplier_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      cj_sync_logs: {
        Row: {
          error_message: string | null
          finished_at: string | null
          id: string
          started_at: string | null
          status: string | null
          total_errors: number | null
          total_fetched: number | null
          total_saved: number | null
        }
        Insert: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          total_errors?: number | null
          total_fetched?: number | null
          total_saved?: number | null
        }
        Update: {
          error_message?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string | null
          status?: string | null
          total_errors?: number | null
          total_fetched?: number | null
          total_saved?: number | null
        }
        Relationships: []
      }
      cj_tracking: {
        Row: {
          carrier: string | null
          cj_order_id: string | null
          cj_status: string | null
          created_at: string
          id: string
          order_id: string
          raw_response: string | null
          synced_at: string
          tracking_number: string | null
          tracking_url: string | null
        }
        Insert: {
          carrier?: string | null
          cj_order_id?: string | null
          cj_status?: string | null
          created_at?: string
          id?: string
          order_id: string
          raw_response?: string | null
          synced_at?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Update: {
          carrier?: string | null
          cj_order_id?: string | null
          cj_status?: string | null
          created_at?: string
          id?: string
          order_id?: string
          raw_response?: string | null
          synced_at?: string
          tracking_number?: string | null
          tracking_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cj_tracking_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      cj_watcher_state: {
        Row: {
          id: string
          last_list_sync_page: number
          last_raw_pid: string
          last_run_at: string | null
          products_watched: number
          signals_detected: number
          updated_at: string
        }
        Insert: {
          id?: string
          last_list_sync_page?: number
          last_raw_pid?: string
          last_run_at?: string | null
          products_watched?: number
          signals_detected?: number
          updated_at?: string
        }
        Update: {
          id?: string
          last_list_sync_page?: number
          last_raw_pid?: string
          last_run_at?: string | null
          products_watched?: number
          signals_detected?: number
          updated_at?: string
        }
        Relationships: []
      }
      communities: {
        Row: {
          accent_color: string | null
          archived_at: string | null
          archived_by: string | null
          avatar_url: string | null
          banner_url: string | null
          category: string | null
          cover_image: string | null
          created_at: string | null
          currency: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_free: boolean | null
          is_private: boolean | null
          language: string | null
          lifetime_price: number | null
          long_description: string | null
          member_count: number | null
          monthly_price: number | null
          name: string
          owner_id: string
          platform_commission_rate: number | null
          post_count: number | null
          region: string | null
          settings: Json
          slug: string
          space_count: number | null
          tagline: string | null
          tags: string[] | null
          timezone: string | null
          trial_days: number | null
          updated_at: string | null
          visibility: string
          visibility_mode: string
          yearly_price: number | null
        }
        Insert: {
          accent_color?: string | null
          archived_at?: string | null
          archived_by?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_private?: boolean | null
          language?: string | null
          lifetime_price?: number | null
          long_description?: string | null
          member_count?: number | null
          monthly_price?: number | null
          name: string
          owner_id: string
          platform_commission_rate?: number | null
          post_count?: number | null
          region?: string | null
          settings?: Json
          slug: string
          space_count?: number | null
          tagline?: string | null
          tags?: string[] | null
          timezone?: string | null
          trial_days?: number | null
          updated_at?: string | null
          visibility?: string
          visibility_mode?: string
          yearly_price?: number | null
        }
        Update: {
          accent_color?: string | null
          archived_at?: string | null
          archived_by?: string | null
          avatar_url?: string | null
          banner_url?: string | null
          category?: string | null
          cover_image?: string | null
          created_at?: string | null
          currency?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_free?: boolean | null
          is_private?: boolean | null
          language?: string | null
          lifetime_price?: number | null
          long_description?: string | null
          member_count?: number | null
          monthly_price?: number | null
          name?: string
          owner_id?: string
          platform_commission_rate?: number | null
          post_count?: number | null
          region?: string | null
          settings?: Json
          slug?: string
          space_count?: number | null
          tagline?: string | null
          tags?: string[] | null
          timezone?: string | null
          trial_days?: number | null
          updated_at?: string | null
          visibility?: string
          visibility_mode?: string
          yearly_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_auto_moderation_rules: {
        Row: {
          action: string
          community_id: string
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          enabled: boolean
          id: string
          name: string
          rule_key: string
          severity: string
          updated_at: string
        }
        Insert: {
          action?: string
          community_id: string
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name: string
          rule_key: string
          severity?: string
          updated_at?: string
        }
        Update: {
          action?: string
          community_id?: string
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          enabled?: boolean
          id?: string
          name?: string
          rule_key?: string
          severity?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_auto_moderation_rules_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_auto_moderation_rules_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_comment_likes: {
        Row: {
          comment_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          comment_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_comment_likes_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "community_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_comment_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_content_reports: {
        Row: {
          ai_classification: Json
          assigned_moderator_id: string | null
          community_id: string
          content_deleted_at: string | null
          content_preview: string | null
          created_at: string
          details: string | null
          evidence: Json
          id: string
          internal_note: string | null
          queue: string
          reason: string
          reported_user_id: string | null
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          risk_level: string
          status: string
          target_id: string
          target_type: string
          updated_at: string
        }
        Insert: {
          ai_classification?: Json
          assigned_moderator_id?: string | null
          community_id: string
          content_deleted_at?: string | null
          content_preview?: string | null
          created_at?: string
          details?: string | null
          evidence?: Json
          id?: string
          internal_note?: string | null
          queue?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
        }
        Update: {
          ai_classification?: Json
          assigned_moderator_id?: string | null
          community_id?: string
          content_deleted_at?: string | null
          content_preview?: string | null
          created_at?: string
          details?: string | null
          evidence?: Json
          id?: string
          internal_note?: string | null
          queue?: string
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          risk_level?: string
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_content_reports_assigned_moderator_id_fkey"
            columns: ["assigned_moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_content_reports_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_content_reports_reported_user_id_fkey"
            columns: ["reported_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_content_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_courses: {
        Row: {
          archived_at: string | null
          category: string | null
          certificate_enabled: boolean
          community_id: string
          created_at: string | null
          creator_id: string
          currency: string
          description: string | null
          difficulty: string | null
          id: string
          is_published: boolean | null
          price_cents: number | null
          published_at: string | null
          room_id: string
          tags: string[]
          thumbnail_url: string | null
          title: string
          total_duration: number | null
          total_lessons: number | null
          total_modules: number | null
          trailer_url: string | null
          updated_at: string | null
        }
        Insert: {
          archived_at?: string | null
          category?: string | null
          certificate_enabled?: boolean
          community_id: string
          created_at?: string | null
          creator_id: string
          currency?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          price_cents?: number | null
          published_at?: string | null
          room_id: string
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          total_duration?: number | null
          total_lessons?: number | null
          total_modules?: number | null
          trailer_url?: string | null
          updated_at?: string | null
        }
        Update: {
          archived_at?: string | null
          category?: string | null
          certificate_enabled?: boolean
          community_id?: string
          created_at?: string | null
          creator_id?: string
          currency?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          price_cents?: number | null
          published_at?: string | null
          room_id?: string
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          total_duration?: number | null
          total_lessons?: number | null
          total_modules?: number | null
          trailer_url?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_courses_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_courses_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_courses_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_custom_roles: {
        Row: {
          archived_at: string | null
          capabilities: Json
          channel_ids: string[]
          color: string | null
          community_id: string
          created_at: string
          created_by: string | null
          description: string | null
          group_ids: string[]
          icon: string | null
          id: string
          inherits_from: string
          is_default_assignment: boolean
          is_system: boolean
          name: string
          priority: number
          slug: string
          template_key: string | null
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          capabilities?: Json
          channel_ids?: string[]
          color?: string | null
          community_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_ids?: string[]
          icon?: string | null
          id?: string
          inherits_from?: string
          is_default_assignment?: boolean
          is_system?: boolean
          name: string
          priority?: number
          slug: string
          template_key?: string | null
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          capabilities?: Json
          channel_ids?: string[]
          color?: string | null
          community_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          group_ids?: string[]
          icon?: string | null
          id?: string
          inherits_from?: string
          is_default_assignment?: boolean
          is_system?: boolean
          name?: string
          priority?: number
          slug?: string
          template_key?: string | null
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_custom_roles_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_custom_roles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_event_rsvps: {
        Row: {
          created_at: string
          event_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_event_rsvps_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "community_events"
            referencedColumns: ["id"]
          },
        ]
      }
      community_events: {
        Row: {
          capacity: number | null
          community_id: string
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          image_url: string | null
          is_online: boolean
          is_published: boolean
          kind: string
          location: string | null
          meeting_url: string | null
          reminder_sent_at: string | null
          rsvp_count: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          community_id: string
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_online?: boolean
          is_published?: boolean
          kind?: string
          location?: string | null
          meeting_url?: string | null
          reminder_sent_at?: string | null
          rsvp_count?: number
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          community_id?: string
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          image_url?: string | null
          is_online?: boolean
          is_published?: boolean
          kind?: string
          location?: string | null
          meeting_url?: string | null
          reminder_sent_at?: string | null
          rsvp_count?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_inbox_conversations: {
        Row: {
          community_id: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_high: string
          user_low: string
        }
        Insert: {
          community_id: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_high: string
          user_low: string
        }
        Update: {
          community_id?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_high?: string
          user_low?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_inbox_conversations_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_inbox_conversations_user_high_fkey"
            columns: ["user_high"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_inbox_conversations_user_low_fkey"
            columns: ["user_low"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_inbox_messages: {
        Row: {
          attachments: Json | null
          body: string
          conversation_id: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean
          message_type: string | null
          reactions: Json | null
          reply_to_body: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          body?: string
          conversation_id: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean
          message_type?: string | null
          reactions?: Json | null
          reply_to_body?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          conversation_id?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean
          message_type?: string | null
          reactions?: Json | null
          reply_to_body?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_inbox_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "community_inbox_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_inbox_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          code: string
          community_id: string
          created_at: string
          created_by: string
          email: string | null
          expires_at: string | null
          id: string
          max_uses: number | null
          note: string | null
          role: string
          status: string
          updated_at: string
          uses_count: number
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          code: string
          community_id: string
          created_at?: string
          created_by: string
          email?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          note?: string | null
          role?: string
          status?: string
          updated_at?: string
          uses_count?: number
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          code?: string
          community_id?: string
          created_at?: string
          created_by?: string
          email?: string | null
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          note?: string | null
          role?: string
          status?: string
          updated_at?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_invites_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_join_requests: {
        Row: {
          community_id: string
          created_at: string
          id: string
          reason: string | null
          referral_code: string | null
          referred_by: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          id?: string
          reason?: string | null
          referral_code?: string | null
          referred_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          referral_code?: string | null
          referred_by?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_join_requests_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_join_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_member_notes: {
        Row: {
          author_id: string
          body: string
          community_id: string
          created_at: string
          id: string
          membership_id: string
          target_user_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          community_id: string
          created_at?: string
          id?: string
          membership_id: string
          target_user_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          community_id?: string
          created_at?: string
          id?: string
          membership_id?: string
          target_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_notes_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_notes_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "community_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_notes_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_member_visits: {
        Row: {
          community_id: string
          created_at: string
          last_channel_id: string | null
          last_path: string | null
          last_visited_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          last_channel_id?: string | null
          last_path?: string | null
          last_visited_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          last_channel_id?: string | null
          last_path?: string | null
          last_visited_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_member_visits_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_visits_last_channel_id_fkey"
            columns: ["last_channel_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_member_visits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_membership_tiers: {
        Row: {
          community_id: string
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          plan_type: string
          price: number
          slug: string
          sort_order: number
          space_access: string[]
          trial_days: number
          updated_at: string
        }
        Insert: {
          community_id: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          plan_type: string
          price?: number
          slug: string
          sort_order?: number
          space_access?: string[]
          trial_days?: number
          updated_at?: string
        }
        Update: {
          community_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          plan_type?: string
          price?: number
          slug?: string
          sort_order?: number
          space_access?: string[]
          trial_days?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_membership_tiers_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_memberships: {
        Row: {
          amount_paid: number | null
          ban_reason: string | null
          billing_interval: string | null
          cancel_at_period_end: boolean
          cancelled_at: string | null
          community_id: string
          contribution_score: number
          created_at: string | null
          creator_score: number
          custom_role_id: string | null
          expires_at: string | null
          id: string
          last_active_at: string | null
          muted_until: string | null
          notification_mutes: Json
          payment_provider: string | null
          payment_reference: string | null
          plan_type: string | null
          role: string | null
          space_access: string[] | null
          status: string | null
          subscribed_at: string | null
          suspended_until: string | null
          tier_id: string | null
          timeout_until: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          ban_reason?: string | null
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          community_id: string
          contribution_score?: number
          created_at?: string | null
          creator_score?: number
          custom_role_id?: string | null
          expires_at?: string | null
          id?: string
          last_active_at?: string | null
          muted_until?: string | null
          notification_mutes?: Json
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: string | null
          role?: string | null
          space_access?: string[] | null
          status?: string | null
          subscribed_at?: string | null
          suspended_until?: string | null
          tier_id?: string | null
          timeout_until?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          ban_reason?: string | null
          billing_interval?: string | null
          cancel_at_period_end?: boolean
          cancelled_at?: string | null
          community_id?: string
          contribution_score?: number
          created_at?: string | null
          creator_score?: number
          custom_role_id?: string | null
          expires_at?: string | null
          id?: string
          last_active_at?: string | null
          muted_until?: string | null
          notification_mutes?: Json
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: string | null
          role?: string | null
          space_access?: string[] | null
          status?: string | null
          subscribed_at?: string | null
          suspended_until?: string | null
          tier_id?: string | null
          timeout_until?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_memberships_custom_role_id_fkey"
            columns: ["custom_role_id"]
            isOneToOne: false
            referencedRelation: "community_custom_roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "community_membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          attachments: Json | null
          body: string | null
          community_id: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          message_type: string | null
          metadata: Json | null
          pinned_at: string | null
          pinned_by: string | null
          reactions: Json | null
          reply_count: number | null
          reply_to_body: string | null
          reply_to_id: string | null
          reply_to_sender: string | null
          room_id: string
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          community_id: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json | null
          reply_count?: number | null
          reply_to_body?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          room_id: string
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          community_id?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          message_type?: string | null
          metadata?: Json | null
          pinned_at?: string | null
          pinned_by?: string | null
          reactions?: Json | null
          reply_count?: number | null
          reply_to_body?: string | null
          reply_to_id?: string | null
          reply_to_sender?: string | null
          room_id?: string
          sender_id?: string
          thread_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_deleted_by_fkey"
            columns: ["deleted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_pinned_by_fkey"
            columns: ["pinned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "community_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      community_moderation_appeals: {
        Row: {
          appellant_id: string
          community_id: string
          created_at: string
          evidence: Json
          id: string
          membership_id: string | null
          reason: string
          related_log_id: string | null
          related_report_id: string | null
          resolved_at: string | null
          reviewer_id: string | null
          reviewer_note: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appellant_id: string
          community_id: string
          created_at?: string
          evidence?: Json
          id?: string
          membership_id?: string | null
          reason: string
          related_log_id?: string | null
          related_report_id?: string | null
          resolved_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appellant_id?: string
          community_id?: string
          created_at?: string
          evidence?: Json
          id?: string
          membership_id?: string | null
          reason?: string
          related_log_id?: string | null
          related_report_id?: string | null
          resolved_at?: string | null
          reviewer_id?: string | null
          reviewer_note?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_moderation_appeals_appellant_id_fkey"
            columns: ["appellant_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_appeals_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_appeals_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "community_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_appeals_related_log_id_fkey"
            columns: ["related_log_id"]
            isOneToOne: false
            referencedRelation: "community_moderation_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_appeals_related_report_id_fkey"
            columns: ["related_report_id"]
            isOneToOne: false
            referencedRelation: "community_content_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_appeals_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_moderation_logs: {
        Row: {
          action: string
          community_id: string
          created_at: string
          id: string
          metadata: Json
          moderator_id: string
          reason: string | null
          target_user_id: string
        }
        Insert: {
          action: string
          community_id: string
          created_at?: string
          id?: string
          metadata?: Json
          moderator_id: string
          reason?: string | null
          target_user_id: string
        }
        Update: {
          action?: string
          community_id?: string
          created_at?: string
          id?: string
          metadata?: Json
          moderator_id?: string
          reason?: string | null
          target_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_moderation_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_logs_moderator_id_fkey"
            columns: ["moderator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_moderation_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_payments: {
        Row: {
          amount: number
          community_id: string
          created_at: string | null
          creator_earnings: number | null
          currency: string | null
          id: string
          membership_id: string
          payment_provider: string | null
          payment_reference: string | null
          plan_type: string
          platform_commission: number | null
          status: string | null
          user_id: string
        }
        Insert: {
          amount: number
          community_id: string
          created_at?: string | null
          creator_earnings?: number | null
          currency?: string | null
          id?: string
          membership_id: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type: string
          platform_commission?: number | null
          status?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          community_id?: string
          created_at?: string | null
          creator_earnings?: number | null
          currency?: string | null
          id?: string
          membership_id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: string
          platform_commission?: number | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_payments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "community_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string | null
          edited_at: string | null
          id: string
          is_pinned: boolean
          is_published: boolean | null
          like_count: number | null
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          edited_at?: string | null
          id?: string
          is_pinned?: boolean
          is_published?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "community_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_likes: {
        Row: {
          created_at: string | null
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reaction: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reaction: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reaction?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_shares: {
        Row: {
          created_at: string
          id: string
          post_id: string
          share_type: string
          target_community_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          share_type?: string
          target_community_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          share_type?: string
          target_community_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_post_shares_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_shares_target_community_id_fkey"
            columns: ["target_community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_shares_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_post_views: {
        Row: {
          completion_pct: number
          created_at: string
          id: string
          post_id: string
          session_id: string | null
          user_id: string | null
          viewed_on: string
          watch_ms: number
        }
        Insert: {
          completion_pct?: number
          created_at?: string
          id?: string
          post_id: string
          session_id?: string | null
          user_id?: string | null
          viewed_on?: string
          watch_ms?: number
        }
        Update: {
          completion_pct?: number
          created_at?: string
          id?: string
          post_id?: string
          session_id?: string | null
          user_id?: string | null
          viewed_on?: string
          watch_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_post_views_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_post_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_posts: {
        Row: {
          archived_at: string | null
          attachments: Json | null
          audience: string
          author_id: string
          body: string
          comment_count: number | null
          comments_disabled: boolean
          community_id: string
          created_at: string | null
          id: string
          images: Json | null
          is_exclusive: boolean | null
          is_pinned: boolean | null
          is_published: boolean | null
          like_count: number | null
          post_type: string | null
          published_at: string | null
          quote_of_post_id: string | null
          reaction_counts: Json
          room_id: string
          scheduled_at: string | null
          share_count: number | null
          space_id: string
          title: string | null
          unique_view_count: number
          updated_at: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          archived_at?: string | null
          attachments?: Json | null
          audience?: string
          author_id: string
          body: string
          comment_count?: number | null
          comments_disabled?: boolean
          community_id: string
          created_at?: string | null
          id?: string
          images?: Json | null
          is_exclusive?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          post_type?: string | null
          published_at?: string | null
          quote_of_post_id?: string | null
          reaction_counts?: Json
          room_id: string
          scheduled_at?: string | null
          share_count?: number | null
          space_id: string
          title?: string | null
          unique_view_count?: number
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          archived_at?: string | null
          attachments?: Json | null
          audience?: string
          author_id?: string
          body?: string
          comment_count?: number | null
          comments_disabled?: boolean
          community_id?: string
          created_at?: string | null
          id?: string
          images?: Json | null
          is_exclusive?: boolean | null
          is_pinned?: boolean | null
          is_published?: boolean | null
          like_count?: number | null
          post_type?: string | null
          published_at?: string | null
          quote_of_post_id?: string | null
          reaction_counts?: Json
          room_id?: string
          scheduled_at?: string | null
          share_count?: number | null
          space_id?: string
          title?: string | null
          unique_view_count?: number
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "community_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_quote_of_post_id_fkey"
            columns: ["quote_of_post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_posts_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      community_role_audit_logs: {
        Row: {
          action: string
          actor_id: string
          after_state: Json
          before_state: Json
          community_id: string
          created_at: string
          id: string
          reason: string | null
          role_id: string | null
          role_name: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id: string
          after_state?: Json
          before_state?: Json
          community_id: string
          created_at?: string
          id?: string
          reason?: string | null
          role_id?: string | null
          role_name?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string
          after_state?: Json
          before_state?: Json
          community_id?: string
          created_at?: string
          id?: string
          reason?: string | null
          role_id?: string | null
          role_name?: string | null
          target_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_role_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_role_audit_logs_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_role_audit_logs_target_user_id_fkey"
            columns: ["target_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_saved_posts: {
        Row: {
          collection_id: string | null
          created_at: string | null
          id: string
          offline_meta: Json
          post_id: string
          user_id: string
        }
        Insert: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          offline_meta?: Json
          post_id: string
          user_id: string
        }
        Update: {
          collection_id?: string | null
          created_at?: string | null
          id?: string
          offline_meta?: Json
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_saved_posts_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "bookmark_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_saved_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "community_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_saved_posts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_stories: {
        Row: {
          author_id: string
          caption: string | null
          community_id: string | null
          created_at: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
          mentions: Json
          privacy: string
          reply_count: number
          thumbnail_url: string | null
          unique_view_count: number
          updated_at: string
          view_count: number
        }
        Insert: {
          author_id: string
          caption?: string | null
          community_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url: string
          mentions?: Json
          privacy?: string
          reply_count?: number
          thumbnail_url?: string | null
          unique_view_count?: number
          updated_at?: string
          view_count?: number
        }
        Update: {
          author_id?: string
          caption?: string | null
          community_id?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
          mentions?: Json
          privacy?: string
          reply_count?: number
          thumbnail_url?: string | null
          unique_view_count?: number
          updated_at?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_stories_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_stories_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      community_story_analytics: {
        Row: {
          author_id: string
          avg_completion_pct: number
          avg_watch_ms: number
          replies: number
          retained_until: string
          story_id: string
          unique_viewers: number
          updated_at: string
          views: number
        }
        Insert: {
          author_id: string
          avg_completion_pct?: number
          avg_watch_ms?: number
          replies?: number
          retained_until?: string
          story_id: string
          unique_viewers?: number
          updated_at?: string
          views?: number
        }
        Update: {
          author_id?: string
          avg_completion_pct?: number
          avg_watch_ms?: number
          replies?: number
          retained_until?: string
          story_id?: string
          unique_viewers?: number
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_story_analytics_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_story_analytics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: true
            referencedRelation: "community_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      community_story_replies: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          story_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          story_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_story_replies_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_story_replies_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "community_stories"
            referencedColumns: ["id"]
          },
        ]
      }
      community_story_views: {
        Row: {
          completion_pct: number
          created_at: string
          id: string
          story_id: string
          user_id: string
          watch_ms: number
        }
        Insert: {
          completion_pct?: number
          created_at?: string
          id?: string
          story_id: string
          user_id: string
          watch_ms?: number
        }
        Update: {
          completion_pct?: number
          created_at?: string
          id?: string
          story_id?: string
          user_id?: string
          watch_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "community_story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "community_stories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_story_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_subscription_events: {
        Row: {
          amount: number | null
          community_id: string
          created_at: string
          currency: string | null
          event_type: string
          from_plan: string | null
          from_tier_id: string | null
          id: string
          membership_id: string | null
          metadata: Json
          to_plan: string | null
          to_tier_id: string | null
          user_id: string
        }
        Insert: {
          amount?: number | null
          community_id: string
          created_at?: string
          currency?: string | null
          event_type: string
          from_plan?: string | null
          from_tier_id?: string | null
          id?: string
          membership_id?: string | null
          metadata?: Json
          to_plan?: string | null
          to_tier_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number | null
          community_id?: string
          created_at?: string
          currency?: string | null
          event_type?: string
          from_plan?: string | null
          from_tier_id?: string | null
          id?: string
          membership_id?: string | null
          metadata?: Json
          to_plan?: string | null
          to_tier_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_subscription_events_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_subscription_events_from_tier_id_fkey"
            columns: ["from_tier_id"]
            isOneToOne: false
            referencedRelation: "community_membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_subscription_events_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "community_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_subscription_events_to_tier_id_fkey"
            columns: ["to_tier_id"]
            isOneToOne: false
            referencedRelation: "community_membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_subscription_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_tasks: {
        Row: {
          community_id: string
          completion_count: number | null
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: string | null
          due_date: string | null
          id: string
          is_active: boolean | null
          is_recurring: boolean | null
          points: number | null
          recurrence_days: number | null
          room_id: string
          task_type: string | null
          title: string
        }
        Insert: {
          community_id: string
          completion_count?: number | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          points?: number | null
          recurrence_days?: number | null
          room_id: string
          task_type?: string | null
          title: string
        }
        Update: {
          community_id?: string
          completion_count?: number | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          due_date?: string | null
          id?: string
          is_active?: boolean | null
          is_recurring?: boolean | null
          points?: number | null
          recurrence_days?: number | null
          room_id?: string
          task_type?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_tasks_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tasks_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_tasks_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_messages: {
        Row: {
          body: string | null
          conversation_id: string
          created_at: string
          id: string
          message_type: string
          metadata: Json
          reply_to_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          conversation_id: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          conversation_id?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          reply_to_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_reply_to_id_fkey"
            columns: ["reply_to_id"]
            isOneToOne: false
            referencedRelation: "conversation_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      course_certificates: {
        Row: {
          certificate_code: string
          course_id: string
          id: string
          issued_at: string
          pdf_url: string | null
          user_id: string
        }
        Insert: {
          certificate_code: string
          course_id: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id: string
        }
        Update: {
          certificate_code?: string
          course_id?: string
          id?: string
          issued_at?: string
          pdf_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_certificates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_enrollments: {
        Row: {
          amount_cents: number | null
          course_id: string
          created_at: string
          currency: string | null
          enrolled_at: string
          id: string
          order_id: string | null
          revoked_at: string | null
          source: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_cents?: number | null
          course_id: string
          created_at?: string
          currency?: string | null
          enrolled_at?: string
          id?: string
          order_id?: string | null
          revoked_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_cents?: number | null
          course_id?: string
          created_at?: string
          currency?: string | null
          enrolled_at?: string
          id?: string
          order_id?: string | null
          revoked_at?: string | null
          source?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          attachments: Json | null
          body: string | null
          course_id: string
          created_at: string | null
          duration: number | null
          id: string
          is_free: boolean | null
          module_id: string
          sort_order: number | null
          title: string
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          course_id: string
          created_at?: string | null
          duration?: number | null
          id?: string
          is_free?: boolean | null
          module_id: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          course_id?: string
          created_at?: string | null
          duration?: number | null
          id?: string
          is_free?: boolean | null
          module_id?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          created_at: string | null
          description: string | null
          id: string
          is_free: boolean | null
          sort_order: number | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free?: boolean | null
          sort_order?: number | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_free?: boolean | null
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quiz_attempts: {
        Row: {
          answers: Json
          created_at: string
          id: string
          passed: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id: string
          score: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          passed?: boolean
          quiz_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "course_quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quiz_attempts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_quizzes: {
        Row: {
          course_id: string
          created_at: string
          id: string
          lesson_id: string
          pass_score: number
          questions: Json
          title: string
          updated_at: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          lesson_id: string
          pass_score?: number
          questions?: Json
          title: string
          updated_at?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          lesson_id?: string
          pass_score?: number
          questions?: Json
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: true
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_payout_methods: {
        Row: {
          account_details: Json
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          method: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_details?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          method: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_details?: Json
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          method?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_payout_methods_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_access: {
        Row: {
          access_url: string | null
          download_count: number
          download_limit: number | null
          expires_at: string | null
          granted_at: string
          id: string
          last_accessed_at: string | null
          last_download_at: string | null
          license_key: string | null
          order_id: string | null
          order_item_id: string | null
          product_id: string
          revoke_reason: string | null
          revoked_at: string | null
          subtype: string | null
          user_id: string
        }
        Insert: {
          access_url?: string | null
          download_count?: number
          download_limit?: number | null
          expires_at?: string | null
          granted_at?: string
          id?: string
          last_accessed_at?: string | null
          last_download_at?: string | null
          license_key?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_id: string
          revoke_reason?: string | null
          revoked_at?: string | null
          subtype?: string | null
          user_id: string
        }
        Update: {
          access_url?: string | null
          download_count?: number
          download_limit?: number | null
          expires_at?: string | null
          granted_at?: string
          id?: string
          last_accessed_at?: string | null
          last_download_at?: string | null
          license_key?: string | null
          order_id?: string | null
          order_item_id?: string | null
          product_id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          subtype?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_access_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_access_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_access_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_access_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_download_events: {
        Row: {
          access_id: string
          created_at: string
          id: string
          ip: unknown
          product_id: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          access_id: string
          created_at?: string
          id?: string
          ip?: unknown
          product_id: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          access_id?: string
          created_at?: string
          id?: string
          ip?: unknown
          product_id?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_download_events_access_id_fkey"
            columns: ["access_id"]
            isOneToOne: false
            referencedRelation: "digital_access"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_download_events_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_download_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      digital_product_versions: {
        Row: {
          changelog: string | null
          checksum: string | null
          created_at: string
          created_by: string
          file_size: number | null
          file_url: string
          id: string
          product_id: string
          version: string
        }
        Insert: {
          changelog?: string | null
          checksum?: string | null
          created_at?: string
          created_by: string
          file_size?: number | null
          file_url: string
          id?: string
          product_id: string
          version: string
        }
        Update: {
          changelog?: string | null
          checksum?: string | null
          created_at?: string
          created_by?: string
          file_size?: number | null
          file_url?: string
          id?: string
          product_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_product_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_product_versions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discovery_views: {
        Row: {
          entity_id: string
          entity_type: string
          href: string | null
          id: string
          metadata: Json
          title: string | null
          user_id: string
          viewed_at: string
        }
        Insert: {
          entity_id: string
          entity_type: string
          href?: string | null
          id?: string
          metadata?: Json
          title?: string | null
          user_id: string
          viewed_at?: string
        }
        Update: {
          entity_id?: string
          entity_type?: string
          href?: string | null
          id?: string
          metadata?: Json
          title?: string | null
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discovery_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rate_logs: {
        Row: {
          from_currency: string
          id: string
          order_id: string | null
          rate: number
          recorded_at: string | null
          to_currency: string
        }
        Insert: {
          from_currency: string
          id?: string
          order_id?: string | null
          rate: number
          recorded_at?: string | null
          to_currency: string
        }
        Update: {
          from_currency?: string
          id?: string
          order_id?: string | null
          rate?: number
          recorded_at?: string | null
          to_currency?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rate_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      failed_wallet_credits: {
        Row: {
          amount: number
          created_at: string | null
          currency: string
          id: string
          order_id: string | null
          reason: string | null
          resolved: boolean | null
          resolved_at: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string
          id?: string
          order_id?: string | null
          reason?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "failed_wallet_credits_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "failed_wallet_credits_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_campaigns: {
        Row: {
          channel: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          metadata: Json
          name: string
          slug: string
          starts_at: string | null
          status: string
        }
        Insert: {
          channel: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          name: string
          slug: string
          starts_at?: string | null
          status?: string
        }
        Update: {
          channel?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          starts_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_campaigns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          properties?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "growth_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      growth_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          campaign_id: string | null
          code: string
          created_at: string
          expires_at: string | null
          id: string
          invitee_email: string | null
          inviter_id: string | null
          metadata: Json
          status: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          campaign_id?: string | null
          code: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          inviter_id?: string | null
          metadata?: Json
          status?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          campaign_id?: string | null
          code?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          invitee_email?: string | null
          inviter_id?: string | null
          metadata?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "growth_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_invites_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "growth_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "growth_invites_inviter_id_fkey"
            columns: ["inviter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      influencers: {
        Row: {
          available_balance: number | null
          bio: string | null
          cover_image: string | null
          created_at: string | null
          display_name: string
          engagement_rate: number | null
          guidelines_accepted_at: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          is_verified: boolean | null
          niche: string[] | null
          pending_balance: number | null
          profile_image: string | null
          rating: number | null
          social_platforms: Json | null
          total_campaigns: number | null
          total_earnings: number | null
          total_followers: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          display_name: string
          engagement_rate?: number | null
          guidelines_accepted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          niche?: string[] | null
          pending_balance?: number | null
          profile_image?: string | null
          rating?: number | null
          social_platforms?: Json | null
          total_campaigns?: number | null
          total_earnings?: number | null
          total_followers?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          bio?: string | null
          cover_image?: string | null
          created_at?: string | null
          display_name?: string
          engagement_rate?: number | null
          guidelines_accepted_at?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          is_verified?: boolean | null
          niche?: string[] | null
          pending_balance?: number | null
          profile_image?: string | null
          rating?: number | null
          social_platforms?: Json | null
          total_campaigns?: number | null
          total_earnings?: number | null
          total_followers?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "influencers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_ai_insights: {
        Row: {
          computed_at: string
          growth_roadmap: string[]
          opportunities: string[]
          posting_schedule: Json
          raw: Json
          recommended_campaigns: string[]
          recommended_products: string[]
          revenue_opportunities: string[]
          strengths: string[]
          summary: string | null
          user_id: string
          weaknesses: string[]
        }
        Insert: {
          computed_at?: string
          growth_roadmap?: string[]
          opportunities?: string[]
          posting_schedule?: Json
          raw?: Json
          recommended_campaigns?: string[]
          recommended_products?: string[]
          revenue_opportunities?: string[]
          strengths?: string[]
          summary?: string | null
          user_id: string
          weaknesses?: string[]
        }
        Update: {
          computed_at?: string
          growth_roadmap?: string[]
          opportunities?: string[]
          posting_schedule?: Json
          raw?: Json
          recommended_campaigns?: string[]
          recommended_products?: string[]
          revenue_opportunities?: string[]
          strengths?: string[]
          summary?: string | null
          user_id?: string
          weaknesses?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "jip_ai_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_availability_slots: {
        Row: {
          created_at: string
          end_time: string
          id: string
          is_active: boolean
          start_time: string
          timezone: string
          user_id: string
          weekday: number
        }
        Insert: {
          created_at?: string
          end_time: string
          id?: string
          is_active?: boolean
          start_time: string
          timezone?: string
          user_id: string
          weekday: number
        }
        Update: {
          created_at?: string
          end_time?: string
          id?: string
          is_active?: boolean
          start_time?: string
          timezone?: string
          user_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "jip_availability_slots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_badges: {
        Row: {
          category: string
          description: string | null
          icon: string | null
          id: string
          name: string
          xp_reward: number
        }
        Insert: {
          category?: string
          description?: string | null
          icon?: string | null
          id: string
          name: string
          xp_reward?: number
        }
        Update: {
          category?: string
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          xp_reward?: number
        }
        Relationships: []
      }
      jip_bookings: {
        Row: {
          brand_user_id: string
          created_at: string
          creator_id: string
          duration_minutes: number
          id: string
          meeting_link: string | null
          message: string | null
          scheduled_at: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          brand_user_id: string
          created_at?: string
          creator_id: string
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          message?: string | null
          scheduled_at?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          brand_user_id?: string
          created_at?: string
          creator_id?: string
          duration_minutes?: number
          id?: string
          meeting_link?: string | null
          message?: string | null
          scheduled_at?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_bookings_brand_user_id_fkey"
            columns: ["brand_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jip_bookings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_identity: {
        Row: {
          admin_notes: string | null
          ai_score: number
          availability: string
          availability_note: string | null
          contact_preferences: Json
          cover_image: string | null
          created_at: string
          creator_level: string
          documents_verified: boolean
          equipment: string[]
          headline: string | null
          identity_verified: boolean
          industries: string[]
          languages: string[]
          media_kit_url: string | null
          overall_rank: number | null
          privacy_custom: Json
          privacy_visibility: string
          reputation_score: number
          skills: string[]
          social_verified: boolean
          specialties: string[]
          trust_score: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          admin_notes?: string | null
          ai_score?: number
          availability?: string
          availability_note?: string | null
          contact_preferences?: Json
          cover_image?: string | null
          created_at?: string
          creator_level?: string
          documents_verified?: boolean
          equipment?: string[]
          headline?: string | null
          identity_verified?: boolean
          industries?: string[]
          languages?: string[]
          media_kit_url?: string | null
          overall_rank?: number | null
          privacy_custom?: Json
          privacy_visibility?: string
          reputation_score?: number
          skills?: string[]
          social_verified?: boolean
          specialties?: string[]
          trust_score?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          admin_notes?: string | null
          ai_score?: number
          availability?: string
          availability_note?: string | null
          contact_preferences?: Json
          cover_image?: string | null
          created_at?: string
          creator_level?: string
          documents_verified?: boolean
          equipment?: string[]
          headline?: string | null
          identity_verified?: boolean
          industries?: string[]
          languages?: string[]
          media_kit_url?: string | null
          overall_rank?: number | null
          privacy_custom?: Json
          privacy_visibility?: string
          reputation_score?: number
          skills?: string[]
          social_verified?: boolean
          specialties?: string[]
          trust_score?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "jip_identity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_milestones: {
        Row: {
          achieved_at: string
          code: string
          description: string | null
          id: string
          title: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          code: string
          description?: string | null
          id?: string
          title: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          code?: string
          description?: string | null
          id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_milestones_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_portfolio_items: {
        Row: {
          brand_name: string | null
          campaign_id: string | null
          created_at: string
          description: string | null
          external_url: string | null
          id: string
          is_featured: boolean
          is_public: boolean
          kind: string
          media_url: string | null
          sort_order: number
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_name?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          kind: string
          media_url?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_name?: string | null
          campaign_id?: string | null
          created_at?: string
          description?: string | null
          external_url?: string | null
          id?: string
          is_featured?: boolean
          is_public?: boolean
          kind?: string
          media_url?: string | null
          sort_order?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_portfolio_items_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_resume_entries: {
        Row: {
          created_at: string
          description: string | null
          ended_on: string | null
          entry_type: string
          id: string
          is_current: boolean
          organization: string | null
          sort_order: number
          started_on: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          ended_on?: string | null
          entry_type: string
          id?: string
          is_current?: boolean
          organization?: string | null
          sort_order?: number
          started_on?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          ended_on?: string | null
          entry_type?: string
          id?: string
          is_current?: boolean
          organization?: string | null
          sort_order?: number
          started_on?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_resume_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_social_accounts: {
        Row: {
          avg_views: number
          created_at: string
          engagement_rate: number
          followers: number
          handle: string | null
          id: string
          is_verified: boolean
          metadata: Json
          platform: string
          updated_at: string
          url: string | null
          user_id: string
          verification_method: string | null
          verified_at: string | null
        }
        Insert: {
          avg_views?: number
          created_at?: string
          engagement_rate?: number
          followers?: number
          handle?: string | null
          id?: string
          is_verified?: boolean
          metadata?: Json
          platform: string
          updated_at?: string
          url?: string | null
          user_id: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Update: {
          avg_views?: number
          created_at?: string
          engagement_rate?: number
          followers?: number
          handle?: string | null
          id?: string
          is_verified?: boolean
          metadata?: Json
          platform?: string
          updated_at?: string
          url?: string | null
          user_id?: string
          verification_method?: string | null
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jip_social_accounts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_testimonials: {
        Row: {
          author_company: string | null
          author_name: string
          author_role: string | null
          created_at: string
          id: string
          is_public: boolean
          quote: string
          rating: number | null
          user_id: string
        }
        Insert: {
          author_company?: string | null
          author_name: string
          author_role?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          quote: string
          rating?: number | null
          user_id: string
        }
        Update: {
          author_company?: string | null
          author_name?: string
          author_role?: string | null
          created_at?: string
          id?: string
          is_public?: boolean
          quote?: string
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_testimonials_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_user_badges: {
        Row: {
          awarded_at: string
          badge_id: string
          user_id: string
        }
        Insert: {
          awarded_at?: string
          badge_id: string
          user_id: string
        }
        Update: {
          awarded_at?: string
          badge_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "jip_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jip_user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jip_verification_requests: {
        Row: {
          admin_id: string | null
          created_at: string
          decided_at: string | null
          decision_note: string | null
          id: string
          payload: Json
          request_type: string
          status: string
          user_id: string
        }
        Insert: {
          admin_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          payload?: Json
          request_type: string
          status?: string
          user_id: string
        }
        Update: {
          admin_id?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          id?: string
          payload?: Json
          request_type?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jip_verification_requests_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jip_verification_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_position_seconds: number
          lesson_id: string
          updated_at: string
          user_id: string
          watch_time: number | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number
          lesson_id: string
          updated_at?: string
          user_id: string
          watch_time?: number | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_position_seconds?: number
          lesson_id?: string
          updated_at?: string
          user_id?: string
          watch_time?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "community_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "course_lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_poll_votes: {
        Row: {
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "live_polls"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_poll_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_polls: {
        Row: {
          created_at: string
          created_by: string
          ended_at: string | null
          id: string
          options: Json
          question: string
          session_id: string
          status: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ended_at?: string | null
          id?: string
          options?: Json
          question: string
          session_id: string
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ended_at?: string | null
          id?: string
          options?: Json
          question?: string
          session_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_polls_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_polls_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_recordings: {
        Row: {
          byte_size: number | null
          cloudinary_public_id: string | null
          cloudinary_url: string | null
          community_id: string | null
          created_at: string
          duration_seconds: number | null
          egress_id: string | null
          ended_at: string | null
          error: string | null
          id: string
          session_id: string
          started_at: string
          started_by: string
          status: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          byte_size?: number | null
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          community_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          egress_id?: string | null
          ended_at?: string | null
          error?: string | null
          id?: string
          session_id: string
          started_at?: string
          started_by: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          byte_size?: number | null
          cloudinary_public_id?: string | null
          cloudinary_url?: string | null
          community_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          egress_id?: string | null
          ended_at?: string | null
          error?: string | null
          id?: string
          session_id?: string
          started_at?: string
          started_by?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_recordings_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_recordings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          message_type: string
          metadata: Json
          session_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          session_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          message_type?: string
          metadata?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_messages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_participants: {
        Row: {
          cam_on: boolean | null
          connection_id: string | null
          created_at: string
          hand_raised: boolean | null
          id: string
          joined_at: string
          left_at: string | null
          metadata: Json
          mic_on: boolean | null
          role: string
          session_id: string
          sharing: boolean | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cam_on?: boolean | null
          connection_id?: string | null
          created_at?: string
          hand_raised?: boolean | null
          id?: string
          joined_at?: string
          left_at?: string | null
          metadata?: Json
          mic_on?: boolean | null
          role?: string
          session_id: string
          sharing?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cam_on?: boolean | null
          connection_id?: string | null
          created_at?: string
          hand_raised?: boolean | null
          id?: string
          joined_at?: string
          left_at?: string | null
          metadata?: Json
          mic_on?: boolean | null
          role?: string
          session_id?: string
          sharing?: boolean | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_session_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_session_signals: {
        Row: {
          created_at: string
          from_user_id: string
          id: string
          payload: Json
          session_id: string
          signal_type: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          from_user_id: string
          id?: string
          payload: Json
          session_id: string
          signal_type: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          from_user_id?: string
          id?: string
          payload?: Json
          session_id?: string
          signal_type?: string
          to_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "live_session_signals_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_signals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_session_signals_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          community_id: string | null
          created_at: string
          description: string | null
          ended_at: string | null
          engagement_events: number
          host_id: string
          id: string
          max_viewers: number
          peak_viewers: number
          playback_url: string | null
          privacy: string
          recording_ended_at: string | null
          recording_started_at: string | null
          recording_url: string | null
          room_id: string | null
          scheduled_at: string | null
          settings: Json
          space_id: string | null
          started_at: string | null
          status: string
          stream_key: string | null
          title: string
          total_watch_seconds: number
          updated_at: string
          viewer_count: number
          viewer_sample_count: number
          viewer_sample_sum: number
        }
        Insert: {
          community_id?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          engagement_events?: number
          host_id: string
          id?: string
          max_viewers?: number
          peak_viewers?: number
          playback_url?: string | null
          privacy?: string
          recording_ended_at?: string | null
          recording_started_at?: string | null
          recording_url?: string | null
          room_id?: string | null
          scheduled_at?: string | null
          settings?: Json
          space_id?: string | null
          started_at?: string | null
          status?: string
          stream_key?: string | null
          title: string
          total_watch_seconds?: number
          updated_at?: string
          viewer_count?: number
          viewer_sample_count?: number
          viewer_sample_sum?: number
        }
        Update: {
          community_id?: string | null
          created_at?: string
          description?: string | null
          ended_at?: string | null
          engagement_events?: number
          host_id?: string
          id?: string
          max_viewers?: number
          peak_viewers?: number
          playback_url?: string | null
          privacy?: string
          recording_ended_at?: string | null
          recording_started_at?: string | null
          recording_url?: string | null
          room_id?: string | null
          scheduled_at?: string | null
          settings?: Json
          space_id?: string | null
          started_at?: string | null
          status?: string
          stream_key?: string | null
          title?: string
          total_watch_seconds?: number
          updated_at?: string
          viewer_count?: number
          viewer_sample_count?: number
          viewer_sample_sum?: number
        }
        Relationships: [
          {
            foreignKeyName: "live_sessions_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_host_id_fkey"
            columns: ["host_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_sessions_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_category_intelligence: {
        Row: {
          category_id: string
          category_name: string
          computed_at: string
          conversion_rate: number
          growth_rate: number
          product_count: number
          rank: number | null
          refund_rate: number
          revenue_total: number
        }
        Insert: {
          category_id: string
          category_name?: string
          computed_at?: string
          conversion_rate?: number
          growth_rate?: number
          product_count?: number
          rank?: number | null
          refund_rate?: number
          revenue_total?: number
        }
        Update: {
          category_id?: string
          category_name?: string
          computed_at?: string
          conversion_rate?: number
          growth_rate?: number
          product_count?: number
          rank?: number | null
          refund_rate?: number
          revenue_total?: number
        }
        Relationships: []
      }
      marketplace_collection_products: {
        Row: {
          collection_id: string
          created_at: string
          product_id: string
          sort_order: number
        }
        Insert: {
          collection_id: string
          created_at?: string
          product_id: string
          sort_order?: number
        }
        Update: {
          collection_id?: string
          created_at?: string
          product_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_collection_products_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "marketplace_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_collection_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_collections: {
        Row: {
          badge: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_featured: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          badge?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          badge?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_customer_profiles: {
        Row: {
          category_prefs: Json
          country_code: string | null
          created_at: string
          currency: string | null
          id: string
          interest_tags: Json
          language: string | null
          last_active_at: string
          search_history: Json
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category_prefs?: Json
          country_code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          interest_tags?: Json
          language?: string | null
          last_active_at?: string
          search_history?: Json
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category_prefs?: Json
          country_code?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          interest_tags?: Json
          language?: string | null
          last_active_at?: string
          search_history?: Json
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      marketplace_intelligence_analytics: {
        Row: {
          active_products: number
          avg_quality: number
          avg_shipping_days: number | null
          conversion_rate: number
          ctr_avg: number
          duplicate_percent: number
          fast_shipping_percent: number
          health_label: string
          health_percent: number
          id: string
          metadata: Json
          orders_7d: number
          refund_prediction: number
          revenue_7d: number
          snapshot_at: string
          supplier_health: number
          total_products: number
          trending_percent: number
          video_percent: number
        }
        Insert: {
          active_products?: number
          avg_quality?: number
          avg_shipping_days?: number | null
          conversion_rate?: number
          ctr_avg?: number
          duplicate_percent?: number
          fast_shipping_percent?: number
          health_label?: string
          health_percent?: number
          id?: string
          metadata?: Json
          orders_7d?: number
          refund_prediction?: number
          revenue_7d?: number
          snapshot_at?: string
          supplier_health?: number
          total_products?: number
          trending_percent?: number
          video_percent?: number
        }
        Update: {
          active_products?: number
          avg_quality?: number
          avg_shipping_days?: number | null
          conversion_rate?: number
          ctr_avg?: number
          duplicate_percent?: number
          fast_shipping_percent?: number
          health_label?: string
          health_percent?: number
          id?: string
          metadata?: Json
          orders_7d?: number
          refund_prediction?: number
          revenue_7d?: number
          snapshot_at?: string
          supplier_health?: number
          total_products?: number
          trending_percent?: number
          video_percent?: number
        }
        Relationships: []
      }
      marketplace_intelligence_events: {
        Row: {
          created_at: string
          event_type: string
          id: string
          payload: Json
          product_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: string
          payload?: Json
          product_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          product_id?: string | null
        }
        Relationships: []
      }
      marketplace_product_intelligence: {
        Row: {
          affiliate_score: number
          ai_recommendations: Json
          community_score: number
          computed_at: string
          conversion_rate: number
          created_at: string
          ctr: number
          duplicate_hidden: boolean
          duplicate_of_product_id: string | null
          duplicate_similarity: number | null
          jimvio_quality_score: number
          jimvio_trending_score: number
          marketplace_rank: number | null
          price_recommendation: Json
          product_id: string
          quality_confidence: string | null
          quality_label: string
          rank_factors: Json
          rank_score: number
          recommended_price: number | null
          recommended_warehouse: string | null
          refund_rate: number
          season_tags: Json
          shipping_recommendation: Json
          updated_at: string
        }
        Insert: {
          affiliate_score?: number
          ai_recommendations?: Json
          community_score?: number
          computed_at?: string
          conversion_rate?: number
          created_at?: string
          ctr?: number
          duplicate_hidden?: boolean
          duplicate_of_product_id?: string | null
          duplicate_similarity?: number | null
          jimvio_quality_score?: number
          jimvio_trending_score?: number
          marketplace_rank?: number | null
          price_recommendation?: Json
          product_id: string
          quality_confidence?: string | null
          quality_label?: string
          rank_factors?: Json
          rank_score?: number
          recommended_price?: number | null
          recommended_warehouse?: string | null
          refund_rate?: number
          season_tags?: Json
          shipping_recommendation?: Json
          updated_at?: string
        }
        Update: {
          affiliate_score?: number
          ai_recommendations?: Json
          community_score?: number
          computed_at?: string
          conversion_rate?: number
          created_at?: string
          ctr?: number
          duplicate_hidden?: boolean
          duplicate_of_product_id?: string | null
          duplicate_similarity?: number | null
          jimvio_quality_score?: number
          jimvio_trending_score?: number
          marketplace_rank?: number | null
          price_recommendation?: Json
          product_id?: string
          quality_confidence?: string | null
          quality_label?: string
          rank_factors?: Json
          rank_score?: number
          recommended_price?: number | null
          recommended_warehouse?: string | null
          refund_rate?: number
          season_tags?: Json
          shipping_recommendation?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_product_intelligence_duplicate_of_product_id_fkey"
            columns: ["duplicate_of_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketplace_product_intelligence_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      marketplace_search_intelligence: {
        Row: {
          id: string
          last_searched: string
          normalized_term: string
          related_terms: Json
          search_count: number
          search_term: string
          synonyms: Json
          trending: boolean
        }
        Insert: {
          id?: string
          last_searched?: string
          normalized_term: string
          related_terms?: Json
          search_count?: number
          search_term: string
          synonyms?: Json
          trending?: boolean
        }
        Update: {
          id?: string
          last_searched?: string
          normalized_term?: string
          related_terms?: Json
          search_count?: number
          search_term?: string
          synonyms?: Json
          trending?: boolean
        }
        Relationships: []
      }
      marketplace_seasons: {
        Row: {
          active: boolean
          ends_at: string | null
          keywords: Json
          label: string
          season_key: string
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          ends_at?: string | null
          keywords?: Json
          label: string
          season_key: string
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          ends_at?: string | null
          keywords?: Json
          label?: string
          season_key?: string
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      marketplace_trending_hourly: {
        Row: {
          computed_at: string
          id: string
          product_id: string
          signals: Json
          trending_score: number
        }
        Insert: {
          computed_at?: string
          id?: string
          product_id: string
          signals?: Json
          trending_score?: number
        }
        Update: {
          computed_at?: string
          id?: string
          product_id?: string
          signals?: Json
          trending_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "marketplace_trending_hourly_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      member_points: {
        Row: {
          community_id: string
          created_at: string | null
          id: string
          last_active_at: string | null
          level: number | null
          streak_days: number | null
          total_points: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          level?: number | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string | null
          id?: string
          last_active_at?: string | null
          level?: number | null
          streak_days?: number | null
          total_points?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "member_points_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_points_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_conversation_reads: {
        Row: {
          conversation_key: string
          last_read_at: string
          last_read_message_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          conversation_key: string
          last_read_at?: string
          last_read_message_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          conversation_key?: string
          last_read_at?: string
          last_read_message_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_events: {
        Row: {
          created_at: string
          event_name: string
          id: string
          notification_id: string | null
          properties: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          id?: string
          notification_id?: string | null
          properties?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          id?: string
          notification_id?: string | null
          properties?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          categories: Json
          email_achievements: boolean
          email_daily: boolean
          email_enabled: boolean
          email_reengagement: boolean
          email_weekly_digest: boolean
          push_enabled: boolean
          quiet_hours_enabled: boolean
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          quiet_hours_timezone: string | null
          sms_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          categories?: Json
          email_achievements?: boolean
          email_daily?: boolean
          email_enabled?: boolean
          email_reengagement?: boolean
          email_weekly_digest?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          categories?: Json
          email_achievements?: boolean
          email_daily?: boolean
          email_enabled?: boolean
          email_reengagement?: boolean
          email_weekly_digest?: boolean
          push_enabled?: boolean
          quiet_hours_enabled?: boolean
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          quiet_hours_timezone?: string | null
          sms_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          archived_at: string | null
          category: string | null
          created_at: string | null
          data: Json | null
          delivered_at: string | null
          delivery_channel: string
          event_key: string | null
          group_key: string | null
          id: string
          is_read: boolean | null
          message: string
          read_at: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Insert: {
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          delivery_channel?: string
          event_key?: string | null
          group_key?: string | null
          id?: string
          is_read?: boolean | null
          message: string
          read_at?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
        }
        Update: {
          action_url?: string | null
          archived_at?: string | null
          category?: string | null
          created_at?: string | null
          data?: Json | null
          delivered_at?: string | null
          delivery_channel?: string
          event_key?: string | null
          group_key?: string | null
          id?: string
          is_read?: boolean | null
          message?: string
          read_at?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ops_alert_events: {
        Row: {
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          resolved_at: string | null
          severity: string
          source: string
          title: string
        }
        Insert: {
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          resolved_at?: string | null
          severity: string
          source: string
          title: string
        }
        Update: {
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          resolved_at?: string | null
          severity?: string
          source?: string
          title?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          access_granted_at: string | null
          affiliate_commission_amount: number | null
          affiliate_commission_rate: number | null
          affiliate_id: string | null
          billing_period: string | null
          created_at: string | null
          digital_download_url: string | null
          download_count: number | null
          id: string
          metadata: Json | null
          order_id: string
          pricing_type: string | null
          product_id: string | null
          product_image: string | null
          product_name: string
          product_source: string
          product_type: string | null
          quantity: number
          shopify_product_id: string | null
          shopify_variant_id: number | null
          source_metadata: Json
          total_price: number
          unit_price: number
          variant_id: string | null
          variant_name: string | null
          vendor_id: string | null
        }
        Insert: {
          access_granted_at?: string | null
          affiliate_commission_amount?: number | null
          affiliate_commission_rate?: number | null
          affiliate_id?: string | null
          billing_period?: string | null
          created_at?: string | null
          digital_download_url?: string | null
          download_count?: number | null
          id?: string
          metadata?: Json | null
          order_id: string
          pricing_type?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name: string
          product_source?: string
          product_type?: string | null
          quantity?: number
          shopify_product_id?: string | null
          shopify_variant_id?: number | null
          source_metadata?: Json
          total_price: number
          unit_price: number
          variant_id?: string | null
          variant_name?: string | null
          vendor_id?: string | null
        }
        Update: {
          access_granted_at?: string | null
          affiliate_commission_amount?: number | null
          affiliate_commission_rate?: number | null
          affiliate_id?: string | null
          billing_period?: string | null
          created_at?: string | null
          digital_download_url?: string | null
          download_count?: number | null
          id?: string
          metadata?: Json | null
          order_id?: string
          pricing_type?: string | null
          product_id?: string | null
          product_image?: string | null
          product_name?: string
          product_source?: string
          product_type?: string | null
          quantity?: number
          shopify_product_id?: string | null
          shopify_variant_id?: number | null
          source_metadata?: Json
          total_price?: number
          unit_price?: number
          variant_id?: string | null
          variant_name?: string | null
          vendor_id?: string | null
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
          {
            foreignKeyName: "order_items_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      order_payment_status_history: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["payment_status"]
          notes: string | null
          order_id: string
          previous_status: Database["public"]["Enums"]["payment_status"] | null
          provider: string | null
          provider_transaction_id: string | null
          triggered_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["payment_status"]
          notes?: string | null
          order_id: string
          previous_status?: Database["public"]["Enums"]["payment_status"] | null
          provider?: string | null
          provider_transaction_id?: string | null
          triggered_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["payment_status"]
          notes?: string | null
          order_id?: string
          previous_status?: Database["public"]["Enums"]["payment_status"] | null
          provider?: string | null
          provider_transaction_id?: string | null
          triggered_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_payment_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          created_at: string | null
          id: string
          metadata: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          notes: string | null
          order_id: string
          previous_status: Database["public"]["Enums"]["order_status"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          order_id: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["order_status"]
          notes?: string | null
          order_id?: string
          previous_status?: Database["public"]["Enums"]["order_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_status_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          affiliate_attributed_at: string | null
          affiliate_id: string | null
          billing_address: Json | null
          buyer_id: string
          campaign_attribution: Json
          cancelled_at: string | null
          cj_dispute_id: string | null
          cj_fulfillment_status: string | null
          cj_last_sync: string | null
          cj_order_id: string | null
          cj_order_num: string | null
          cj_shipping_method: string | null
          cj_submit_time: string | null
          cj_supplier_cost: number | null
          created_at: string | null
          currency: string | null
          delivered_at: string | null
          discount_amount: number | null
          id: string
          integration_source: string | null
          metadata: Json | null
          notes: string | null
          nowpayments_payment_id: number | null
          order_number: string
          paid_at: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          referral_code: string | null
          shipped_at: string | null
          shipping_address: Json | null
          shipping_amount: number | null
          shopify_fulfillment_status: string | null
          shopify_order_id: string | null
          shopify_order_ids: string[] | null
          shopify_order_number: number | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          tax_amount: number | null
          total_amount: number
          tracking_number: string | null
          tracking_status: string | null
          updated_at: string | null
          vendor_id: string | null
        }
        Insert: {
          affiliate_attributed_at?: string | null
          affiliate_id?: string | null
          billing_address?: Json | null
          buyer_id: string
          campaign_attribution?: Json
          cancelled_at?: string | null
          cj_dispute_id?: string | null
          cj_fulfillment_status?: string | null
          cj_last_sync?: string | null
          cj_order_id?: string | null
          cj_order_num?: string | null
          cj_shipping_method?: string | null
          cj_submit_time?: string | null
          cj_supplier_cost?: number | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          integration_source?: string | null
          metadata?: Json | null
          notes?: string | null
          nowpayments_payment_id?: number | null
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          referral_code?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          shopify_fulfillment_status?: string | null
          shopify_order_id?: string | null
          shopify_order_ids?: string[] | null
          shopify_order_number?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total_amount: number
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Update: {
          affiliate_attributed_at?: string | null
          affiliate_id?: string | null
          billing_address?: Json | null
          buyer_id?: string
          campaign_attribution?: Json
          cancelled_at?: string | null
          cj_dispute_id?: string | null
          cj_fulfillment_status?: string | null
          cj_last_sync?: string | null
          cj_order_id?: string | null
          cj_order_num?: string | null
          cj_shipping_method?: string | null
          cj_submit_time?: string | null
          cj_supplier_cost?: number | null
          created_at?: string | null
          currency?: string | null
          delivered_at?: string | null
          discount_amount?: number | null
          id?: string
          integration_source?: string | null
          metadata?: Json | null
          notes?: string | null
          nowpayments_payment_id?: number | null
          order_number?: string
          paid_at?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          referral_code?: string | null
          shipped_at?: string | null
          shipping_address?: Json | null
          shipping_amount?: number | null
          shopify_fulfillment_status?: string | null
          shopify_order_id?: string | null
          shopify_order_ids?: string[] | null
          shopify_order_number?: number | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          tax_amount?: number | null
          total_amount?: number
          tracking_number?: string | null
          tracking_status?: string | null
          updated_at?: string | null
          vendor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string | null
          currency: string | null
          fee: number | null
          id: string
          net_amount: number | null
          notes: string | null
          payout_account: string | null
          payout_method: string | null
          processed_at: string | null
          provider_reference: string | null
          release_date: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          currency?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payout_account?: string | null
          payout_method?: string | null
          processed_at?: string | null
          provider_reference?: string | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          currency?: string | null
          fee?: number | null
          id?: string
          net_amount?: number | null
          notes?: string | null
          payout_account?: string | null
          payout_method?: string | null
          processed_at?: string | null
          provider_reference?: string | null
          release_date?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_feature_flags: {
        Row: {
          description: string | null
          enabled: boolean
          key: string
          metadata: Json
          rollout_percent: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          enabled?: boolean
          key: string
          metadata?: Json
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          enabled?: boolean
          key?: string
          metadata?: Json
          rollout_percent?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_secrets: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      product_answers: {
        Row: {
          answerer_id: string
          body: string
          created_at: string
          id: string
          is_seller: boolean
          question_id: string
        }
        Insert: {
          answerer_id: string
          body: string
          created_at?: string
          id?: string
          is_seller?: boolean
          question_id: string
        }
        Update: {
          answerer_id?: string
          body?: string
          created_at?: string
          id?: string
          is_seller?: boolean
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_answers_answerer_id_fkey"
            columns: ["answerer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "product_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      product_categories: {
        Row: {
          category_type: string
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          parent_id: string | null
          product_count: number | null
          slug: string
          sort_order: number | null
          tint_color: string | null
          visible: boolean | null
        }
        Insert: {
          category_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          parent_id?: string | null
          product_count?: number | null
          slug: string
          sort_order?: number | null
          tint_color?: string | null
          visible?: boolean | null
        }
        Update: {
          category_type?: string
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          parent_id?: string | null
          product_count?: number | null
          slug?: string
          sort_order?: number | null
          tint_color?: string | null
          visible?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_feedback: {
        Row: {
          admin_notes: string | null
          category: string
          created_at: string
          id: string
          message: string
          page_path: string | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          category: string
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          category?: string
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          is_active: boolean
          is_primary: boolean
          media_type: string
          product_id: string
          sort_order: number
          thumbnail_url: string | null
          url: string
          vendor_id: string
          video_id: string | null
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          media_type: string
          product_id: string
          sort_order?: number
          thumbnail_url?: string | null
          url: string
          vendor_id: string
          video_id?: string | null
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_primary?: boolean
          media_type?: string
          product_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          url?: string
          vendor_id?: string
          video_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "product_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      product_questions: {
        Row: {
          asker_id: string
          body: string
          created_at: string
          id: string
          is_public: boolean
          product_id: string
          updated_at: string
        }
        Insert: {
          asker_id: string
          body: string
          created_at?: string
          id?: string
          is_public?: boolean
          product_id: string
          updated_at?: string
        }
        Update: {
          asker_id?: string
          body?: string
          created_at?: string
          id?: string
          is_public?: boolean
          product_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_questions_asker_id_fkey"
            columns: ["asker_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_questions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_shipping_options: {
        Row: {
          carrier: string | null
          created_at: string | null
          currency: string
          estimated_delivery: string | null
          has_tracking: boolean | null
          id: string
          is_active: boolean | null
          is_free_shipping: boolean | null
          is_recommended: boolean | null
          max_delivery_days: number | null
          method_name: string
          min_delivery_days: number | null
          product_id: string
          remark: string | null
          ship_from_country: string
          ship_from_name: string | null
          ship_to_country: string
          shipping_fee: number
          source: string
          source_method_id: string | null
          synced_at: string | null
          updated_at: string | null
        }
        Insert: {
          carrier?: string | null
          created_at?: string | null
          currency?: string
          estimated_delivery?: string | null
          has_tracking?: boolean | null
          id?: string
          is_active?: boolean | null
          is_free_shipping?: boolean | null
          is_recommended?: boolean | null
          max_delivery_days?: number | null
          method_name: string
          min_delivery_days?: number | null
          product_id: string
          remark?: string | null
          ship_from_country?: string
          ship_from_name?: string | null
          ship_to_country: string
          shipping_fee?: number
          source?: string
          source_method_id?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Update: {
          carrier?: string | null
          created_at?: string | null
          currency?: string
          estimated_delivery?: string | null
          has_tracking?: boolean | null
          id?: string
          is_active?: boolean | null
          is_free_shipping?: boolean | null
          is_recommended?: boolean | null
          max_delivery_days?: number | null
          method_name?: string
          min_delivery_days?: number | null
          product_id?: string
          remark?: string | null
          ship_from_country?: string
          ship_from_name?: string | null
          ship_to_country?: string
          shipping_fee?: number
          source?: string
          source_method_id?: string | null
          synced_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_shipping_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          affiliate_commission_rate: number | null
          affiliate_price: number | null
          cj_pid: string | null
          cj_vid: string | null
          compare_at_price: number | null
          created_at: string | null
          height: number | null
          id: string
          image_url: string | null
          inventory_quantity: number | null
          is_active: boolean | null
          length: number | null
          name: string
          options: Json | null
          price: number
          product_id: string
          sku: string | null
          source: string
          source_metadata: Json
          updated_at: string | null
          volume: number | null
          weight: number | null
          width: number | null
        }
        Insert: {
          affiliate_commission_rate?: number | null
          affiliate_price?: number | null
          cj_pid?: string | null
          cj_vid?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          length?: number | null
          name: string
          options?: Json | null
          price: number
          product_id: string
          sku?: string | null
          source?: string
          source_metadata?: Json
          updated_at?: string | null
          volume?: number | null
          weight?: number | null
          width?: number | null
        }
        Update: {
          affiliate_commission_rate?: number | null
          affiliate_price?: number | null
          cj_pid?: string | null
          cj_vid?: string | null
          compare_at_price?: number | null
          created_at?: string | null
          height?: number | null
          id?: string
          image_url?: string | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          length?: number | null
          name?: string
          options?: Json | null
          price?: number
          product_id?: string
          sku?: string | null
          source?: string
          source_metadata?: Json
          updated_at?: string | null
          volume?: number | null
          weight?: number | null
          width?: number | null
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
      product_videos: {
        Row: {
          aspect_ratio: string | null
          captions_url: string | null
          created_at: string
          description: string | null
          duration_sec: number | null
          file_size: number | null
          height_px: number | null
          id: string
          is_active: boolean
          is_primary: boolean
          mime_type: string | null
          platform: string
          platform_video_id: string | null
          product_id: string
          sort_order: number
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          url: string
          vendor_id: string
          width_px: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          captions_url?: string | null
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          file_size?: number | null
          height_px?: number | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          mime_type?: string | null
          platform?: string
          platform_video_id?: string | null
          product_id: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url: string
          vendor_id: string
          width_px?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          captions_url?: string | null
          created_at?: string
          description?: string | null
          duration_sec?: number | null
          file_size?: number | null
          height_px?: number | null
          id?: string
          is_active?: boolean
          is_primary?: boolean
          mime_type?: string | null
          platform?: string
          platform_video_id?: string | null
          product_id?: string
          sort_order?: number
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          url?: string
          vendor_id?: string
          width_px?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_videos_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      product_views: {
        Row: {
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          product_id: string
          referrer: string | null
          session_id: string | null
          user_id: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          product_id: string
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          product_id?: string
          referrer?: string | null
          session_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_views_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_views_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          affiliate_commission_rate: number | null
          affiliate_enabled: boolean | null
          affiliate_price: number | null
          allow_backorder: boolean | null
          auto_unpublish_reason: string | null
          auto_unpublished: boolean
          auto_unpublished_at: string | null
          barcode: string | null
          billing_period: string | null
          brand: string | null
          button_text: string | null
          category_id: string | null
          cj_last_synced_at: string | null
          claimed_pct: number | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          delivery_time: string | null
          description: string | null
          digital_file_size: number | null
          digital_file_url: string | null
          dimensions: Json | null
          discount_label: string | null
          enable_discussions: boolean | null
          features: string[] | null
          id: string
          images: Json | null
          influencer_enabled: boolean | null
          inventory_quantity: number | null
          is_active: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          is_flash_deal: boolean | null
          is_free_shipping: boolean | null
          low_stock_threshold: number | null
          material: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          override_reason: string | null
          override_time: string | null
          override_user: string | null
          price: number
          price_usd: number
          pricing_type: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          published_at: string | null
          published_by_admin_override: boolean
          rating: number | null
          rating_breakdown: Json | null
          requires_shipping: boolean | null
          review_count: number | null
          sale_count: number | null
          shipping_from: string | null
          shopify_handle: string | null
          shopify_product_id: string | null
          shopify_synced_at: string | null
          shopify_variant_id: number | null
          short_description: string | null
          show_author: boolean | null
          show_reviews: boolean | null
          sku: string | null
          slug: string
          sold_count: number | null
          source: string | null
          source_metadata: Json
          status: Database["public"]["Enums"]["product_status"] | null
          tags: string[] | null
          track_inventory: boolean | null
          updated_at: string | null
          vendor_id: string
          videos: Json | null
          view_count: number | null
          weight: number | null
          wishlist_count: number | null
        }
        Insert: {
          affiliate_commission_rate?: number | null
          affiliate_enabled?: boolean | null
          affiliate_price?: number | null
          allow_backorder?: boolean | null
          auto_unpublish_reason?: string | null
          auto_unpublished?: boolean
          auto_unpublished_at?: string | null
          barcode?: string | null
          billing_period?: string | null
          brand?: string | null
          button_text?: string | null
          category_id?: string | null
          cj_last_synced_at?: string | null
          claimed_pct?: number | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          delivery_time?: string | null
          description?: string | null
          digital_file_size?: number | null
          digital_file_url?: string | null
          dimensions?: Json | null
          discount_label?: string | null
          enable_discussions?: boolean | null
          features?: string[] | null
          id?: string
          images?: Json | null
          influencer_enabled?: boolean | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_flash_deal?: boolean | null
          is_free_shipping?: boolean | null
          low_stock_threshold?: number | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          override_reason?: string | null
          override_time?: string | null
          override_user?: string | null
          price?: number
          price_usd?: number
          pricing_type?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          published_at?: string | null
          published_by_admin_override?: boolean
          rating?: number | null
          rating_breakdown?: Json | null
          requires_shipping?: boolean | null
          review_count?: number | null
          sale_count?: number | null
          shipping_from?: string | null
          shopify_handle?: string | null
          shopify_product_id?: string | null
          shopify_synced_at?: string | null
          shopify_variant_id?: number | null
          short_description?: string | null
          show_author?: boolean | null
          show_reviews?: boolean | null
          sku?: string | null
          slug: string
          sold_count?: number | null
          source?: string | null
          source_metadata?: Json
          status?: Database["public"]["Enums"]["product_status"] | null
          tags?: string[] | null
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor_id: string
          videos?: Json | null
          view_count?: number | null
          weight?: number | null
          wishlist_count?: number | null
        }
        Update: {
          affiliate_commission_rate?: number | null
          affiliate_enabled?: boolean | null
          affiliate_price?: number | null
          allow_backorder?: boolean | null
          auto_unpublish_reason?: string | null
          auto_unpublished?: boolean
          auto_unpublished_at?: string | null
          barcode?: string | null
          billing_period?: string | null
          brand?: string | null
          button_text?: string | null
          category_id?: string | null
          cj_last_synced_at?: string | null
          claimed_pct?: number | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          delivery_time?: string | null
          description?: string | null
          digital_file_size?: number | null
          digital_file_url?: string | null
          dimensions?: Json | null
          discount_label?: string | null
          enable_discussions?: boolean | null
          features?: string[] | null
          id?: string
          images?: Json | null
          influencer_enabled?: boolean | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_flash_deal?: boolean | null
          is_free_shipping?: boolean | null
          low_stock_threshold?: number | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          override_reason?: string | null
          override_time?: string | null
          override_user?: string | null
          price?: number
          price_usd?: number
          pricing_type?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          published_at?: string | null
          published_by_admin_override?: boolean
          rating?: number | null
          rating_breakdown?: Json | null
          requires_shipping?: boolean | null
          review_count?: number | null
          sale_count?: number | null
          shipping_from?: string | null
          shopify_handle?: string | null
          shopify_product_id?: string | null
          shopify_synced_at?: string | null
          shopify_variant_id?: number | null
          short_description?: string | null
          show_author?: boolean | null
          show_reviews?: boolean | null
          sku?: string | null
          slug?: string
          sold_count?: number | null
          source?: string | null
          source_metadata?: Json
          status?: Database["public"]["Enums"]["product_status"] | null
          tags?: string[] | null
          track_inventory?: boolean | null
          updated_at?: string | null
          vendor_id?: string
          videos?: Json | null
          view_count?: number | null
          weight?: number | null
          wishlist_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          city: string | null
          country: string | null
          created_at: string | null
          email: string
          follower_count: number
          following_count: number
          full_name: string | null
          id: string
          is_active: boolean | null
          is_verified: boolean | null
          language: string | null
          phone: string | null
          timezone: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          username: string | null
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email: string
          follower_count?: number
          following_count?: number
          full_name?: string | null
          id: string
          is_active?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          phone?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          created_at?: string | null
          email?: string
          follower_count?: number
          following_count?: number
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          is_verified?: boolean | null
          language?: string | null
          phone?: string | null
          timezone?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          username?: string | null
          website?: string | null
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          currency: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          id: string
          is_active: boolean
          max_discount: number | null
          metadata: Json
          min_subtotal: number
          starts_at: string | null
          updated_at: string
          usage_count: number
          usage_limit: number | null
        }
        Insert: {
          code: string
          created_at?: string
          currency?: string | null
          discount_type: string
          discount_value: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          metadata?: Json
          min_subtotal?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          currency?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          id?: string
          is_active?: boolean
          max_discount?: number | null
          metadata?: Json
          min_subtotal?: number
          starts_at?: string | null
          updated_at?: string
          usage_count?: number
          usage_limit?: number | null
        }
        Relationships: []
      }
      review_helpful_votes: {
        Row: {
          created_at: string
          id: string
          review_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          review_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          review_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "review_helpful_votes_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "reviews"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_helpful_votes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          body: string | null
          buyer_id: string
          created_at: string | null
          helpful_count: number | null
          id: string
          images: Json | null
          is_featured: boolean | null
          is_verified_purchase: boolean | null
          order_item_id: string | null
          product_id: string | null
          rating: number
          title: string | null
          updated_at: string | null
          vendor_id: string | null
          vendor_replied_at: string | null
          vendor_reply: string | null
        }
        Insert: {
          body?: string | null
          buyer_id: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          is_verified_purchase?: boolean | null
          order_item_id?: string | null
          product_id?: string | null
          rating: number
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_replied_at?: string | null
          vendor_reply?: string | null
        }
        Update: {
          body?: string | null
          buyer_id?: string
          created_at?: string | null
          helpful_count?: number | null
          id?: string
          images?: Json | null
          is_featured?: boolean | null
          is_verified_purchase?: boolean | null
          order_item_id?: string | null
          product_id?: string | null
          rating?: number
          title?: string | null
          updated_at?: string | null
          vendor_id?: string | null
          vendor_replied_at?: string | null
          vendor_reply?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      room_staff: {
        Row: {
          created_at: string
          permissions: Json
          room_id: string
          staff_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          permissions?: Json
          room_id: string
          staff_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          permissions?: Json
          room_id?: string
          staff_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_staff_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          access_type: string | null
          archived_at: string | null
          automation_config: Json
          behavior_config: Json
          channel_kind: string | null
          color: string | null
          community_id: string
          created_at: string | null
          description: string | null
          emoji: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean
          is_hidden: boolean
          is_locked: boolean | null
          is_pinned: boolean
          last_activity_at: string | null
          member_count: number
          message_count: number
          name: string
          permission_config: Json
          pinned_count: number
          room_type: string
          slug: string
          sort_order: number | null
          space_id: string
          tags: string[]
          updated_at: string | null
          visibility: string
          welcome_message: string | null
        }
        Insert: {
          access_type?: string | null
          archived_at?: string | null
          automation_config?: Json
          behavior_config?: Json
          channel_kind?: string | null
          color?: string | null
          community_id: string
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean
          is_hidden?: boolean
          is_locked?: boolean | null
          is_pinned?: boolean
          last_activity_at?: string | null
          member_count?: number
          message_count?: number
          name: string
          permission_config?: Json
          pinned_count?: number
          room_type?: string
          slug: string
          sort_order?: number | null
          space_id: string
          tags?: string[]
          updated_at?: string | null
          visibility?: string
          welcome_message?: string | null
        }
        Update: {
          access_type?: string | null
          archived_at?: string | null
          automation_config?: Json
          behavior_config?: Json
          channel_kind?: string | null
          color?: string | null
          community_id?: string
          created_at?: string | null
          description?: string | null
          emoji?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean
          is_hidden?: boolean
          is_locked?: boolean | null
          is_pinned?: boolean
          last_activity_at?: string | null
          member_count?: number
          message_count?: number
          name?: string
          permission_config?: Json
          pinned_count?: number
          room_type?: string
          slug?: string
          sort_order?: number | null
          space_id?: string
          tags?: string[]
          updated_at?: string | null
          visibility?: string
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rooms_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rooms_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
        ]
      }
      search_history: {
        Row: {
          created_at: string
          id: string
          query: string
          result_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          query: string
          result_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          query?: string
          result_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "search_history_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shopify_credentials: {
        Row: {
          access_token: string
          api_version: string
          connected_at: string | null
          id: string
          is_active: boolean | null
          last_synced_at: string | null
          platform_commission_rate: number
          shop_domain: string
          vendor_id: string
        }
        Insert: {
          access_token: string
          api_version?: string
          connected_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          platform_commission_rate?: number
          shop_domain: string
          vendor_id: string
        }
        Update: {
          access_token?: string
          api_version?: string
          connected_at?: string | null
          id?: string
          is_active?: boolean | null
          last_synced_at?: string | null
          platform_commission_rate?: number
          shop_domain?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopify_credentials_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      short_video_clicks: {
        Row: {
          community_id: string | null
          converted: boolean
          created_at: string
          id: string
          order_id: string | null
          product_id: string | null
          user_id: string | null
          video_id: string
        }
        Insert: {
          community_id?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          user_id?: string | null
          video_id: string
        }
        Update: {
          community_id?: string | null
          converted?: boolean
          created_at?: string
          id?: string
          order_id?: string | null
          product_id?: string | null
          user_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_video_clicks_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_clicks_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_clicks_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_clicks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_clicks_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      short_video_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_video_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_comments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      short_video_earnings: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          currency: string
          event_type: string
          id: string
          reference_id: string | null
          video_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          creator_id: string
          currency?: string
          event_type: string
          id?: string
          reference_id?: string | null
          video_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          currency?: string
          event_type?: string
          id?: string
          reference_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_video_earnings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_earnings_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      short_video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "short_video_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      short_video_views: {
        Row: {
          created_at: string
          id: string
          video_id: string
          viewer_id: string | null
          watch_time_sec: number
        }
        Insert: {
          created_at?: string
          id?: string
          video_id: string
          viewer_id?: string | null
          watch_time_sec?: number
        }
        Update: {
          created_at?: string
          id?: string
          video_id?: string
          viewer_id?: string | null
          watch_time_sec?: number
        }
        Relationships: [
          {
            foreignKeyName: "short_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "short_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_video_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      short_videos: {
        Row: {
          click_count: number
          comment_count: number | null
          community_id: string | null
          created_at: string
          creator_id: string
          description: string | null
          duration_sec: number | null
          external_link: string | null
          id: string
          like_count: number
          product_id: string | null
          status: string
          thumbnail_url: string | null
          title: string
          total_earnings: number
          updated_at: string
          user_id: string
          video_type: string | null
          video_url: string
          view_count: number
        }
        Insert: {
          click_count?: number
          comment_count?: number | null
          community_id?: string | null
          created_at?: string
          creator_id: string
          description?: string | null
          duration_sec?: number | null
          external_link?: string | null
          id?: string
          like_count?: number
          product_id?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          total_earnings?: number
          updated_at?: string
          user_id: string
          video_type?: string | null
          video_url: string
          view_count?: number
        }
        Update: {
          click_count?: number
          comment_count?: number | null
          community_id?: string | null
          created_at?: string
          creator_id?: string
          description?: string | null
          duration_sec?: number | null
          external_link?: string | null
          id?: string
          like_count?: number
          product_id?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          total_earnings?: number
          updated_at?: string
          user_id?: string
          video_type?: string | null
          video_url?: string
          view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "short_videos_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_videos_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_videos_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "short_videos_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      space_staff: {
        Row: {
          created_at: string
          permissions: Json
          space_id: string
          staff_role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          permissions?: Json
          space_id: string
          staff_role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          permissions?: Json
          space_id?: string
          staff_role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "space_staff_space_id_fkey"
            columns: ["space_id"]
            isOneToOne: false
            referencedRelation: "spaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "space_staff_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      spaces: {
        Row: {
          access_type: string | null
          archived_at: string | null
          archived_by: string | null
          banner_url: string | null
          color: string | null
          community_id: string
          cover_url: string | null
          created_at: string | null
          currency: string | null
          default_content: Json
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean
          is_hidden: boolean
          is_locked: boolean
          is_pinned: boolean
          last_activity_at: string | null
          member_count: number | null
          name: string
          permission_config: Json
          price: number | null
          privacy: string
          room_count: number | null
          rules: string | null
          slug: string
          sort_order: number | null
          space_type: string
          updated_at: string | null
          welcome_message: string | null
        }
        Insert: {
          access_type?: string | null
          archived_at?: string | null
          archived_by?: string | null
          banner_url?: string | null
          color?: string | null
          community_id: string
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          default_content?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean
          is_hidden?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string | null
          member_count?: number | null
          name: string
          permission_config?: Json
          price?: number | null
          privacy?: string
          room_count?: number | null
          rules?: string | null
          slug: string
          sort_order?: number | null
          space_type?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Update: {
          access_type?: string | null
          archived_at?: string | null
          archived_by?: string | null
          banner_url?: string | null
          color?: string | null
          community_id?: string
          cover_url?: string | null
          created_at?: string | null
          currency?: string | null
          default_content?: Json
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean
          is_hidden?: boolean
          is_locked?: boolean
          is_pinned?: boolean
          last_activity_at?: string | null
          member_count?: number | null
          name?: string
          permission_config?: Json
          price?: number | null
          privacy?: string
          room_count?: number | null
          rules?: string | null
          slug?: string
          sort_order?: number | null
          space_type?: string
          updated_at?: string | null
          welcome_message?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "spaces_archived_by_fkey"
            columns: ["archived_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "spaces_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
        ]
      }
      task_completions: {
        Row: {
          created_at: string | null
          id: string
          points_earned: number | null
          proof_text: string | null
          proof_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          points_earned?: number | null
          proof_text?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          points_earned?: number | null
          proof_text?: string | null
          proof_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "community_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          amount_usd: number | null
          created_at: string
          currency: string
          description: string | null
          direction: string
          exchange_rate: number | null
          id: string
          metadata: Json
          order_id: string | null
          provider: string | null
          provider_transaction_id: string | null
          reference: string | null
          status: Database["public"]["Enums"]["payment_status"]
          type: string
          updated_at: string
          user_id: string
          webhook_event_id: string | null
        }
        Insert: {
          amount: number
          amount_usd?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          exchange_rate?: number | null
          id?: string
          metadata?: Json
          order_id?: string | null
          provider?: string | null
          provider_transaction_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: string
          updated_at?: string
          user_id: string
          webhook_event_id?: string | null
        }
        Update: {
          amount?: number
          amount_usd?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          direction?: string
          exchange_rate?: number | null
          id?: string
          metadata?: Json
          order_id?: string | null
          provider?: string | null
          provider_transaction_id?: string | null
          reference?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: string
          updated_at?: string
          user_id?: string
          webhook_event_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_achievements: {
        Row: {
          level: number
          milestones: Json
          progress: Json
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          level?: number
          milestones?: Json
          progress?: Json
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          level?: number
          milestones?: Json
          progress?: Json
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: [
          {
            foreignKeyName: "ugc_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_ai_reviews: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          input: Json
          overall_score: number | null
          result: Json
          submission_id: string | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          overall_score?: number | null
          result?: Json
          submission_id?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          overall_score?: number | null
          result?: Json
          submission_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_ai_reviews_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_ai_reviews_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_ai_reviews_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_automations: {
        Row: {
          actions: Json
          brand_id: string
          campaign_id: string | null
          created_at: string
          created_by: string | null
          id: string
          is_enabled: boolean
          name: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          actions?: Json
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          name: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          actions?: Json
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_enabled?: boolean
          name?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_automations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_automations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_automations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_badges: {
        Row: {
          category: string
          criteria: Json
          description: string
          icon: string | null
          id: string
          name: string
        }
        Insert: {
          category?: string
          criteria?: Json
          description: string
          icon?: string | null
          id: string
          name: string
        }
        Update: {
          category?: string
          criteria?: Json
          description?: string
          icon?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      ugc_brand_members: {
        Row: {
          accepted_at: string | null
          brand_id: string
          created_at: string
          id: string
          invited_at: string
          invited_by: string | null
          permissions: Json
          role: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          brand_id: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          permissions?: Json
          role?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          brand_id?: string
          created_at?: string
          id?: string
          invited_at?: string
          invited_by?: string | null
          permissions?: Json
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_brand_members_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_brand_members_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_brand_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_brand_reputation: {
        Row: {
          avg_approval_hours: number | null
          avg_payment_hours: number | null
          brand_id: string
          completed_campaigns: number
          creator_rating: number | null
          metrics: Json
          total_paid: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          avg_approval_hours?: number | null
          avg_payment_hours?: number | null
          brand_id: string
          completed_campaigns?: number
          creator_rating?: number | null
          metrics?: Json
          total_paid?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          avg_approval_hours?: number | null
          avg_payment_hours?: number | null
          brand_id?: string
          completed_campaigns?: number
          creator_rating?: number | null
          metrics?: Json
          total_paid?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_brand_reputation_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: true
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_activity: {
        Row: {
          actor_user_id: string | null
          campaign_id: string
          created_at: string
          description: string | null
          event_type: string
          id: string
          influencer_id: string | null
          metadata: Json
          submission_id: string | null
          title: string
        }
        Insert: {
          actor_user_id?: string | null
          campaign_id: string
          created_at?: string
          description?: string | null
          event_type: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
          submission_id?: string | null
          title: string
        }
        Update: {
          actor_user_id?: string | null
          campaign_id?: string
          created_at?: string
          description?: string | null
          event_type?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
          submission_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_activity_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_activity_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_activity_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_activity_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_chat_messages: {
        Row: {
          attachment_mime: string | null
          attachment_name: string | null
          attachment_url: string | null
          body: string | null
          campaign_id: string
          created_at: string
          id: string
          is_pinned: boolean
          message_type: string
          sender_user_id: string
          thread_id: string
        }
        Insert: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          message_type?: string
          sender_user_id: string
          thread_id: string
        }
        Update: {
          attachment_mime?: string | null
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          is_pinned?: boolean
          message_type?: string
          sender_user_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_chat_messages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_chat_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_chat_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaign_chat_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_chat_threads: {
        Row: {
          brand_id: string
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string
          last_message_at: string | null
          last_message_preview: string | null
        }
        Insert: {
          brand_id: string
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id: string
          last_message_at?: string | null
          last_message_preview?: string | null
        }
        Update: {
          brand_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_chat_threads_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_chat_threads_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_chat_threads_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_escrow: {
        Row: {
          amount: number
          campaign_id: string
          currency: string
          deposited_at: string | null
          deposited_by: string
          id: string
          locked_amount: number
          payment_method: string | null
          payment_ref: string | null
          refunded_amount: number
          released_amount: number
          released_at: string | null
          status: string
        }
        Insert: {
          amount: number
          campaign_id: string
          currency?: string
          deposited_at?: string | null
          deposited_by: string
          id?: string
          locked_amount?: number
          payment_method?: string | null
          payment_ref?: string | null
          refunded_amount?: number
          released_amount?: number
          released_at?: string | null
          status?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          currency?: string
          deposited_at?: string | null
          deposited_by?: string
          id?: string
          locked_amount?: number
          payment_method?: string | null
          payment_ref?: string | null
          refunded_amount?: number
          released_amount?: number
          released_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_escrow_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_escrow_deposited_by_fkey"
            columns: ["deposited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_media: {
        Row: {
          campaign_id: string
          created_at: string | null
          id: string
          order_index: number | null
          platform_format:
            | Database["public"]["Enums"]["ugc_platform_format"]
            | null
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["ugc_media_type"]
          url: string
          usage: Database["public"]["Enums"]["ugc_media_usage"]
        }
        Insert: {
          campaign_id: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          platform_format?:
            | Database["public"]["Enums"]["ugc_platform_format"]
            | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["ugc_media_type"]
          url: string
          usage?: Database["public"]["Enums"]["ugc_media_usage"]
        }
        Update: {
          campaign_id?: string
          created_at?: string | null
          id?: string
          order_index?: number | null
          platform_format?:
            | Database["public"]["Enums"]["ugc_platform_format"]
            | null
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["ugc_media_type"]
          url?: string
          usage?: Database["public"]["Enums"]["ugc_media_usage"]
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_media_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_participants: {
        Row: {
          application_data: Json
          application_message: string | null
          campaign_id: string
          eligibility_score: number | null
          id: string
          influencer_id: string
          invited_by: string | null
          joined_at: string | null
          review_feedback: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ugc_participation_status"]
          terms_accepted_at: string | null
          withdrawn_at: string | null
        }
        Insert: {
          application_data?: Json
          application_message?: string | null
          campaign_id: string
          eligibility_score?: number | null
          id?: string
          influencer_id: string
          invited_by?: string | null
          joined_at?: string | null
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ugc_participation_status"]
          terms_accepted_at?: string | null
          withdrawn_at?: string | null
        }
        Update: {
          application_data?: Json
          application_message?: string | null
          campaign_id?: string
          eligibility_score?: number | null
          id?: string
          influencer_id?: string
          invited_by?: string | null
          joined_at?: string | null
          review_feedback?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ugc_participation_status"]
          terms_accepted_at?: string | null
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_participants_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_participants_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_participants_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_participants_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_quality: {
        Row: {
          campaign_id: string
          completion_prediction: number
          funding_reliability: number
          metrics: Json
          quality_score: number
          spam_risk: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          completion_prediction?: number
          funding_reliability?: number
          metrics?: Json
          quality_score?: number
          spam_risk?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          completion_prediction?: number
          funding_reliability?: number
          metrics?: Json
          quality_score?: number
          spam_risk?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_quality_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaign_templates: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_favorite: boolean
          name: string
          payload: Json
          source_campaign_id: string | null
          updated_at: string
          use_count: number
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean
          name: string
          payload?: Json
          source_campaign_id?: string | null
          updated_at?: string
          use_count?: number
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_favorite?: boolean
          name?: string
          payload?: Json
          source_campaign_id?: string | null
          updated_at?: string
          use_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaign_templates_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_campaign_templates_source_campaign_id_fkey"
            columns: ["source_campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_campaigns: {
        Row: {
          allowed_platforms: string[] | null
          approved_count: number | null
          brand_id: string
          campaign_type: Database["public"]["Enums"]["ugc_campaign_type"]
          created_at: string | null
          description: string | null
          ends_at: string | null
          fixed_rate: number | null
          id: string
          join_config: Json
          join_mode: string
          max_duration: number | null
          max_participants: number | null
          max_payout_per_sub: number | null
          min_duration: number | null
          music_artist_name: string | null
          music_track_url: string | null
          payment_model: Database["public"]["Enums"]["ugc_payment_model"] | null
          promotion_target: string | null
          promotion_target_url: string | null
          rate_per_1k_views: number
          required_hashtags: Json | null
          required_keywords: Json | null
          required_mentions: Json | null
          requires_face: boolean | null
          spent_budget: number
          starts_at: string | null
          status: Database["public"]["Enums"]["ugc_campaign_status"]
          submission_count: number | null
          title: string
          total_budget: number
          total_views_tracked: number | null
          updated_at: string | null
        }
        Insert: {
          allowed_platforms?: string[] | null
          approved_count?: number | null
          brand_id: string
          campaign_type?: Database["public"]["Enums"]["ugc_campaign_type"]
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          fixed_rate?: number | null
          id?: string
          join_config?: Json
          join_mode?: string
          max_duration?: number | null
          max_participants?: number | null
          max_payout_per_sub?: number | null
          min_duration?: number | null
          music_artist_name?: string | null
          music_track_url?: string | null
          payment_model?:
            | Database["public"]["Enums"]["ugc_payment_model"]
            | null
          promotion_target?: string | null
          promotion_target_url?: string | null
          rate_per_1k_views?: number
          required_hashtags?: Json | null
          required_keywords?: Json | null
          required_mentions?: Json | null
          requires_face?: boolean | null
          spent_budget?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["ugc_campaign_status"]
          submission_count?: number | null
          title: string
          total_budget?: number
          total_views_tracked?: number | null
          updated_at?: string | null
        }
        Update: {
          allowed_platforms?: string[] | null
          approved_count?: number | null
          brand_id?: string
          campaign_type?: Database["public"]["Enums"]["ugc_campaign_type"]
          created_at?: string | null
          description?: string | null
          ends_at?: string | null
          fixed_rate?: number | null
          id?: string
          join_config?: Json
          join_mode?: string
          max_duration?: number | null
          max_participants?: number | null
          max_payout_per_sub?: number | null
          min_duration?: number | null
          music_artist_name?: string | null
          music_track_url?: string | null
          payment_model?:
            | Database["public"]["Enums"]["ugc_payment_model"]
            | null
          promotion_target?: string | null
          promotion_target_url?: string | null
          rate_per_1k_views?: number
          required_hashtags?: Json | null
          required_keywords?: Json | null
          required_mentions?: Json | null
          requires_face?: boolean | null
          spent_budget?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["ugc_campaign_status"]
          submission_count?: number | null
          title?: string
          total_budget?: number
          total_views_tracked?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_campaigns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_content_library: {
        Row: {
          campaign_id: string | null
          created_at: string
          duration_seconds: number | null
          file_size: number | null
          file_url: string
          id: string
          influencer_id: string | null
          media_type: string
          metadata: Json
          mime_type: string | null
          status: string
          submission_id: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url: string
          id?: string
          influencer_id?: string | null
          media_type?: string
          metadata?: Json
          mime_type?: string | null
          status?: string
          submission_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          duration_seconds?: number | null
          file_size?: number | null
          file_url?: string
          id?: string
          influencer_id?: string | null
          media_type?: string
          metadata?: Json
          mime_type?: string | null
          status?: string
          submission_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_content_library_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_content_library_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_content_library_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_content_library_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_contract_versions: {
        Row: {
          body: string
          contract_id: string
          created_at: string
          created_by: string | null
          id: string
          version: number
        }
        Insert: {
          body: string
          contract_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          version: number
        }
        Update: {
          body?: string
          contract_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ugc_contract_versions_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "ugc_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_contract_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_contracts: {
        Row: {
          accepted_at: string | null
          body: string
          brand_id: string
          campaign_id: string | null
          created_at: string
          created_by: string | null
          declined_at: string | null
          expires_at: string | null
          id: string
          influencer_id: string | null
          metadata: Json
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          accepted_at?: string | null
          body: string
          brand_id: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          expires_at?: string | null
          id?: string
          influencer_id?: string | null
          metadata?: Json
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          accepted_at?: string | null
          body?: string
          brand_id?: string
          campaign_id?: string | null
          created_at?: string
          created_by?: string | null
          declined_at?: string | null
          expires_at?: string | null
          id?: string
          influencer_id?: string | null
          metadata?: Json
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "ugc_contracts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_contracts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_contracts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_contracts_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_copilot_sessions: {
        Row: {
          brand_id: string | null
          created_at: string
          id: string
          input: Json
          mode: string
          output: Json
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          mode: string
          output?: Json
          user_id: string
        }
        Update: {
          brand_id?: string | null
          created_at?: string
          id?: string
          input?: Json
          mode?: string
          output?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_copilot_sessions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_copilot_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creator_invitations: {
        Row: {
          brand_id: string
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string | null
          invited_by: string | null
          invitee_email: string | null
          invitee_user_id: string | null
          invitee_username: string | null
          message: string | null
          metadata: Json
          responded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          invited_by?: string | null
          invitee_email?: string | null
          invitee_user_id?: string | null
          invitee_username?: string | null
          message?: string | null
          metadata?: Json
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          invited_by?: string | null
          invitee_email?: string | null
          invitee_user_id?: string | null
          invitee_username?: string | null
          message?: string | null
          metadata?: Json
          responded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_invitations_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_invitations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_invitations_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_creator_invitations_invitee_user_id_fkey"
            columns: ["invitee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_creator_reputation: {
        Row: {
          approval_rate: number
          average_views: number
          completion_rate: number
          influencer_id: string
          metrics: Json
          quality_score: number
          total_earnings: number
          trust_score: number
          updated_at: string
        }
        Insert: {
          approval_rate?: number
          average_views?: number
          completion_rate?: number
          influencer_id: string
          metrics?: Json
          quality_score?: number
          total_earnings?: number
          trust_score?: number
          updated_at?: string
        }
        Update: {
          approval_rate?: number
          average_views?: number
          completion_rate?: number
          influencer_id?: string
          metrics?: Json
          quality_score?: number
          total_earnings?: number
          trust_score?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_creator_reputation_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: true
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_crm_list_members: {
        Row: {
          added_by: string | null
          created_at: string
          id: string
          influencer_id: string
          list_id: string
        }
        Insert: {
          added_by?: string | null
          created_at?: string
          id?: string
          influencer_id: string
          list_id: string
        }
        Update: {
          added_by?: string | null
          created_at?: string
          id?: string
          influencer_id?: string
          list_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_crm_list_members_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_crm_list_members_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_crm_list_members_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "ugc_crm_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_crm_lists: {
        Row: {
          brand_id: string
          color: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_crm_lists_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_crm_lists_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_dispute_evidence: {
        Row: {
          created_at: string
          dispute_id: string
          file_name: string | null
          file_url: string
          id: string
          mime_type: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_name?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_name?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_dispute_evidence_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "ugc_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_dispute_evidence_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_dispute_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          body: string | null
          created_at: string
          dispute_id: string
          id: string
          is_decision: boolean
          sender_user_id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          dispute_id: string
          id?: string
          is_decision?: boolean
          sender_user_id: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          body?: string | null
          created_at?: string
          dispute_id?: string
          id?: string
          is_decision?: boolean
          sender_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_dispute_messages_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "ugc_disputes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_dispute_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_disputes: {
        Row: {
          against_role: string
          amount_in_dispute: number | null
          brand_id: string
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string | null
          metadata: Json
          opened_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          submission_id: string | null
          updated_at: string
        }
        Insert: {
          against_role?: string
          amount_in_dispute?: number | null
          brand_id: string
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
          opened_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submission_id?: string | null
          updated_at?: string
        }
        Update: {
          against_role?: string
          amount_in_dispute?: number | null
          brand_id?: string
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
          opened_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submission_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_disputes_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_disputes_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_disputes_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_disputes_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_escrow_ledger: {
        Row: {
          actor_user_id: string | null
          amount: number
          balance_after: number | null
          brand_id: string
          campaign_id: string
          created_at: string
          currency: string
          entry_type: string
          id: string
          metadata: Json
          reference: string | null
        }
        Insert: {
          actor_user_id?: string | null
          amount?: number
          balance_after?: number | null
          brand_id: string
          campaign_id: string
          created_at?: string
          currency?: string
          entry_type: string
          id?: string
          metadata?: Json
          reference?: string | null
        }
        Update: {
          actor_user_id?: string | null
          amount?: number
          balance_after?: number | null
          brand_id?: string
          campaign_id?: string
          created_at?: string
          currency?: string
          entry_type?: string
          id?: string
          metadata?: Json
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_escrow_ledger_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_escrow_ledger_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_escrow_ledger_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_favorite_creators: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          influencer_id: string
          last_campaign_id: string | null
          notes: string | null
          performance: Json
          tags: string[]
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          influencer_id: string
          last_campaign_id?: string | null
          notes?: string | null
          performance?: Json
          tags?: string[]
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          influencer_id?: string
          last_campaign_id?: string | null
          notes?: string | null
          performance?: Json
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_favorite_creators_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_favorite_creators_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_favorite_creators_last_campaign_id_fkey"
            columns: ["last_campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_join_audit: {
        Row: {
          action: string
          actor_user_id: string | null
          campaign_id: string
          created_at: string
          id: string
          influencer_id: string | null
          metadata: Json
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          campaign_id: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          campaign_id?: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ugc_join_audit_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_join_audit_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_payouts: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          influencer_id: string
          paid_at: string | null
          payout_id: string | null
          status: Database["public"]["Enums"]["ugc_payout_status"]
          submission_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          id?: string
          influencer_id: string
          paid_at?: string | null
          payout_id?: string | null
          status?: Database["public"]["Enums"]["ugc_payout_status"]
          submission_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          influencer_id?: string
          paid_at?: string | null
          payout_id?: string | null
          status?: Database["public"]["Enums"]["ugc_payout_status"]
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_payouts_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_payouts_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_payouts_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_referral_attributions: {
        Row: {
          campaign_id: string | null
          code_id: string
          created_at: string
          id: string
          referred_influencer_id: string | null
          referred_user_id: string
          referrer_user_id: string
          reward_amount: number | null
          rewarded_at: string | null
          status: string
        }
        Insert: {
          campaign_id?: string | null
          code_id: string
          created_at?: string
          id?: string
          referred_influencer_id?: string | null
          referred_user_id: string
          referrer_user_id: string
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string | null
          code_id?: string
          created_at?: string
          id?: string
          referred_influencer_id?: string | null
          referred_user_id?: string
          referrer_user_id?: string
          reward_amount?: number | null
          rewarded_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_referral_attributions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_referral_attributions_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "ugc_referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_referral_attributions_referred_influencer_id_fkey"
            columns: ["referred_influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_referral_attributions_referred_user_id_fkey"
            columns: ["referred_user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_referral_attributions_referrer_user_id_fkey"
            columns: ["referrer_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          influencer_id: string | null
          is_active: boolean
          owner_user_id: string
          reward_amount: number
          reward_currency: string
          uses: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          is_active?: boolean
          owner_user_id: string
          reward_amount?: number
          reward_currency?: string
          uses?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          influencer_id?: string | null
          is_active?: boolean
          owner_user_id?: string
          reward_amount?: number
          reward_currency?: string
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "ugc_referral_codes_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_referral_codes_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_reports: {
        Row: {
          created_at: string | null
          details: string | null
          id: string
          reason: string
          reporter_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          submission_id: string | null
        }
        Insert: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Update: {
          created_at?: string | null
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          submission_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_reports_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_saved_campaigns: {
        Row: {
          campaign_id: string
          collection_id: string | null
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          collection_id?: string | null
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          collection_id?: string | null
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_saved_campaigns_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_saved_campaigns_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "ugc_saved_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_saved_campaigns_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_saved_collections: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_saved_collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_submission_media: {
        Row: {
          aspect_ratio: string | null
          created_at: string | null
          duration: number | null
          file_size: number | null
          id: string
          mime_type: string | null
          order_index: number | null
          platform_format:
            | Database["public"]["Enums"]["ugc_platform_format"]
            | null
          submission_id: string
          thumbnail_url: string | null
          type: Database["public"]["Enums"]["ugc_media_type"]
          url: string
        }
        Insert: {
          aspect_ratio?: string | null
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_index?: number | null
          platform_format?:
            | Database["public"]["Enums"]["ugc_platform_format"]
            | null
          submission_id: string
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["ugc_media_type"]
          url: string
        }
        Update: {
          aspect_ratio?: string | null
          created_at?: string | null
          duration?: number | null
          file_size?: number | null
          id?: string
          mime_type?: string | null
          order_index?: number | null
          platform_format?:
            | Database["public"]["Enums"]["ugc_platform_format"]
            | null
          submission_id?: string
          thumbnail_url?: string | null
          type?: Database["public"]["Enums"]["ugc_media_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_submission_media_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_submission_revisions: {
        Row: {
          campaign_id: string
          created_at: string
          creator_response: string | null
          id: string
          media_urls: Json
          request_notes: string | null
          requested_by: string | null
          resolved_at: string | null
          round_number: number
          status: string
          submission_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          creator_response?: string | null
          id?: string
          media_urls?: Json
          request_notes?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          round_number?: number
          status?: string
          submission_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          creator_response?: string | null
          id?: string
          media_urls?: Json
          request_notes?: string | null
          requested_by?: string | null
          resolved_at?: string | null
          round_number?: number
          status?: string
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_submission_revisions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_submission_revisions_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_submission_revisions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_submissions: {
        Row: {
          ai_review: Json | null
          campaign_id: string
          caption: string | null
          created_at: string | null
          fraud_score: number | null
          id: string
          influencer_id: string
          is_suspicious: boolean | null
          last_synced_at: string | null
          parent_submission_id: string | null
          platform: Database["public"]["Enums"]["ugc_platform"]
          post_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revision_round: number
          status: Database["public"]["Enums"]["ugc_submission_status"]
          thumbnail_url: string | null
          total_earnings: number | null
          total_views_earned: number | null
          updated_at: string | null
        }
        Insert: {
          ai_review?: Json | null
          campaign_id: string
          caption?: string | null
          created_at?: string | null
          fraud_score?: number | null
          id?: string
          influencer_id: string
          is_suspicious?: boolean | null
          last_synced_at?: string | null
          parent_submission_id?: string | null
          platform: Database["public"]["Enums"]["ugc_platform"]
          post_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_round?: number
          status?: Database["public"]["Enums"]["ugc_submission_status"]
          thumbnail_url?: string | null
          total_earnings?: number | null
          total_views_earned?: number | null
          updated_at?: string | null
        }
        Update: {
          ai_review?: Json | null
          campaign_id?: string
          caption?: string | null
          created_at?: string | null
          fraud_score?: number | null
          id?: string
          influencer_id?: string
          is_suspicious?: boolean | null
          last_synced_at?: string | null
          parent_submission_id?: string | null
          platform?: Database["public"]["Enums"]["ugc_platform"]
          post_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revision_round?: number
          status?: Database["public"]["Enums"]["ugc_submission_status"]
          thumbnail_url?: string | null
          total_earnings?: number | null
          total_views_earned?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ugc_submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_submissions_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_submissions_parent_submission_id_fkey"
            columns: ["parent_submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          influencer_id: string | null
          metadata: Json
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          influencer_id?: string | null
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "ugc_badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_user_badges_influencer_id_fkey"
            columns: ["influencer_id"]
            isOneToOne: false
            referencedRelation: "influencers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_user_badges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_view_snapshots: {
        Row: {
          comments: number | null
          delta_views: number
          earnings_this_snapshot: number
          id: string
          likes: number | null
          saves: number | null
          shares: number | null
          snapshotted_at: string | null
          submission_id: string
          views_at_snapshot: number
        }
        Insert: {
          comments?: number | null
          delta_views?: number
          earnings_this_snapshot?: number
          id?: string
          likes?: number | null
          saves?: number | null
          shares?: number | null
          snapshotted_at?: string | null
          submission_id: string
          views_at_snapshot?: number
        }
        Update: {
          comments?: number | null
          delta_views?: number
          earnings_this_snapshot?: number
          id?: string
          likes?: number | null
          saves?: number | null
          shares?: number | null
          snapshotted_at?: string | null
          submission_id?: string
          views_at_snapshot?: number
        }
        Relationships: [
          {
            foreignKeyName: "ugc_view_snapshots_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "ugc_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_webhook_deliveries: {
        Row: {
          attempts: number
          created_at: string
          delivered_at: string | null
          event_type: string
          id: string
          idempotency_key: string | null
          payload: Json
          response_code: number | null
          status: string
          subscription_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          response_code?: number | null
          status?: string
          subscription_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          delivered_at?: string | null
          event_type?: string
          id?: string
          idempotency_key?: string | null
          payload?: Json
          response_code?: number | null
          status?: string
          subscription_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_webhook_deliveries_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "ugc_webhook_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_webhook_subscriptions: {
        Row: {
          brand_id: string
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          secret: string
          updated_at?: string
          url: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_webhook_subscriptions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflow_runs: {
        Row: {
          campaign_id: string | null
          context: Json
          current_node: string | null
          finished_at: string | null
          id: string
          started_at: string
          status: string
          workflow_id: string
        }
        Insert: {
          campaign_id?: string | null
          context?: Json
          current_node?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          workflow_id: string
        }
        Update: {
          campaign_id?: string | null
          context?: Json
          current_node?: string | null
          finished_at?: string | null
          id?: string
          started_at?: string
          status?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflow_runs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "ugc_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflow_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ugc_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ugc_workflows: {
        Row: {
          brand_id: string
          created_at: string
          created_by: string | null
          description: string | null
          graph: Json
          id: string
          is_enabled: boolean
          name: string
          updated_at: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          graph?: Json
          id?: string
          is_enabled?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          graph?: Json
          id?: string
          is_enabled?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ugc_workflows_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ugc_workflows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_2fa_secrets: {
        Row: {
          backup_codes: Json | null
          created_at: string | null
          pending_backup_codes: Json | null
          pending_expires_at: string | null
          pending_secret: string | null
          secret: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: Json | null
          created_at?: string | null
          pending_backup_codes?: Json | null
          pending_expires_at?: string | null
          pending_secret?: string | null
          secret?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: Json | null
          created_at?: string | null
          pending_backup_codes?: Json | null
          pending_expires_at?: string | null
          pending_secret?: string | null
          secret?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_2fa_secrets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_community_pins: {
        Row: {
          community_id: string
          created_at: string
          position: number
          updated_at: string
          user_id: string
        }
        Insert: {
          community_id: string
          created_at?: string
          position?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          community_id?: string
          created_at?: string
          position?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_community_pins_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_community_pins_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_onboarding: {
        Row: {
          checklist: Json
          created_at: string
          progress_percent: number
          tips_dismissed: Json
          updated_at: string
          user_id: string
          welcome_completed_at: string | null
          welcome_email_sent_at: string | null
          welcome_intent: string | null
        }
        Insert: {
          checklist?: Json
          created_at?: string
          progress_percent?: number
          tips_dismissed?: Json
          updated_at?: string
          user_id: string
          welcome_completed_at?: string | null
          welcome_email_sent_at?: string | null
          welcome_intent?: string | null
        }
        Update: {
          checklist?: Json
          created_at?: string
          progress_percent?: number
          tips_dismissed?: Json
          updated_at?: string
          user_id?: string
          welcome_completed_at?: string | null
          welcome_email_sent_at?: string | null
          welcome_intent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_onboarding_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          activated_at: string | null
          id: string
          is_active: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          id?: string
          is_active?: boolean | null
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          activated_at?: string | null
          id?: string
          is_active?: boolean | null
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      variant_stock_history: {
        Row: {
          change_reason: string
          changed_by: string | null
          created_at: string
          delta: number | null
          id: string
          new_quantity: number
          note: string | null
          order_id: string | null
          order_item_id: string | null
          previous_quantity: number
          product_id: string
          source: string
          variant_id: string
        }
        Insert: {
          change_reason?: string
          changed_by?: string | null
          created_at?: string
          delta?: number | null
          id?: string
          new_quantity?: number
          note?: string | null
          order_id?: string | null
          order_item_id?: string | null
          previous_quantity?: number
          product_id: string
          source?: string
          variant_id: string
        }
        Update: {
          change_reason?: string
          changed_by?: string | null
          created_at?: string
          delta?: number | null
          id?: string
          new_quantity?: number
          note?: string | null
          order_id?: string | null
          order_item_id?: string | null
          previous_quantity?: number
          product_id?: string
          source?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_stock_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_stock_history_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_stock_history_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_stock_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variant_stock_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_followers: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_followers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_followers_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          affiliate_commission_rate: number | null
          affiliate_enabled: boolean | null
          business_address: string | null
          business_banner: string | null
          business_country: string | null
          business_description: string | null
          business_email: string | null
          business_logo: string | null
          business_name: string
          business_phone: string | null
          business_slug: string
          business_type: string | null
          commission_rate: number | null
          created_at: string | null
          follower_count: number | null
          display_follower_count: number
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          payout_account: string | null
          payout_method: string | null
          product_categories: string | null
          rating: number | null
          response_time: string | null
          stripe_account_id: string | null
          tax_id: string | null
          total_revenue: number | null
          total_sales: number | null
          updated_at: string | null
          user_id: string
          verification_notes: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at: string | null
          website: string | null
        }
        Insert: {
          affiliate_commission_rate?: number | null
          affiliate_enabled?: boolean | null
          business_address?: string | null
          business_banner?: string | null
          business_country?: string | null
          business_description?: string | null
          business_email?: string | null
          business_logo?: string | null
          business_name: string
          business_phone?: string | null
          business_slug: string
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          follower_count?: number | null
          display_follower_count?: number
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          payout_account?: string | null
          payout_method?: string | null
          product_categories?: string | null
          rating?: number | null
          response_time?: string | null
          stripe_account_id?: string | null
          tax_id?: string | null
          total_revenue?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          affiliate_commission_rate?: number | null
          affiliate_enabled?: boolean | null
          business_address?: string | null
          business_banner?: string | null
          business_country?: string | null
          business_description?: string | null
          business_email?: string | null
          business_logo?: string | null
          business_name?: string
          business_phone?: string | null
          business_slug?: string
          business_type?: string | null
          commission_rate?: number | null
          created_at?: string | null
          follower_count?: number | null
          display_follower_count?: number
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          payout_account?: string | null
          payout_method?: string | null
          product_categories?: string | null
          rating?: number | null
          response_time?: string | null
          stripe_account_id?: string | null
          tax_id?: string | null
          total_revenue?: number | null
          total_sales?: number | null
          updated_at?: string | null
          user_id?: string
          verification_notes?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          verified_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number | null
          currency: string | null
          id: string
          pending_balance: number | null
          total_earned: number | null
          total_paid: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          available_balance?: number | null
          currency?: string | null
          id?: string
          pending_balance?: number | null
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          available_balance?: number | null
          currency?: string | null
          id?: string
          pending_balance?: number | null
          total_earned?: number | null
          total_paid?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          created_at: string
          error: string | null
          id: string
          idempotency_key: string
          order_id: string | null
          payload: Json | null
          provider: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key: string
          order_id?: string | null
          payload?: Json | null
          provider: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          idempotency_key?: string
          order_id?: string | null
          payload?: Json | null
          provider?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_subscriptions: {
        Row: {
          created_at: string
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_failure_at: string | null
          last_failure_reason: string | null
          last_triggered_at: string | null
          product_id: string
          secret: string | null
          updated_at: string
          vendor_id: string
          webhook_url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_failure_reason?: string | null
          last_triggered_at?: string | null
          product_id: string
          secret?: string | null
          updated_at?: string
          vendor_id: string
          webhook_url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_failure_at?: string | null
          last_failure_reason?: string | null
          last_triggered_at?: string | null
          product_id?: string
          secret?: string | null
          updated_at?: string
          vendor_id?: string
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_subscriptions_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlists: {
        Row: {
          created_at: string | null
          id: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wishlists_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlists_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      community_billing_history: {
        Row: {
          amount: number | null
          community_id: string | null
          community_name: string | null
          community_slug: string | null
          created_at: string | null
          creator_earnings: number | null
          currency: string | null
          id: string | null
          membership_id: string | null
          payment_provider: string | null
          payment_reference: string | null
          payment_status: string | null
          plan_type: string | null
          platform_commission: number | null
          tier_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "community_memberships_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "community_membership_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_community_id_fkey"
            columns: ["community_id"]
            isOneToOne: false
            referencedRelation: "communities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_membership_id_fkey"
            columns: ["membership_id"]
            isOneToOne: false
            referencedRelation: "community_memberships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_to_cart: {
        Args: {
          p_affiliate_link_id?: string
          p_product_id: string
          p_quantity?: number
          p_variant_id?: string
        }
        Returns: Json
      }
      add_video_earnings: {
        Args: { amt: number; vid: string }
        Returns: undefined
      }
      adjust_product_inventory: {
        Args: { p_delta: number; p_product_id: string }
        Returns: number
      }
      adjust_variant_inventory: {
        Args: { p_delta: number; p_variant_id: string }
        Returns: number
      }
      approve_affiliate_commission: {
        Args: { p_commission_id: string }
        Returns: boolean
      }
      cancel_affiliate_commission: {
        Args: { p_commission_id: string; p_note?: string }
        Returns: boolean
      }
      clawback_affiliate_commission: {
        Args: {
          p_commission_id: string
          p_note?: string
          p_refund_amount?: number
        }
        Returns: boolean
      }
      community_trending_score: {
        Args: {
          p_is_featured: boolean
          p_member_count: number
          p_online_members?: number
          p_post_count: number
          p_recent_joins?: number
          p_recent_posts?: number
        }
        Returns: number
      }
      count_recent_notifications: {
        Args: { p_user_id: string; p_window_seconds?: number }
        Returns: number
      }
      decrement_post_like_count: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      decrement_video_like_count: { Args: { vid: string }; Returns: undefined }
      decrement_viewer_count: { Args: { session_id: string }; Returns: number }
      decrypt_token: { Args: { ciphertext: string }; Returns: string }
      encrypt_token: { Args: { plaintext: string }; Returns: string }
      get_or_create_community_inbox_conversation: {
        Args: { p_community_id: string; p_peer_id: string }
        Returns: string
      }
      get_product_gallery: {
        Args: { p_product_id: string }
        Returns: {
          alt_text: string
          aspect_ratio: string
          duration_sec: number
          id: string
          is_primary: boolean
          media_type: string
          platform: string
          sort_order: number
          thumbnail_url: string
          url: string
        }[]
      }
      get_trending_communities: {
        Args: { p_limit?: number }
        Returns: {
          avatar_url: string
          category: string
          cover_image: string
          id: string
          is_featured: boolean
          member_count: number
          name: string
          online_members: number
          post_count: number
          slug: string
          trending_score: number
        }[]
      }
      get_trending_community_topics: {
        Args: { p_limit?: number }
        Returns: {
          active_users: number
          community_count: number
          growth_pct: number
          live_discussions: number
          post_count: number
          topic: string
        }[]
      }
      get_unread_notification_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      get_user_roles: { Args: { lookup_user_id: string }; Returns: string[] }
      hub_message_unread_counts: {
        Args: { p_inbox_ids: string[]; p_room_ids: string[]; p_user_id: string }
        Returns: {
          conversation_key: string
          unread_count: number
        }[]
      }
      hub_room_last_messages: {
        Args: { p_room_ids: string[] }
        Returns: {
          body: string
          created_at: string
          message_type: string
          room_id: string
          sender_id: string
        }[]
      }
      increment_affiliate_clicks: {
        Args: { p_affiliate_id: string }
        Returns: undefined
      }
      increment_affiliate_earnings: {
        Args: { p_affiliate_id: string; p_amount: number }
        Returns: undefined
      }
      increment_link_clicks: { Args: { p_link_id: string }; Returns: undefined }
      increment_post_comment_count: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      increment_post_like_count: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      increment_video_click_count: { Args: { vid: string }; Returns: undefined }
      increment_video_like_count: { Args: { vid: string }; Returns: undefined }
      increment_video_view_count: { Args: { vid: string }; Returns: undefined }
      increment_viewer_count: { Args: { session_id: string }; Returns: number }
      increment_wallet_balance: {
        Args: { p_amount: number; p_wallet_id: string }
        Returns: undefined
      }
      merge_variant_source_metadata: {
        Args: { p_cj_vid: string; p_patch: Json }
        Returns: undefined
      }
      record_affiliate_click: {
        Args: {
          p_affiliate_id: string
          p_campaign_id?: string
          p_device_type?: string
          p_ip?: string
          p_link_id: string
          p_referrer?: string
          p_session_key?: string
          p_user_agent?: string
        }
        Returns: string
      }
      record_community_post_view: {
        Args: {
          p_completion_pct?: number
          p_post_id: string
          p_session_id?: string
          p_user_id?: string
          p_watch_ms?: number
        }
        Returns: boolean
      }
      record_community_story_view: {
        Args: {
          p_completion_pct?: number
          p_story_id: string
          p_user_id: string
          p_watch_ms?: number
        }
        Returns: boolean
      }
      reject_affiliate_commission: {
        Args: { p_commission_id: string; p_note?: string }
        Returns: boolean
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_community_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: Json
      }
      toggle_inbox_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: Json
      }
      ugc_is_brand_member: { Args: { p_brand_id: string }; Returns: boolean }
      ugc_is_brand_owner: { Args: { p_brand_id: string }; Returns: boolean }
      vote_review_helpful: { Args: { p_review_id: string }; Returns: number }
    }
    Enums: {
      campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      community_member_status: "active" | "paused" | "cancelled" | "expired"
      notification_type:
        | "order"
        | "payment"
        | "affiliate"
        | "influencer"
        | "community"
        | "system"
        | "review"
        | "message"
      order_status:
        | "pending"
        | "confirmed"
        | "processing"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "refunded"
        | "completed"
        | "checkout_direct"
      payment_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "refunded"
        | "cancelled"
        | "paid"
      payout_status: "pending" | "processing" | "paid" | "failed"
      product_status: "draft" | "active" | "paused" | "archived"
      product_type:
        | "physical"
        | "digital"
        | "subscription"
        | "course"
        | "software"
        | "template"
        | "ebook"
        | "coaching"
        | "community"
        | "bundle"
      subscription_plan: "monthly" | "yearly" | "lifetime"
      ugc_campaign_status:
        | "draft"
        | "active"
        | "paused"
        | "completed"
        | "cancelled"
      ugc_campaign_type: "clipping" | "ugc" | "music_clipping" | "promotion"
      ugc_media_type: "image" | "video" | "file"
      ugc_media_usage: "banner" | "example" | "ad_creative"
      ugc_participation_status:
        | "invited"
        | "accepted"
        | "rejected"
        | "banned"
        | "pending"
        | "waitlisted"
        | "withdrawn"
      ugc_payment_model: "per_views" | "fixed_per_content"
      ugc_payout_status: "pending" | "approved" | "paid"
      ugc_platform: "tiktok" | "instagram" | "youtube" | "x"
      ugc_platform_format:
        | "reels"
        | "tiktok_video"
        | "youtube_short"
        | "post"
        | "story"
      ugc_submission_status:
        | "pending"
        | "approved"
        | "rejected"
        | "removed"
        | "revision_requested"
      user_role:
        | "buyer"
        | "vendor"
        | "affiliate"
        | "influencer"
        | "community_owner"
        | "admin"
      verification_status: "pending" | "verified" | "rejected" | "suspended"
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
    Enums: {
      campaign_status: ["draft", "active", "paused", "completed", "cancelled"],
      community_member_status: ["active", "paused", "cancelled", "expired"],
      notification_type: [
        "order",
        "payment",
        "affiliate",
        "influencer",
        "community",
        "system",
        "review",
        "message",
      ],
      order_status: [
        "pending",
        "confirmed",
        "processing",
        "shipped",
        "delivered",
        "cancelled",
        "refunded",
        "completed",
        "checkout_direct",
      ],
      payment_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "refunded",
        "cancelled",
        "paid",
      ],
      payout_status: ["pending", "processing", "paid", "failed"],
      product_status: ["draft", "active", "paused", "archived"],
      product_type: [
        "physical",
        "digital",
        "subscription",
        "course",
        "software",
        "template",
        "ebook",
        "coaching",
        "community",
        "bundle",
      ],
      subscription_plan: ["monthly", "yearly", "lifetime"],
      ugc_campaign_status: [
        "draft",
        "active",
        "paused",
        "completed",
        "cancelled",
      ],
      ugc_campaign_type: ["clipping", "ugc", "music_clipping", "promotion"],
      ugc_media_type: ["image", "video", "file"],
      ugc_media_usage: ["banner", "example", "ad_creative"],
      ugc_participation_status: [
        "invited",
        "accepted",
        "rejected",
        "banned",
        "pending",
        "waitlisted",
        "withdrawn",
      ],
      ugc_payment_model: ["per_views", "fixed_per_content"],
      ugc_payout_status: ["pending", "approved", "paid"],
      ugc_platform: ["tiktok", "instagram", "youtube", "x"],
      ugc_platform_format: [
        "reels",
        "tiktok_video",
        "youtube_short",
        "post",
        "story",
      ],
      ugc_submission_status: [
        "pending",
        "approved",
        "rejected",
        "removed",
        "revision_requested",
      ],
      user_role: [
        "buyer",
        "vendor",
        "affiliate",
        "influencer",
        "community_owner",
        "admin",
      ],
      verification_status: ["pending", "verified", "rejected", "suspended"],
    },
  },
} as const
