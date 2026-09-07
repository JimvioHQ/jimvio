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
      affiliate_clicks: {
        Row: {
          affiliate_id: string
          converted: boolean | null
          converted_at: string | null
          country: string | null
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: unknown
          link_id: string
          referrer: string | null
          session_id: string | null
          user_agent: string | null
        }
        Insert: {
          affiliate_id: string
          converted?: boolean | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          link_id: string
          referrer?: string | null
          session_id?: string | null
          user_agent?: string | null
        }
        Update: {
          affiliate_id?: string
          converted?: boolean | null
          converted_at?: string | null
          country?: string | null
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: unknown
          link_id?: string
          referrer?: string | null
          session_id?: string | null
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
          commission_amount: number
          commission_rate: number
          created_at: string | null
          id: string
          link_id: string | null
          order_amount: number
          order_id: string
          order_item_id: string | null
          paid_at: string | null
          payout_id: string | null
          product_id: string | null
          status: Database["public"]["Enums"]["payout_status"] | null
          vendor_id: string | null
        }
        Insert: {
          affiliate_id: string
          commission_amount: number
          commission_rate: number
          created_at?: string | null
          id?: string
          link_id?: string | null
          order_amount: number
          order_id: string
          order_item_id?: string | null
          paid_at?: string | null
          payout_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
          vendor_id?: string | null
        }
        Update: {
          affiliate_id?: string
          commission_amount?: number
          commission_rate?: number
          created_at?: string | null
          id?: string
          link_id?: string | null
          order_amount?: number
          order_id?: string
          order_item_id?: string | null
          paid_at?: string | null
          payout_id?: string | null
          product_id?: string | null
          status?: Database["public"]["Enums"]["payout_status"] | null
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
      affiliate_links: {
        Row: {
          affiliate_id: string
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
      communities: {
        Row: {
          avatar_url: string | null
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
          lifetime_price: number | null
          long_description: string | null
          member_count: number | null
          monthly_price: number | null
          name: string
          owner_id: string
          platform_commission_rate: number | null
          post_count: number | null
          slug: string
          space_count: number | null
          tagline: string | null
          tags: string[] | null
          trial_days: number | null
          updated_at: string | null
          yearly_price: number | null
        }
        Insert: {
          avatar_url?: string | null
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
          lifetime_price?: number | null
          long_description?: string | null
          member_count?: number | null
          monthly_price?: number | null
          name: string
          owner_id: string
          platform_commission_rate?: number | null
          post_count?: number | null
          slug: string
          space_count?: number | null
          tagline?: string | null
          tags?: string[] | null
          trial_days?: number | null
          updated_at?: string | null
          yearly_price?: number | null
        }
        Update: {
          avatar_url?: string | null
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
          lifetime_price?: number | null
          long_description?: string | null
          member_count?: number | null
          monthly_price?: number | null
          name?: string
          owner_id?: string
          platform_commission_rate?: number | null
          post_count?: number | null
          slug?: string
          space_count?: number | null
          tagline?: string | null
          tags?: string[] | null
          trial_days?: number | null
          updated_at?: string | null
          yearly_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "communities_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_courses: {
        Row: {
          community_id: string
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: string | null
          id: string
          is_published: boolean | null
          published_at: string | null
          room_id: string
          thumbnail_url: string | null
          title: string
          total_duration: number | null
          total_lessons: number | null
          total_modules: number | null
          updated_at: string | null
        }
        Insert: {
          community_id: string
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          room_id: string
          thumbnail_url?: string | null
          title: string
          total_duration?: number | null
          total_lessons?: number | null
          total_modules?: number | null
          updated_at?: string | null
        }
        Update: {
          community_id?: string
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: string | null
          id?: string
          is_published?: boolean | null
          published_at?: string | null
          room_id?: string
          thumbnail_url?: string | null
          title?: string
          total_duration?: number | null
          total_lessons?: number | null
          total_modules?: number | null
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
          id: string
          is_deleted: boolean | null
          message_type: string | null
          reactions: Json | null
          sender_id: string
        }
        Insert: {
          attachments?: Json | null
          body?: string
          conversation_id: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: string | null
          reactions?: Json | null
          sender_id: string
        }
        Update: {
          attachments?: Json | null
          body?: string
          conversation_id?: string
          created_at?: string | null
          id?: string
          is_deleted?: boolean | null
          message_type?: string | null
          reactions?: Json | null
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
      community_memberships: {
        Row: {
          amount_paid: number | null
          cancelled_at: string | null
          community_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          payment_provider: string | null
          payment_reference: string | null
          plan_type: string | null
          role: string | null
          space_access: string[] | null
          status: string | null
          subscribed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_paid?: number | null
          cancelled_at?: string | null
          community_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: string | null
          role?: string | null
          space_access?: string[] | null
          status?: string | null
          subscribed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number | null
          cancelled_at?: string | null
          community_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          payment_provider?: string | null
          payment_reference?: string | null
          plan_type?: string | null
          role?: string | null
          space_access?: string[] | null
          status?: string | null
          subscribed_at?: string | null
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
          deleted_by: string | null
          edited_at: string | null
          id: string
          is_deleted: boolean | null
          is_edited: boolean | null
          is_pinned: boolean | null
          message_type: string | null
          reactions: Json | null
          reply_count: number | null
          room_id: string
          sender_id: string
          thread_id: string | null
        }
        Insert: {
          attachments?: Json | null
          body?: string | null
          community_id: string
          created_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          message_type?: string | null
          reactions?: Json | null
          reply_count?: number | null
          room_id: string
          sender_id: string
          thread_id?: string | null
        }
        Update: {
          attachments?: Json | null
          body?: string | null
          community_id?: string
          created_at?: string | null
          deleted_by?: string | null
          edited_at?: string | null
          id?: string
          is_deleted?: boolean | null
          is_edited?: boolean | null
          is_pinned?: boolean | null
          message_type?: string | null
          reactions?: Json | null
          reply_count?: number | null
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
          id: string
          is_published: boolean | null
          like_count: number | null
          parent_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string | null
          id?: string
          is_published?: boolean | null
          like_count?: number | null
          parent_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string | null
          id?: string
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
      community_posts: {
        Row: {
          attachments: Json | null
          author_id: string
          body: string
          comment_count: number | null
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
          room_id: string
          space_id: string
          title: string | null
          updated_at: string | null
          video_url: string | null
          view_count: number | null
        }
        Insert: {
          attachments?: Json | null
          author_id: string
          body: string
          comment_count?: number | null
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
          room_id: string
          space_id: string
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
          view_count?: number | null
        }
        Update: {
          attachments?: Json | null
          author_id?: string
          body?: string
          comment_count?: number | null
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
          room_id?: string
          space_id?: string
          title?: string | null
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
      community_saved_posts: {
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
      digital_access: {
        Row: {
          access_url: string | null
          expires_at: string | null
          granted_at: string
          id: string
          last_accessed_at: string | null
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
          expires_at?: string | null
          granted_at?: string
          id?: string
          last_accessed_at?: string | null
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
          expires_at?: string | null
          granted_at?: string
          id?: string
          last_accessed_at?: string | null
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
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string | null
          id: string
          is_completed: boolean | null
          lesson_id: string
          user_id: string
          watch_time: number | null
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          lesson_id: string
          user_id: string
          watch_time?: number | null
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          lesson_id?: string
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
      notifications: {
        Row: {
          action_url: string | null
          created_at: string | null
          data: Json | null
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
          created_at?: string | null
          data?: Json | null
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
          created_at?: string | null
          data?: Json | null
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
      order_items: {
        Row: {
          access_granted_at: string | null
          affiliate_campaign_id: string | null
          affiliate_commission_amount: number | null
          affiliate_commission_rate: number | null
          affiliate_id: string | null
          affiliate_link_id: string | null
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
          affiliate_campaign_id?: string | null
          affiliate_commission_amount?: number | null
          affiliate_commission_rate?: number | null
          affiliate_id?: string | null
          affiliate_link_id?: string | null
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
          affiliate_campaign_id?: string | null
          affiliate_commission_amount?: number | null
          affiliate_commission_rate?: number | null
          affiliate_id?: string | null
          affiliate_link_id?: string | null
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
          affiliate_id: string | null
          billing_address: Json | null
          buyer_id: string
          cancelled_at: string | null
          cj_dispute_id: string | null
          cj_fulfillment_status: string | null
          cj_order_id: string | null
          cj_order_num: string | null
          cj_shipping_method: string | null
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
          affiliate_id?: string | null
          billing_address?: Json | null
          buyer_id: string
          cancelled_at?: string | null
          cj_dispute_id?: string | null
          cj_fulfillment_status?: string | null
          cj_order_id?: string | null
          cj_order_num?: string | null
          cj_shipping_method?: string | null
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
          affiliate_id?: string | null
          billing_address?: Json | null
          buyer_id?: string
          cancelled_at?: string | null
          cj_dispute_id?: string | null
          cj_fulfillment_status?: string | null
          cj_order_id?: string | null
          cj_order_num?: string | null
          cj_shipping_method?: string | null
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
          barcode: string | null
          billing_period: string | null
          brand: string | null
          button_text: string | null
          category_id: string | null
          cj_last_synced_at: string | null
          compare_at_price: number | null
          cost_price: number | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          digital_file_size: number | null
          digital_file_url: string | null
          dimensions: Json | null
          enable_discussions: boolean | null
          features: string[] | null
          id: string
          images: Json | null
          influencer_enabled: boolean | null
          inventory_quantity: number | null
          is_active: boolean | null
          is_digital: boolean | null
          is_featured: boolean | null
          is_free_shipping: boolean | null
          low_stock_threshold: number | null
          material: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          price: number
          price_usd: number
          pricing_type: string | null
          product_type: Database["public"]["Enums"]["product_type"] | null
          published_at: string | null
          rating: number | null
          rating_breakdown: Json | null
          requires_shipping: boolean | null
          review_count: number | null
          sale_count: number | null
          shopify_handle: string | null
          shopify_product_id: string | null
          shopify_synced_at: string | null
          shopify_variant_id: number | null
          short_description: string | null
          show_author: boolean | null
          show_reviews: boolean | null
          sku: string | null
          slug: string
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
          barcode?: string | null
          billing_period?: string | null
          brand?: string | null
          button_text?: string | null
          category_id?: string | null
          cj_last_synced_at?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          digital_file_size?: number | null
          digital_file_url?: string | null
          dimensions?: Json | null
          enable_discussions?: boolean | null
          features?: string[] | null
          id?: string
          images?: Json | null
          influencer_enabled?: boolean | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_free_shipping?: boolean | null
          low_stock_threshold?: number | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          price?: number
          price_usd?: number
          pricing_type?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          published_at?: string | null
          rating?: number | null
          rating_breakdown?: Json | null
          requires_shipping?: boolean | null
          review_count?: number | null
          sale_count?: number | null
          shopify_handle?: string | null
          shopify_product_id?: string | null
          shopify_synced_at?: string | null
          shopify_variant_id?: number | null
          short_description?: string | null
          show_author?: boolean | null
          show_reviews?: boolean | null
          sku?: string | null
          slug: string
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
          barcode?: string | null
          billing_period?: string | null
          brand?: string | null
          button_text?: string | null
          category_id?: string | null
          cj_last_synced_at?: string | null
          compare_at_price?: number | null
          cost_price?: number | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          digital_file_size?: number | null
          digital_file_url?: string | null
          dimensions?: Json | null
          enable_discussions?: boolean | null
          features?: string[] | null
          id?: string
          images?: Json | null
          influencer_enabled?: boolean | null
          inventory_quantity?: number | null
          is_active?: boolean | null
          is_digital?: boolean | null
          is_featured?: boolean | null
          is_free_shipping?: boolean | null
          low_stock_threshold?: number | null
          material?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          price?: number
          price_usd?: number
          pricing_type?: string | null
          product_type?: Database["public"]["Enums"]["product_type"] | null
          published_at?: string | null
          rating?: number | null
          rating_breakdown?: Json | null
          requires_shipping?: boolean | null
          review_count?: number | null
          sale_count?: number | null
          shopify_handle?: string | null
          shopify_product_id?: string | null
          shopify_synced_at?: string | null
          shopify_variant_id?: number | null
          short_description?: string | null
          show_author?: boolean | null
          show_reviews?: boolean | null
          sku?: string | null
          slug?: string
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
      rooms: {
        Row: {
          access_type: string | null
          community_id: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          is_locked: boolean | null
          name: string
          room_type: string
          slug: string
          sort_order: number | null
          space_id: string
          updated_at: string | null
        }
        Insert: {
          access_type?: string | null
          community_id: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          name: string
          room_type?: string
          slug: string
          sort_order?: number | null
          space_id: string
          updated_at?: string | null
        }
        Update: {
          access_type?: string | null
          community_id?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          is_locked?: boolean | null
          name?: string
          room_type?: string
          slug?: string
          sort_order?: number | null
          space_id?: string
          updated_at?: string | null
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
      spaces: {
        Row: {
          access_type: string | null
          color: string | null
          community_id: string
          created_at: string | null
          currency: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          member_count: number | null
          name: string
          price: number | null
          room_count: number | null
          slug: string
          sort_order: number | null
          space_type: string
          updated_at: string | null
        }
        Insert: {
          access_type?: string | null
          color?: string | null
          community_id: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          name: string
          price?: number | null
          room_count?: number | null
          slug: string
          sort_order?: number | null
          space_type?: string
          updated_at?: string | null
        }
        Update: {
          access_type?: string | null
          color?: string | null
          community_id?: string
          created_at?: string | null
          currency?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          member_count?: number | null
          name?: string
          price?: number | null
          room_count?: number | null
          slug?: string
          sort_order?: number | null
          space_type?: string
          updated_at?: string | null
        }
        Relationships: [
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
      ugc_campaign_escrow: {
        Row: {
          amount: number
          campaign_id: string
          currency: string
          deposited_at: string | null
          deposited_by: string
          id: string
          payment_method: string | null
          payment_ref: string | null
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
          payment_method?: string | null
          payment_ref?: string | null
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
          payment_method?: string | null
          payment_ref?: string | null
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
          campaign_id: string
          id: string
          influencer_id: string
          joined_at: string | null
          status: Database["public"]["Enums"]["ugc_participation_status"]
        }
        Insert: {
          campaign_id: string
          id?: string
          influencer_id: string
          joined_at?: string | null
          status?: Database["public"]["Enums"]["ugc_participation_status"]
        }
        Update: {
          campaign_id?: string
          id?: string
          influencer_id?: string
          joined_at?: string | null
          status?: Database["public"]["Enums"]["ugc_participation_status"]
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
          max_duration: number | null
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
          activated_by_admin: boolean
          admin_activated_at: string | null
          admin_activated_by: string | null
          admin_activation_reason: string | null
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
          max_duration?: number | null
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
          activated_by_admin?: boolean
          admin_activated_at?: string | null
          admin_activated_by?: string | null
          admin_activation_reason?: string | null
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
          max_duration?: number | null
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
          activated_by_admin?: boolean
          admin_activated_at?: string | null
          admin_activated_by?: string | null
          admin_activation_reason?: string | null
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
      ugc_submissions: {
        Row: {
          campaign_id: string
          caption: string | null
          created_at: string | null
          fraud_score: number | null
          id: string
          influencer_id: string
          is_suspicious: boolean | null
          last_synced_at: string | null
          platform: Database["public"]["Enums"]["ugc_platform"]
          post_url: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ugc_submission_status"]
          total_earnings: number | null
          total_views_earned: number | null
          updated_at: string | null
        }
        Insert: {
          campaign_id: string
          caption?: string | null
          created_at?: string | null
          fraud_score?: number | null
          id?: string
          influencer_id: string
          is_suspicious?: boolean | null
          last_synced_at?: string | null
          platform: Database["public"]["Enums"]["ugc_platform"]
          post_url: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ugc_submission_status"]
          total_earnings?: number | null
          total_views_earned?: number | null
          updated_at?: string | null
        }
        Update: {
          campaign_id?: string
          caption?: string | null
          created_at?: string | null
          fraud_score?: number | null
          id?: string
          influencer_id?: string
          is_suspicious?: boolean | null
          last_synced_at?: string | null
          platform?: Database["public"]["Enums"]["ugc_platform"]
          post_url?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ugc_submission_status"]
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
            foreignKeyName: "ugc_submissions_reviewed_by_fkey"
            columns: ["reviewed_by"]
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
      user_2fa_secrets: {
        Row: {
          backup_codes: Json
          created_at: string | null
          pending_backup_codes: Json | null
          pending_expires_at: string | null
          pending_secret: string | null
          secret: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          backup_codes?: Json
          created_at?: string | null
          pending_backup_codes?: Json | null
          pending_expires_at?: string | null
          pending_secret?: string | null
          secret: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          backup_codes?: Json
          created_at?: string | null
          pending_backup_codes?: Json | null
          pending_expires_at?: string | null
          pending_secret?: string | null
          secret?: string
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
      [_ in never]: never
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
      decrement_post_like_count: {
        Args: { p_post_id: string }
        Returns: undefined
      }
      decrement_video_like_count: { Args: { vid: string }; Returns: undefined }
      decrypt_token: { Args: { ciphertext: string }; Returns: string }
      encrypt_token: { Args: { plaintext: string }; Returns: string }
      get_or_create_community_inbox_conversation: {
        Args: { p_community_id: string; p_peer_id: string }
        Returns: string
      }
      get_user_roles: { Args: { lookup_user_id: string }; Returns: string[] }
      increment_affiliate_clicks: {
        Args: { p_affiliate_id: string }
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
      increment_wallet_balance: {
        Args: { p_amount: number; p_wallet_id: string }
        Returns: undefined
      }
      merge_variant_source_metadata: {
        Args: { p_cj_vid: string; p_patch: Json }
        Returns: undefined
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      toggle_community_message_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: Json
      }
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
      ugc_participation_status: "invited" | "accepted" | "rejected" | "banned"
      ugc_payment_model: "per_views" | "fixed_per_content"
      ugc_payout_status: "pending" | "approved" | "paid"
      ugc_platform: "tiktok" | "instagram" | "youtube" | "x"
      ugc_platform_format:
        | "reels"
        | "tiktok_video"
        | "youtube_short"
        | "post"
        | "story"
      ugc_submission_status: "pending" | "approved" | "rejected" | "removed"
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
      ugc_participation_status: ["invited", "accepted", "rejected", "banned"],
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
      ugc_submission_status: ["pending", "approved", "rejected", "removed"],
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
