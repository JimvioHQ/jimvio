-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "auth"."aal_level" AS ENUM ('aal1', 'aal2', 'aal3');

-- CreateEnum
CREATE TYPE "auth"."code_challenge_method" AS ENUM ('s256', 'plain');

-- CreateEnum
CREATE TYPE "auth"."factor_status" AS ENUM ('unverified', 'verified');

-- CreateEnum
CREATE TYPE "auth"."factor_type" AS ENUM ('totp', 'webauthn', 'phone');

-- CreateEnum
CREATE TYPE "auth"."oauth_authorization_status" AS ENUM ('pending', 'approved', 'denied', 'expired');

-- CreateEnum
CREATE TYPE "auth"."oauth_client_type" AS ENUM ('public', 'confidential');

-- CreateEnum
CREATE TYPE "auth"."oauth_registration_type" AS ENUM ('dynamic', 'manual');

-- CreateEnum
CREATE TYPE "auth"."oauth_response_type" AS ENUM ('code');

-- CreateEnum
CREATE TYPE "auth"."one_time_token_type" AS ENUM ('confirmation_token', 'reauthentication_token', 'recovery_token', 'email_change_token_new', 'email_change_token_current', 'phone_change_token');

-- CreateEnum
CREATE TYPE "campaign_status" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "notification_type" AS ENUM ('order', 'payment', 'affiliate', 'influencer', 'community', 'system', 'review', 'message');

-- CreateEnum
CREATE TYPE "order_status" AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded', 'completed');

-- CreateEnum
CREATE TYPE "payment_status" AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled', 'paid');

-- CreateEnum
CREATE TYPE "payout_status" AS ENUM ('pending', 'processing', 'paid', 'failed');

-- CreateEnum
CREATE TYPE "product_status" AS ENUM ('draft', 'active', 'paused', 'archived');

-- CreateEnum
CREATE TYPE "product_type" AS ENUM ('physical', 'digital', 'subscription', 'course', 'software', 'template', 'ebook');

-- CreateEnum
CREATE TYPE "ugc_campaign_status" AS ENUM ('draft', 'active', 'paused', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "ugc_campaign_type" AS ENUM ('clipping', 'ugc', 'music_clipping', 'promotion');

-- CreateEnum
CREATE TYPE "ugc_media_type" AS ENUM ('image', 'video', 'file');

-- CreateEnum
CREATE TYPE "ugc_media_usage" AS ENUM ('banner', 'example', 'ad_creative');

-- CreateEnum
CREATE TYPE "ugc_participation_status" AS ENUM ('invited', 'accepted', 'rejected', 'banned');

-- CreateEnum
CREATE TYPE "ugc_payment_model" AS ENUM ('per_views', 'fixed_per_content');

-- CreateEnum
CREATE TYPE "ugc_payout_status" AS ENUM ('pending', 'approved', 'paid');

-- CreateEnum
CREATE TYPE "ugc_platform" AS ENUM ('tiktok', 'instagram', 'youtube', 'x');

-- CreateEnum
CREATE TYPE "ugc_platform_format" AS ENUM ('reels', 'tiktok_video', 'youtube_short', 'post', 'story');

-- CreateEnum
CREATE TYPE "ugc_submission_status" AS ENUM ('pending', 'approved', 'rejected', 'removed');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('buyer', 'vendor', 'affiliate', 'influencer', 'community_owner', 'admin');

-- CreateEnum
CREATE TYPE "verification_status" AS ENUM ('pending', 'verified', 'rejected', 'suspended');

-- CreateTable
CREATE TABLE "auth"."audit_log_entries" (
    "instance_id" UUID,
    "id" UUID NOT NULL,
    "payload" JSON,
    "created_at" TIMESTAMPTZ(6),
    "ip_address" VARCHAR(64) NOT NULL DEFAULT '',

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."custom_oauth_providers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider_type" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "client_id" TEXT NOT NULL,
    "client_secret" TEXT NOT NULL,
    "acceptable_client_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "pkce_enabled" BOOLEAN NOT NULL DEFAULT true,
    "attribute_mapping" JSONB NOT NULL DEFAULT '{}',
    "authorization_params" JSONB NOT NULL DEFAULT '{}',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "email_optional" BOOLEAN NOT NULL DEFAULT false,
    "issuer" TEXT,
    "discovery_url" TEXT,
    "skip_nonce_check" BOOLEAN NOT NULL DEFAULT false,
    "cached_discovery" JSONB,
    "discovery_cached_at" TIMESTAMPTZ(6),
    "authorization_url" TEXT,
    "token_url" TEXT,
    "userinfo_url" TEXT,
    "jwks_uri" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "custom_oauth_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."flow_state" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "auth_code" TEXT,
    "code_challenge_method" "auth"."code_challenge_method",
    "code_challenge" TEXT,
    "provider_type" TEXT NOT NULL,
    "provider_access_token" TEXT,
    "provider_refresh_token" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "authentication_method" TEXT NOT NULL,
    "auth_code_issued_at" TIMESTAMPTZ(6),
    "invite_token" TEXT,
    "referrer" TEXT,
    "oauth_client_state_id" UUID,
    "linking_target_id" UUID,
    "email_optional" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "flow_state_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."identities" (
    "provider_id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "identity_data" JSONB NOT NULL,
    "provider" TEXT NOT NULL,
    "last_sign_in_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "email" TEXT DEFAULT lower((identity_data ->> 'email'::text)),
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),

    CONSTRAINT "identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."instances" (
    "id" UUID NOT NULL,
    "uuid" UUID,
    "raw_base_config" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_amr_claims" (
    "session_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "authentication_method" TEXT NOT NULL,
    "id" UUID NOT NULL,

    CONSTRAINT "amr_id_pk" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_challenges" (
    "id" UUID NOT NULL,
    "factor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "verified_at" TIMESTAMPTZ(6),
    "ip_address" INET NOT NULL,
    "otp_code" TEXT,
    "web_authn_session_data" JSONB,

    CONSTRAINT "mfa_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."mfa_factors" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "friendly_name" TEXT,
    "factor_type" "auth"."factor_type" NOT NULL,
    "status" "auth"."factor_status" NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "secret" TEXT,
    "phone" TEXT,
    "last_challenged_at" TIMESTAMPTZ(6),
    "web_authn_credential" JSONB,
    "web_authn_aaguid" UUID,
    "last_webauthn_challenge_data" JSONB,

    CONSTRAINT "mfa_factors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_authorizations" (
    "id" UUID NOT NULL,
    "authorization_id" TEXT NOT NULL,
    "client_id" UUID NOT NULL,
    "user_id" UUID,
    "redirect_uri" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "state" TEXT,
    "resource" TEXT,
    "code_challenge" TEXT,
    "code_challenge_method" "auth"."code_challenge_method",
    "response_type" "auth"."oauth_response_type" NOT NULL DEFAULT 'code',
    "status" "auth"."oauth_authorization_status" NOT NULL DEFAULT 'pending',
    "authorization_code" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL DEFAULT (now() + '00:03:00'::interval),
    "approved_at" TIMESTAMPTZ(6),
    "nonce" TEXT,

    CONSTRAINT "oauth_authorizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_client_states" (
    "id" UUID NOT NULL,
    "provider_type" TEXT NOT NULL,
    "code_verifier" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "oauth_client_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_clients" (
    "id" UUID NOT NULL,
    "client_secret_hash" TEXT,
    "registration_type" "auth"."oauth_registration_type" NOT NULL,
    "redirect_uris" TEXT NOT NULL,
    "grant_types" TEXT NOT NULL,
    "client_name" TEXT,
    "client_uri" TEXT,
    "logo_uri" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),
    "client_type" "auth"."oauth_client_type" NOT NULL DEFAULT 'confidential',
    "token_endpoint_auth_method" TEXT NOT NULL,

    CONSTRAINT "oauth_clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."oauth_consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "client_id" UUID NOT NULL,
    "scopes" TEXT NOT NULL,
    "granted_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "oauth_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."one_time_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_type" "auth"."one_time_token_type" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "relates_to" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "one_time_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."refresh_tokens" (
    "instance_id" UUID,
    "id" BIGSERIAL NOT NULL,
    "token" VARCHAR(255),
    "user_id" VARCHAR(255),
    "revoked" BOOLEAN,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "parent" VARCHAR(255),
    "session_id" UUID,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."saml_providers" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata_xml" TEXT NOT NULL,
    "metadata_url" TEXT,
    "attribute_mapping" JSONB,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "name_id_format" TEXT,

    CONSTRAINT "saml_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."saml_relay_states" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "request_id" TEXT NOT NULL,
    "for_email" TEXT,
    "redirect_to" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "flow_state_id" UUID,

    CONSTRAINT "saml_relay_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."schema_migrations" (
    "version" VARCHAR(255) NOT NULL,

    CONSTRAINT "schema_migrations_pkey" PRIMARY KEY ("version")
);

-- CreateTable
CREATE TABLE "auth"."sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "factor_id" UUID,
    "aal" "auth"."aal_level",
    "not_after" TIMESTAMPTZ(6),
    "refreshed_at" TIMESTAMP(6),
    "user_agent" TEXT,
    "ip" INET,
    "tag" TEXT,
    "oauth_client_id" UUID,
    "refresh_token_hmac_key" TEXT,
    "refresh_token_counter" BIGINT,
    "scopes" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sso_domains" (
    "id" UUID NOT NULL,
    "sso_provider_id" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),

    CONSTRAINT "sso_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."sso_providers" (
    "id" UUID NOT NULL,
    "resource_id" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "disabled" BOOLEAN,

    CONSTRAINT "sso_providers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."users" (
    "instance_id" UUID,
    "id" UUID NOT NULL,
    "aud" VARCHAR(255),
    "role" VARCHAR(255),
    "email" VARCHAR(255),
    "encrypted_password" VARCHAR(255),
    "email_confirmed_at" TIMESTAMPTZ(6),
    "invited_at" TIMESTAMPTZ(6),
    "confirmation_token" VARCHAR(255),
    "confirmation_sent_at" TIMESTAMPTZ(6),
    "recovery_token" VARCHAR(255),
    "recovery_sent_at" TIMESTAMPTZ(6),
    "email_change_token_new" VARCHAR(255),
    "email_change" VARCHAR(255),
    "email_change_sent_at" TIMESTAMPTZ(6),
    "last_sign_in_at" TIMESTAMPTZ(6),
    "raw_app_meta_data" JSONB,
    "raw_user_meta_data" JSONB,
    "is_super_admin" BOOLEAN,
    "created_at" TIMESTAMPTZ(6),
    "updated_at" TIMESTAMPTZ(6),
    "phone" TEXT,
    "phone_confirmed_at" TIMESTAMPTZ(6),
    "phone_change" TEXT DEFAULT '',
    "phone_change_token" VARCHAR(255) DEFAULT '',
    "phone_change_sent_at" TIMESTAMPTZ(6),
    "confirmed_at" TIMESTAMPTZ(6) DEFAULT LEAST(email_confirmed_at, phone_confirmed_at),
    "email_change_token_current" VARCHAR(255) DEFAULT '',
    "email_change_confirm_status" SMALLINT DEFAULT 0,
    "banned_until" TIMESTAMPTZ(6),
    "reauthentication_token" VARCHAR(255) DEFAULT '',
    "reauthentication_sent_at" TIMESTAMPTZ(6),
    "is_sso_user" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "is_anonymous" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."webauthn_challenges" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "challenge_type" TEXT NOT NULL,
    "session_data" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "webauthn_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."webauthn_credentials" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "credential_id" BYTEA NOT NULL,
    "public_key" BYTEA NOT NULL,
    "attestation_type" TEXT NOT NULL DEFAULT '',
    "aaguid" UUID,
    "sign_count" BIGINT NOT NULL DEFAULT 0,
    "transports" JSONB NOT NULL DEFAULT '[]',
    "backup_eligible" BOOLEAN NOT NULL DEFAULT false,
    "backed_up" BOOLEAN NOT NULL DEFAULT false,
    "friendly_name" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used_at" TIMESTAMPTZ(6),

    CONSTRAINT "webauthn_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_clicks" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "link_id" UUID NOT NULL,
    "affiliate_id" UUID NOT NULL,
    "ip_address" INET,
    "user_agent" TEXT,
    "referrer" TEXT,
    "country" TEXT,
    "device_type" TEXT,
    "session_id" TEXT,
    "converted" BOOLEAN DEFAULT false,
    "converted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_commissions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "affiliate_id" UUID NOT NULL,
    "link_id" UUID,
    "order_id" UUID NOT NULL,
    "order_item_id" UUID,
    "product_id" UUID,
    "vendor_id" UUID,
    "commission_rate" DECIMAL(5,2) NOT NULL,
    "order_amount" DECIMAL(14,2) NOT NULL,
    "commission_amount" DECIMAL(14,2) NOT NULL,
    "status" "payout_status" DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(6),
    "payout_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliate_links" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "affiliate_id" UUID NOT NULL,
    "product_id" UUID,
    "vendor_id" UUID,
    "link_code" TEXT NOT NULL DEFAULT ('LNK-'::text || upper("substring"((gen_random_uuid())::text, 1, 10))),
    "custom_slug" TEXT,
    "destination_url" TEXT NOT NULL,
    "full_url" TEXT,
    "commission_rate" DECIMAL(5,2),
    "total_clicks" BIGINT DEFAULT 0,
    "unique_clicks" BIGINT DEFAULT 0,
    "total_conversions" BIGINT DEFAULT 0,
    "total_earnings" DECIMAL(14,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "expires_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "affiliates" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "affiliate_code" TEXT NOT NULL DEFAULT ('AFF-'::text || upper("substring"((gen_random_uuid())::text, 1, 8))),
    "bio" TEXT,
    "website" TEXT,
    "social_links" JSONB DEFAULT '{}',
    "niche" TEXT[],
    "tier" TEXT DEFAULT 'bronze',
    "total_clicks" BIGINT DEFAULT 0,
    "total_conversions" BIGINT DEFAULT 0,
    "total_earnings" DECIMAL(14,2) DEFAULT 0,
    "available_balance" DECIMAL(14,2) DEFAULT 0,
    "pending_earnings" DECIMAL(14,2) DEFAULT 0,
    "paid_earnings" DECIMAL(14,2) DEFAULT 0,
    "conversion_rate" DECIMAL(5,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "payout_method" TEXT DEFAULT 'bank',
    "payout_account" TEXT,

    CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "published_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_time_minutes" INTEGER NOT NULL DEFAULT 5,
    "category" TEXT NOT NULL DEFAULT 'General',
    "image_url" TEXT,
    "body" TEXT,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buying_lead_offers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buying_request_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "message" TEXT,
    "offered_price" DECIMAL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buying_lead_offers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buying_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_id" UUID NOT NULL,
    "product_name" TEXT NOT NULL,
    "category" TEXT,
    "quantity_needed" DECIMAL NOT NULL DEFAULT 1,
    "budget_min" DECIMAL,
    "budget_max" DECIMAL,
    "delivery_country" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buying_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "long_description" TEXT,
    "avatar_url" TEXT,
    "cover_image" TEXT,
    "category" TEXT,
    "tags" TEXT[],
    "is_private" BOOLEAN DEFAULT false,
    "is_free" BOOLEAN DEFAULT true,
    "monthly_price" DECIMAL DEFAULT 0,
    "yearly_price" DECIMAL DEFAULT 0,
    "lifetime_price" DECIMAL DEFAULT 0,
    "currency" TEXT DEFAULT 'USD',
    "trial_days" INTEGER DEFAULT 0,
    "member_count" INTEGER DEFAULT 0,
    "space_count" INTEGER DEFAULT 0,
    "post_count" INTEGER DEFAULT 0,
    "is_featured" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "platform_commission_rate" DECIMAL DEFAULT 15,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_courses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnail_url" TEXT,
    "total_modules" INTEGER DEFAULT 0,
    "total_lessons" INTEGER DEFAULT 0,
    "total_duration" INTEGER DEFAULT 0,
    "difficulty" TEXT DEFAULT 'beginner',
    "is_published" BOOLEAN DEFAULT false,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_inbox_conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "user_low" UUID NOT NULL,
    "user_high" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_inbox_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_inbox_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "attachments" JSONB DEFAULT '[]',
    "message_type" TEXT DEFAULT 'text',
    "reactions" JSONB DEFAULT '{}',

    CONSTRAINT "community_inbox_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT DEFAULT 'member',
    "plan_type" TEXT DEFAULT 'free',
    "status" TEXT DEFAULT 'active',
    "subscribed_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "payment_reference" TEXT,
    "payment_provider" TEXT,
    "amount_paid" DECIMAL DEFAULT 0,
    "space_access" UUID[] DEFAULT ARRAY[]::UUID[],
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT DEFAULT '',
    "message_type" TEXT DEFAULT 'text',
    "thread_id" UUID,
    "reply_count" INTEGER DEFAULT 0,
    "attachments" JSONB DEFAULT '[]',
    "reactions" JSONB DEFAULT '{}',
    "is_pinned" BOOLEAN DEFAULT false,
    "is_edited" BOOLEAN DEFAULT false,
    "edited_at" TIMESTAMPTZ(6),
    "is_deleted" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "membership_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT DEFAULT 'USD',
    "plan_type" TEXT NOT NULL,
    "payment_provider" TEXT,
    "payment_reference" TEXT,
    "platform_commission" DECIMAL DEFAULT 0,
    "creator_earnings" DECIMAL DEFAULT 0,
    "status" TEXT DEFAULT 'pending',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "parent_id" UUID,
    "body" TEXT NOT NULL,
    "like_count" INTEGER DEFAULT 0,
    "is_published" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_post_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "post_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "space_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "post_type" TEXT DEFAULT 'discussion',
    "images" JSONB DEFAULT '[]',
    "attachments" JSONB DEFAULT '[]',
    "video_url" TEXT,
    "like_count" INTEGER DEFAULT 0,
    "comment_count" INTEGER DEFAULT 0,
    "view_count" INTEGER DEFAULT 0,
    "is_pinned" BOOLEAN DEFAULT false,
    "is_exclusive" BOOLEAN DEFAULT false,
    "is_published" BOOLEAN DEFAULT true,
    "published_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_saved_posts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "post_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_saved_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_tasks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "task_type" TEXT DEFAULT 'daily',
    "difficulty" TEXT DEFAULT 'easy',
    "points" INTEGER DEFAULT 10,
    "is_recurring" BOOLEAN DEFAULT false,
    "recurrence_days" INTEGER DEFAULT 1,
    "due_date" TIMESTAMPTZ(6),
    "completion_count" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "community_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_messages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "conversation_id" UUID NOT NULL,
    "sender_id" UUID NOT NULL,
    "body" TEXT DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "reply_to_id" UUID,
    "metadata" JSONB NOT NULL DEFAULT '{}',

    CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "buyer_id" UUID NOT NULL,
    "vendor_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_lessons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "module_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "video_url" TEXT,
    "duration" INTEGER DEFAULT 0,
    "sort_order" INTEGER DEFAULT 0,
    "is_free" BOOLEAN DEFAULT false,
    "attachments" JSONB DEFAULT '[]',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "course_modules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "course_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "is_free" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exchange_rate_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_currency" TEXT NOT NULL,
    "to_currency" TEXT NOT NULL,
    "rate" DECIMAL(14,6) NOT NULL,
    "order_id" UUID,
    "recorded_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rate_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "influencers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "display_name" TEXT NOT NULL,
    "niche" TEXT[],
    "bio" TEXT,
    "profile_image" TEXT,
    "cover_image" TEXT,
    "social_platforms" JSONB DEFAULT '{}',
    "total_followers" BIGINT DEFAULT 0,
    "engagement_rate" DECIMAL(5,2) DEFAULT 0,
    "total_campaigns" INTEGER DEFAULT 0,
    "total_earnings" DECIMAL(14,2) DEFAULT 0,
    "available_balance" DECIMAL(14,2) DEFAULT 0,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "is_verified" BOOLEAN DEFAULT false,
    "is_featured" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "guidelines_accepted_at" TIMESTAMPTZ(6),
    "pending_balance" DECIMAL DEFAULT 0,

    CONSTRAINT "influencers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "lesson_id" UUID NOT NULL,
    "course_id" UUID NOT NULL,
    "is_completed" BOOLEAN DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "watch_time" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "member_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "total_points" INTEGER DEFAULT 0,
    "level" INTEGER DEFAULT 1,
    "streak_days" INTEGER DEFAULT 0,
    "last_active_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "member_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" "notification_type" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB DEFAULT '{}',
    "is_read" BOOLEAN DEFAULT false,
    "read_at" TIMESTAMPTZ(6),
    "action_url" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_id" UUID NOT NULL,
    "product_id" UUID,
    "variant_id" UUID,
    "vendor_id" UUID,
    "product_name" TEXT NOT NULL,
    "product_image" TEXT,
    "variant_name" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unit_price" DECIMAL(14,2) NOT NULL,
    "total_price" DECIMAL(14,2) NOT NULL,
    "affiliate_id" UUID,
    "affiliate_commission_rate" DECIMAL(5,2),
    "affiliate_commission_amount" DECIMAL(14,2),
    "digital_download_url" TEXT,
    "download_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "shopify_variant_id" BIGINT,
    "shopify_product_id" TEXT,
    "product_source" TEXT NOT NULL DEFAULT 'vendor',
    "source_metadata" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "product_type" TEXT DEFAULT 'physical',
    "access_granted_at" TIMESTAMPTZ(6),
    "pricing_type" TEXT DEFAULT 'one_time',
    "billing_period" TEXT,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_status_history" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "user_id" UUID,
    "previous_status" TEXT,
    "new_status" TEXT NOT NULL,
    "notes" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "order_number" TEXT NOT NULL DEFAULT ('ORD-'::text || upper("substring"((gen_random_uuid())::text, 1, 8))),
    "buyer_id" UUID NOT NULL,
    "vendor_id" UUID,
    "affiliate_id" UUID,
    "status" "order_status" DEFAULT 'pending',
    "payment_status" "payment_status" DEFAULT 'pending',
    "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "discount_amount" DECIMAL(14,2) DEFAULT 0,
    "shipping_amount" DECIMAL(14,2) DEFAULT 0,
    "tax_amount" DECIMAL(14,2) DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT DEFAULT 'RWF',
    "shipping_address" JSONB,
    "billing_address" JSONB,
    "notes" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "paid_at" TIMESTAMPTZ(6),
    "shipped_at" TIMESTAMPTZ(6),
    "delivered_at" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "integration_source" TEXT,
    "shopify_order_id" TEXT,
    "shopify_order_number" INTEGER,
    "shopify_fulfillment_status" TEXT DEFAULT 'unfulfilled',
    "shopify_order_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tracking_number" TEXT,
    "tracking_status" TEXT,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(14,2) DEFAULT 0,
    "net_amount" DECIMAL(14,2),
    "currency" TEXT DEFAULT 'RWF',
    "status" "payout_status" DEFAULT 'pending',
    "payout_method" TEXT DEFAULT 'mtn',
    "payout_account" TEXT,
    "provider_reference" TEXT,
    "notes" TEXT,
    "processed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "release_date" TIMESTAMPTZ(6),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL DEFAULT '{}',
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "parent_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "image_url" TEXT,
    "color" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "sort_order" INTEGER DEFAULT 0,
    "product_count" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "category_type" TEXT NOT NULL DEFAULT 'physical',

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_variants" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "product_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "price" DECIMAL(14,2) NOT NULL,
    "compare_at_price" DECIMAL(14,2),
    "inventory_quantity" INTEGER DEFAULT 0,
    "image_url" TEXT,
    "options" JSONB DEFAULT '{}',
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_views" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "product_id" UUID NOT NULL,
    "user_id" UUID,
    "session_id" TEXT,
    "ip_address" INET,
    "referrer" TEXT,
    "country" TEXT,
    "device_type" TEXT,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "category_id" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "short_description" TEXT,
    "description" TEXT,
    "product_type" "product_type" DEFAULT 'physical',
    "status" "product_status" DEFAULT 'draft',
    "price" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "compare_at_price" DECIMAL(14,2),
    "cost_price" DECIMAL(14,2),
    "currency" TEXT DEFAULT 'RWF',
    "sku" TEXT,
    "barcode" TEXT,
    "weight" DECIMAL(10,3),
    "dimensions" JSONB,
    "images" JSONB DEFAULT '[]',
    "videos" JSONB DEFAULT '[]',
    "tags" TEXT[],
    "meta_title" TEXT,
    "meta_description" TEXT,
    "is_digital" BOOLEAN DEFAULT false,
    "digital_file_url" TEXT,
    "digital_file_size" BIGINT,
    "requires_shipping" BOOLEAN DEFAULT true,
    "track_inventory" BOOLEAN DEFAULT true,
    "inventory_quantity" INTEGER DEFAULT 0,
    "low_stock_threshold" INTEGER DEFAULT 5,
    "allow_backorder" BOOLEAN DEFAULT false,
    "affiliate_enabled" BOOLEAN DEFAULT true,
    "affiliate_commission_rate" DECIMAL(5,2),
    "influencer_enabled" BOOLEAN DEFAULT true,
    "is_featured" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "view_count" INTEGER DEFAULT 0,
    "sale_count" INTEGER DEFAULT 0,
    "rating" DECIMAL(3,2) DEFAULT 0,
    "review_count" INTEGER DEFAULT 0,
    "wishlist_count" INTEGER DEFAULT 0,
    "published_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "shopify_product_id" TEXT,
    "shopify_variant_id" BIGINT,
    "shopify_handle" TEXT,
    "shopify_synced_at" TIMESTAMPTZ(6),
    "source" TEXT DEFAULT 'vendor',
    "source_metadata" JSONB NOT NULL DEFAULT '{}',
    "price_usd" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "button_text" TEXT,
    "pricing_type" TEXT DEFAULT 'one_time',
    "billing_period" TEXT,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "full_name" TEXT,
    "avatar_url" TEXT,
    "bio" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "country" TEXT DEFAULT 'RW',
    "city" TEXT,
    "timezone" TEXT DEFAULT 'Africa/Kigali',
    "language" TEXT DEFAULT 'en',
    "is_verified" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "two_factor_enabled" BOOLEAN DEFAULT false,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "product_id" UUID,
    "buyer_id" UUID NOT NULL,
    "order_item_id" UUID,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "images" JSONB DEFAULT '[]',
    "is_verified_purchase" BOOLEAN DEFAULT false,
    "is_featured" BOOLEAN DEFAULT false,
    "helpful_count" INTEGER DEFAULT 0,
    "vendor_reply" TEXT,
    "vendor_replied_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "vendor_id" UUID,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "space_id" UUID NOT NULL,
    "community_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "room_type" TEXT NOT NULL DEFAULT 'chat',
    "access_type" TEXT DEFAULT 'inherit',
    "is_locked" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shopify_credentials" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "shop_domain" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "api_version" TEXT NOT NULL DEFAULT '2024-07',
    "platform_commission_rate" DECIMAL NOT NULL DEFAULT 8,
    "connected_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" TIMESTAMPTZ(6),
    "is_active" BOOLEAN DEFAULT true,

    CONSTRAINT "shopify_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_clicks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID,
    "product_id" UUID,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "order_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "community_id" UUID,

    CONSTRAINT "short_video_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_earnings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "creator_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "amount" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "reference_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_earnings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_likes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_video_views" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "video_id" UUID NOT NULL,
    "viewer_id" UUID,
    "watch_time_sec" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "short_video_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "short_videos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "creator_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "video_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration_sec" INTEGER DEFAULT 0,
    "product_id" UUID,
    "community_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'processing',
    "view_count" BIGINT NOT NULL DEFAULT 0,
    "like_count" BIGINT NOT NULL DEFAULT 0,
    "click_count" BIGINT NOT NULL DEFAULT 0,
    "total_earnings" DECIMAL(14,4) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "video_type" VARCHAR(50) DEFAULT 'product',
    "external_link" TEXT,
    "comment_count" INTEGER DEFAULT 0,

    CONSTRAINT "short_videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "community_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "sort_order" INTEGER DEFAULT 0,
    "access_type" TEXT DEFAULT 'free',
    "price" DECIMAL,
    "currency" TEXT DEFAULT 'USD',
    "room_count" INTEGER DEFAULT 0,
    "member_count" INTEGER DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_completions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "task_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "proof_text" TEXT,
    "proof_url" TEXT,
    "status" TEXT DEFAULT 'submitted',
    "points_earned" INTEGER DEFAULT 0,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "order_id" UUID,
    "webhook_event_id" UUID,
    "type" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'credit',
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "amount_usd" DECIMAL(10,2),
    "exchange_rate" DECIMAL(14,6),
    "status" "payment_status" NOT NULL DEFAULT 'pending',
    "provider" TEXT,
    "provider_transaction_id" TEXT,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_campaign_escrow" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "deposited_by" UUID NOT NULL,
    "amount" DECIMAL NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RWF',
    "status" TEXT NOT NULL DEFAULT 'held',
    "payment_method" TEXT,
    "payment_ref" TEXT,
    "deposited_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "released_at" TIMESTAMPTZ(6),

    CONSTRAINT "ugc_campaign_escrow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_campaign_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "type" "ugc_media_type" NOT NULL DEFAULT 'image',
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "usage" "ugc_media_usage" NOT NULL DEFAULT 'example',
    "platform_format" "ugc_platform_format",
    "order_index" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_campaign_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_campaign_participants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "status" "ugc_participation_status" NOT NULL DEFAULT 'accepted',
    "joined_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_campaign_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_campaigns" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "brand_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "campaign_type" "ugc_campaign_type" NOT NULL DEFAULT 'clipping',
    "status" "ugc_campaign_status" NOT NULL DEFAULT 'draft',
    "rate_per_1k_views" DECIMAL NOT NULL DEFAULT 3.00,
    "total_budget" DECIMAL NOT NULL DEFAULT 0,
    "spent_budget" DECIMAL NOT NULL DEFAULT 0,
    "max_payout_per_sub" DECIMAL DEFAULT 400,
    "allowed_platforms" TEXT[] DEFAULT ARRAY['tiktok', 'instagram', 'youtube', 'x']::TEXT[],
    "requires_face" BOOLEAN DEFAULT false,
    "submission_count" INTEGER DEFAULT 0,
    "approved_count" INTEGER DEFAULT 0,
    "total_views_tracked" BIGINT DEFAULT 0,
    "starts_at" TIMESTAMPTZ(6),
    "ends_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "min_duration" INTEGER,
    "max_duration" INTEGER,
    "required_hashtags" JSONB DEFAULT '[]',
    "required_mentions" JSONB DEFAULT '[]',
    "required_keywords" JSONB DEFAULT '[]',
    "music_track_url" TEXT,
    "music_artist_name" TEXT,
    "promotion_target" TEXT,
    "promotion_target_url" TEXT,
    "payment_model" "ugc_payment_model" DEFAULT 'per_views',
    "fixed_rate" DECIMAL DEFAULT 0,

    CONSTRAINT "ugc_campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_payouts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "status" "ugc_payout_status" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMPTZ(6),
    "payout_id" UUID,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_reports" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporter_id" UUID NOT NULL,
    "submission_id" UUID,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_submission_media" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "type" "ugc_media_type" NOT NULL DEFAULT 'video',
    "url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "duration" INTEGER,
    "aspect_ratio" TEXT,
    "platform_format" "ugc_platform_format",
    "file_size" BIGINT,
    "mime_type" TEXT,
    "order_index" INTEGER DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ugc_submission_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_submissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "campaign_id" UUID NOT NULL,
    "influencer_id" UUID NOT NULL,
    "post_url" TEXT NOT NULL,
    "platform" "ugc_platform" NOT NULL,
    "caption" TEXT,
    "status" "ugc_submission_status" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMPTZ(6),
    "total_views_earned" BIGINT DEFAULT 0,
    "total_earnings" DECIMAL DEFAULT 0,
    "last_synced_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "is_suspicious" BOOLEAN DEFAULT false,
    "fraud_score" DECIMAL(5,2) DEFAULT 0.00,

    CONSTRAINT "ugc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ugc_view_snapshots" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "submission_id" UUID NOT NULL,
    "views_at_snapshot" BIGINT NOT NULL DEFAULT 0,
    "delta_views" BIGINT NOT NULL DEFAULT 0,
    "earnings_this_snapshot" DECIMAL NOT NULL DEFAULT 0,
    "snapshotted_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "likes" BIGINT DEFAULT 0,
    "comments" BIGINT DEFAULT 0,
    "shares" BIGINT DEFAULT 0,
    "saves" BIGINT DEFAULT 0,

    CONSTRAINT "ugc_view_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "role" "user_role" NOT NULL,
    "is_active" BOOLEAN DEFAULT true,
    "activated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendor_followers" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "vendor_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendor_followers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vendors" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "business_name" TEXT NOT NULL,
    "business_slug" TEXT NOT NULL,
    "business_description" TEXT,
    "business_logo" TEXT,
    "business_banner" TEXT,
    "business_email" TEXT,
    "business_phone" TEXT,
    "business_address" TEXT,
    "business_country" TEXT DEFAULT 'RW',
    "tax_id" TEXT,
    "website" TEXT,
    "verification_status" "verification_status" DEFAULT 'pending',
    "verification_notes" TEXT,
    "verified_at" TIMESTAMPTZ(6),
    "rating" DECIMAL(3,2) DEFAULT 0,
    "total_sales" INTEGER DEFAULT 0,
    "total_revenue" DECIMAL(14,2) DEFAULT 0,
    "commission_rate" DECIMAL(5,2) DEFAULT 0,
    "affiliate_enabled" BOOLEAN DEFAULT true,
    "affiliate_commission_rate" DECIMAL(5,2) DEFAULT 10,
    "stripe_account_id" TEXT,
    "payout_method" TEXT DEFAULT 'mtn',
    "payout_account" TEXT,
    "is_featured" BOOLEAN DEFAULT false,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "follower_count" INTEGER DEFAULT 0,
    "business_type" TEXT,
    "product_categories" TEXT,

    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallets" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "available_balance" DECIMAL(14,2) DEFAULT 0,
    "pending_balance" DECIMAL(14,2) DEFAULT 0,
    "total_earned" DECIMAL(14,2) DEFAULT 0,
    "total_paid" DECIMAL(14,2) DEFAULT 0,
    "currency" TEXT DEFAULT 'RWF',
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "webhook_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "idempotency_key" TEXT NOT NULL,
    "payload" JSONB,
    "status" TEXT NOT NULL DEFAULT 'received',
    "error" TEXT,
    "order_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlists" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_instance_id_idx" ON "auth"."audit_log_entries"("instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_oauth_providers_identifier_key" ON "auth"."custom_oauth_providers"("identifier");

-- CreateIndex
CREATE INDEX "custom_oauth_providers_created_at_idx" ON "auth"."custom_oauth_providers"("created_at");

-- CreateIndex
CREATE INDEX "custom_oauth_providers_enabled_idx" ON "auth"."custom_oauth_providers"("enabled");

-- CreateIndex
CREATE INDEX "custom_oauth_providers_identifier_idx" ON "auth"."custom_oauth_providers"("identifier");

-- CreateIndex
CREATE INDEX "custom_oauth_providers_provider_type_idx" ON "auth"."custom_oauth_providers"("provider_type");

-- CreateIndex
CREATE INDEX "flow_state_created_at_idx" ON "auth"."flow_state"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_auth_code" ON "auth"."flow_state"("auth_code");

-- CreateIndex
CREATE INDEX "idx_user_id_auth_method" ON "auth"."flow_state"("user_id", "authentication_method");

-- CreateIndex
CREATE INDEX "identities_email_idx" ON "auth"."identities"("email");

-- CreateIndex
CREATE INDEX "identities_user_id_idx" ON "auth"."identities"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "identities_provider_id_provider_unique" ON "auth"."identities"("provider_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_amr_claims_session_id_authentication_method_pkey" ON "auth"."mfa_amr_claims"("session_id", "authentication_method");

-- CreateIndex
CREATE INDEX "mfa_challenge_created_at_idx" ON "auth"."mfa_challenges"("created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "mfa_factors_last_challenged_at_key" ON "auth"."mfa_factors"("last_challenged_at");

-- CreateIndex
CREATE INDEX "factor_id_created_at_idx" ON "auth"."mfa_factors"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "mfa_factors_user_id_idx" ON "auth"."mfa_factors"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "mfa_factors_user_friendly_name_unique" ON "auth"."mfa_factors"("friendly_name", "user_id") WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);

-- CreateIndex
CREATE UNIQUE INDEX "unique_phone_factor_per_user" ON "auth"."mfa_factors"("user_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authorization_id_key" ON "auth"."oauth_authorizations"("authorization_id");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_authorizations_authorization_code_key" ON "auth"."oauth_authorizations"("authorization_code");

-- CreateIndex
CREATE INDEX "oauth_auth_pending_exp_idx" ON "auth"."oauth_authorizations"("expires_at") WHERE (status = 'pending'::auth.oauth_authorization_status);

-- CreateIndex
CREATE INDEX "idx_oauth_client_states_created_at" ON "auth"."oauth_client_states"("created_at");

-- CreateIndex
CREATE INDEX "oauth_clients_deleted_at_idx" ON "auth"."oauth_clients"("deleted_at");

-- CreateIndex
CREATE INDEX "oauth_consents_active_client_idx" ON "auth"."oauth_consents"("client_id") WHERE (revoked_at IS NULL);

-- CreateIndex
CREATE INDEX "oauth_consents_active_user_client_idx" ON "auth"."oauth_consents"("user_id", "client_id") WHERE (revoked_at IS NULL);

-- CreateIndex
CREATE INDEX "oauth_consents_user_order_idx" ON "auth"."oauth_consents"("user_id", "granted_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "oauth_consents_user_client_unique" ON "auth"."oauth_consents"("user_id", "client_id");

-- CreateIndex
CREATE INDEX "one_time_tokens_relates_to_hash_idx" ON "auth"."one_time_tokens" USING HASH ("relates_to");

-- CreateIndex
CREATE INDEX "one_time_tokens_token_hash_hash_idx" ON "auth"."one_time_tokens" USING HASH ("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "one_time_tokens_user_id_token_type_key" ON "auth"."one_time_tokens"("user_id", "token_type");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_unique" ON "auth"."refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_instance_id_idx" ON "auth"."refresh_tokens"("instance_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_instance_id_user_id_idx" ON "auth"."refresh_tokens"("instance_id", "user_id");

-- CreateIndex
CREATE INDEX "refresh_tokens_parent_idx" ON "auth"."refresh_tokens"("parent");

-- CreateIndex
CREATE INDEX "refresh_tokens_session_id_revoked_idx" ON "auth"."refresh_tokens"("session_id", "revoked");

-- CreateIndex
CREATE INDEX "refresh_tokens_updated_at_idx" ON "auth"."refresh_tokens"("updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "saml_providers_entity_id_key" ON "auth"."saml_providers"("entity_id");

-- CreateIndex
CREATE INDEX "saml_providers_sso_provider_id_idx" ON "auth"."saml_providers"("sso_provider_id");

-- CreateIndex
CREATE INDEX "saml_relay_states_created_at_idx" ON "auth"."saml_relay_states"("created_at" DESC);

-- CreateIndex
CREATE INDEX "saml_relay_states_for_email_idx" ON "auth"."saml_relay_states"("for_email");

-- CreateIndex
CREATE INDEX "saml_relay_states_sso_provider_id_idx" ON "auth"."saml_relay_states"("sso_provider_id");

-- CreateIndex
CREATE INDEX "sessions_not_after_idx" ON "auth"."sessions"("not_after" DESC);

-- CreateIndex
CREATE INDEX "sessions_oauth_client_id_idx" ON "auth"."sessions"("oauth_client_id");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "auth"."sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_id_created_at_idx" ON "auth"."sessions"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "sso_domains_sso_provider_id_idx" ON "auth"."sso_domains"("sso_provider_id");

-- CreateIndex
CREATE INDEX "sso_providers_resource_id_pattern_idx" ON "auth"."sso_providers"("resource_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_partial_key" ON "auth"."users"("email") WHERE (is_sso_user = false);

-- CreateIndex
CREATE UNIQUE INDEX "confirmation_token_idx" ON "auth"."users"("confirmation_token") WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "recovery_token_idx" ON "auth"."users"("recovery_token") WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "email_change_token_new_idx" ON "auth"."users"("email_change_token_new") WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "auth"."users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "email_change_token_current_idx" ON "auth"."users"("email_change_token_current") WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE UNIQUE INDEX "reauthentication_token_idx" ON "auth"."users"("reauthentication_token") WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);

-- CreateIndex
CREATE INDEX "users_instance_id_idx" ON "auth"."users"("instance_id");

-- CreateIndex
CREATE INDEX "users_is_anonymous_idx" ON "auth"."users"("is_anonymous");

-- CreateIndex
CREATE INDEX "webauthn_challenges_expires_at_idx" ON "auth"."webauthn_challenges"("expires_at");

-- CreateIndex
CREATE INDEX "webauthn_challenges_user_id_idx" ON "auth"."webauthn_challenges"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "webauthn_credentials_credential_id_key" ON "auth"."webauthn_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "webauthn_credentials_user_id_idx" ON "auth"."webauthn_credentials"("user_id");

-- CreateIndex
CREATE INDEX "idx_affiliate_clicks_created_at" ON "affiliate_clicks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_affiliate_clicks_link_id" ON "affiliate_clicks"("link_id");

-- CreateIndex
CREATE INDEX "idx_affiliate_commissions_affiliate_id" ON "affiliate_commissions"("affiliate_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_link_code_key" ON "affiliate_links"("link_code");

-- CreateIndex
CREATE UNIQUE INDEX "affiliate_links_custom_slug_key" ON "affiliate_links"("custom_slug");

-- CreateIndex
CREATE INDEX "idx_affiliate_links_affiliate_id" ON "affiliate_links"("affiliate_id");

-- CreateIndex
CREATE INDEX "idx_affiliate_links_product_id" ON "affiliate_links"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_user_id_key" ON "affiliates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "affiliates_affiliate_code_key" ON "affiliates"("affiliate_code");

-- CreateIndex
CREATE INDEX "idx_affiliates_code" ON "affiliates"("affiliate_code");

-- CreateIndex
CREATE INDEX "idx_affiliates_user_id" ON "affiliates"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_published_idx" ON "blog_posts"("is_published", "published_at" DESC);

-- CreateIndex
CREATE INDEX "idx_buying_lead_offers_request" ON "buying_lead_offers"("buying_request_id");

-- CreateIndex
CREATE INDEX "idx_buying_requests_buyer" ON "buying_requests"("buyer_id");

-- CreateIndex
CREATE INDEX "idx_buying_requests_status" ON "buying_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE INDEX "idx_communities_owner" ON "communities"("owner_id");

-- CreateIndex
CREATE INDEX "idx_communities_slug" ON "communities"("slug");

-- CreateIndex
CREATE INDEX "idx_courses_room" ON "community_courses"("room_id");

-- CreateIndex
CREATE INDEX "idx_community_inbox_conv_community" ON "community_inbox_conversations"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_inbox_conversations_community_id_user_low_user_hi_key" ON "community_inbox_conversations"("community_id", "user_low", "user_high");

-- CreateIndex
CREATE INDEX "idx_community_inbox_msg_conv" ON "community_inbox_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_memberships_community" ON "community_memberships"("community_id");

-- CreateIndex
CREATE INDEX "idx_memberships_status" ON "community_memberships"("status");

-- CreateIndex
CREATE INDEX "idx_memberships_user" ON "community_memberships"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_memberships_community_id_user_id_key" ON "community_memberships"("community_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_messages_community" ON "community_messages"("community_id");

-- CreateIndex
CREATE INDEX "idx_messages_created" ON "community_messages"("created_at");

-- CreateIndex
CREATE INDEX "idx_messages_room" ON "community_messages"("room_id");

-- CreateIndex
CREATE INDEX "idx_messages_thread" ON "community_messages"("thread_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_payments_payment_reference_key" ON "community_payments"("payment_reference");

-- CreateIndex
CREATE INDEX "idx_payments_community" ON "community_payments"("community_id");

-- CreateIndex
CREATE INDEX "idx_payments_user" ON "community_payments"("user_id");

-- CreateIndex
CREATE INDEX "idx_post_comments_post" ON "community_post_comments"("post_id");

-- CreateIndex
CREATE INDEX "idx_post_likes_post" ON "community_post_likes"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_post_likes_post_id_user_id_key" ON "community_post_likes"("post_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_posts_author" ON "community_posts"("author_id");

-- CreateIndex
CREATE INDEX "idx_posts_community" ON "community_posts"("community_id");

-- CreateIndex
CREATE INDEX "idx_posts_room" ON "community_posts"("room_id");

-- CreateIndex
CREATE INDEX "idx_saved_posts_user" ON "community_saved_posts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "community_saved_posts_user_id_post_id_key" ON "community_saved_posts"("user_id", "post_id");

-- CreateIndex
CREATE INDEX "idx_tasks_room" ON "community_tasks"("room_id");

-- CreateIndex
CREATE INDEX "idx_conversation_messages_conversation" ON "conversation_messages"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_conversation_messages_created" ON "conversation_messages"("conversation_id", "created_at");

-- CreateIndex
CREATE INDEX "idx_conversation_messages_reply_to" ON "conversation_messages"("reply_to_id");

-- CreateIndex
CREATE INDEX "idx_conversations_buyer" ON "conversations"("buyer_id");

-- CreateIndex
CREATE INDEX "idx_conversations_vendor" ON "conversations"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_buyer_id_vendor_id_key" ON "conversations"("buyer_id", "vendor_id");

-- CreateIndex
CREATE INDEX "idx_lessons_course" ON "course_lessons"("course_id");

-- CreateIndex
CREATE INDEX "idx_lessons_module" ON "course_lessons"("module_id");

-- CreateIndex
CREATE INDEX "idx_modules_course" ON "course_modules"("course_id");

-- CreateIndex
CREATE UNIQUE INDEX "influencers_user_id_key" ON "influencers"("user_id");

-- CreateIndex
CREATE INDEX "idx_influencers_user_id" ON "influencers"("user_id");

-- CreateIndex
CREATE INDEX "idx_progress_lesson" ON "lesson_progress"("lesson_id");

-- CreateIndex
CREATE INDEX "idx_progress_user" ON "lesson_progress"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "lesson_progress"("user_id", "lesson_id");

-- CreateIndex
CREATE INDEX "idx_points_community" ON "member_points"("community_id");

-- CreateIndex
CREATE INDEX "idx_points_user" ON "member_points"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "member_points_user_id_community_id_key" ON "member_points"("user_id", "community_id");

-- CreateIndex
CREATE INDEX "idx_notifications_unread" ON "notifications"("user_id", "is_read") WHERE (is_read = false);

-- CreateIndex
CREATE INDEX "idx_notifications_user_id" ON "notifications"("user_id");

-- CreateIndex
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");

-- CreateIndex
CREATE INDEX "idx_order_items_pricing_type" ON "order_items"("pricing_type");

-- CreateIndex
CREATE INDEX "idx_order_items_product_id" ON "order_items"("product_id");

-- CreateIndex
CREATE INDEX "idx_order_items_product_source" ON "order_items"("product_source");

-- CreateIndex
CREATE INDEX "idx_order_items_product_type" ON "order_items"("product_type");

-- CreateIndex
CREATE INDEX "idx_order_status_history_order_id" ON "order_status_history"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");

-- CreateIndex
CREATE INDEX "idx_orders_buyer_id" ON "orders"("buyer_id");

-- CreateIndex
CREATE INDEX "idx_orders_vendor_id" ON "orders"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_orders_status" ON "orders"("status");

-- CreateIndex
CREATE INDEX "idx_orders_payment_status" ON "orders"("payment_status");

-- CreateIndex
CREATE INDEX "idx_orders_created_at" ON "orders"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_orders_integration_source" ON "orders"("integration_source");

-- CreateIndex
CREATE INDEX "platform_settings_updated_at_idx" ON "platform_settings"("updated_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_slug_key" ON "product_categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "product_variants_sku_key" ON "product_variants"("sku");

-- CreateIndex
CREATE INDEX "idx_product_views_created_at" ON "product_views"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_product_views_product_id" ON "product_views"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "idx_products_active" ON "products"("is_active") WHERE (is_active = true);

-- CreateIndex
CREATE INDEX "idx_products_category_id" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "idx_products_featured" ON "products"("is_featured") WHERE (is_featured = true);

-- CreateIndex
CREATE INDEX "idx_products_name_trgm" ON "products" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_products_product_type" ON "products"("product_type");

-- CreateIndex
CREATE INDEX "idx_products_slug" ON "products"("slug");

-- CreateIndex
CREATE INDEX "idx_products_source" ON "products"("source");

-- CreateIndex
CREATE INDEX "idx_products_status" ON "products"("status");

-- CreateIndex
CREATE INDEX "idx_products_type" ON "products"("product_type");

-- CreateIndex
CREATE INDEX "idx_products_vendor_id" ON "products"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_products_shopify_id" ON "products"("shopify_product_id", "vendor_id") WHERE (shopify_product_id IS NOT NULL);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "profiles_username_key" ON "profiles"("username");

-- CreateIndex
CREATE INDEX "idx_profiles_email" ON "profiles"("email");

-- CreateIndex
CREATE INDEX "idx_profiles_username" ON "profiles"("username");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_product_id_buyer_id_key" ON "reviews"("product_id", "buyer_id");

-- CreateIndex
CREATE INDEX "idx_rooms_community" ON "rooms"("community_id");

-- CreateIndex
CREATE INDEX "idx_rooms_room_type" ON "rooms"("room_type");

-- CreateIndex
CREATE INDEX "idx_rooms_space" ON "rooms"("space_id");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_space_id_slug_key" ON "rooms"("space_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "shopify_credentials_vendor_id_key" ON "shopify_credentials"("vendor_id");

-- CreateIndex
CREATE INDEX "idx_shopify_creds_domain" ON "shopify_credentials"("shop_domain");

-- CreateIndex
CREATE INDEX "idx_svclicks_product" ON "short_video_clicks"("product_id");

-- CreateIndex
CREATE INDEX "idx_svclicks_video" ON "short_video_clicks"("video_id");

-- CreateIndex
CREATE INDEX "idx_svearnings_creator" ON "short_video_earnings"("creator_id");

-- CreateIndex
CREATE INDEX "idx_svearnings_video" ON "short_video_earnings"("video_id");

-- CreateIndex
CREATE INDEX "idx_svlikes_video" ON "short_video_likes"("video_id");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_likes_video_id_user_id_key" ON "short_video_likes"("video_id", "user_id");

-- CreateIndex
CREATE INDEX "idx_svviews_video" ON "short_video_views"("video_id");

-- CreateIndex
CREATE INDEX "idx_svviews_viewer" ON "short_video_views"("viewer_id");

-- CreateIndex
CREATE UNIQUE INDEX "short_video_views_video_id_viewer_id_key" ON "short_video_views"("video_id", "viewer_id");

-- CreateIndex
CREATE INDEX "idx_short_videos_community" ON "short_videos"("community_id");

-- CreateIndex
CREATE INDEX "idx_short_videos_creator" ON "short_videos"("creator_id");

-- CreateIndex
CREATE INDEX "idx_short_videos_product" ON "short_videos"("product_id");

-- CreateIndex
CREATE INDEX "idx_short_videos_status" ON "short_videos"("status");

-- CreateIndex
CREATE INDEX "idx_short_videos_user" ON "short_videos"("user_id");

-- CreateIndex
CREATE INDEX "idx_spaces_community" ON "spaces"("community_id");

-- CreateIndex
CREATE UNIQUE INDEX "spaces_community_id_slug_key" ON "spaces"("community_id", "slug");

-- CreateIndex
CREATE INDEX "idx_completions_task" ON "task_completions"("task_id");

-- CreateIndex
CREATE INDEX "idx_completions_user" ON "task_completions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_completions_task_id_user_id_key" ON "task_completions"("task_id", "user_id");

-- CreateIndex
CREATE INDEX "transactions_order_id_idx" ON "transactions"("order_id");

-- CreateIndex
CREATE INDEX "transactions_user_id_idx" ON "transactions"("user_id");

-- CreateIndex
CREATE INDEX "transactions_status_idx" ON "transactions"("status");

-- CreateIndex
CREATE INDEX "transactions_webhook_event_id_idx" ON "transactions"("webhook_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_provider_provider_transaction_id_key" ON "transactions"("provider", "provider_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "ugc_campaign_escrow_campaign_id_key" ON "ugc_campaign_escrow"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_ugc_campaign_media_campaign_id" ON "ugc_campaign_media"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_ugc_media_camp_id" ON "ugc_campaign_media"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_ugc_parts_camp_id" ON "ugc_campaign_participants"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_ugc_parts_inf_id" ON "ugc_campaign_participants"("influencer_id");

-- CreateIndex
CREATE UNIQUE INDEX "ugc_campaign_participants_campaign_id_influencer_id_key" ON "ugc_campaign_participants"("campaign_id", "influencer_id");

-- CreateIndex
CREATE INDEX "idx_ugc_campaigns_brand_id" ON "ugc_campaigns"("brand_id");

-- CreateIndex
CREATE INDEX "idx_ugc_campaigns_status" ON "ugc_campaigns"("status");

-- CreateIndex
CREATE INDEX "idx_ugc_campaigns_type" ON "ugc_campaigns"("campaign_type");

-- CreateIndex
CREATE INDEX "idx_ugc_payouts_created_at" ON "ugc_payouts"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ugc_payouts_inf_id" ON "ugc_payouts"("influencer_id");

-- CreateIndex
CREATE INDEX "idx_ugc_payouts_status" ON "ugc_payouts"("status");

-- CreateIndex
CREATE INDEX "idx_ugc_payouts_sub_id" ON "ugc_payouts"("submission_id");

-- CreateIndex
CREATE INDEX "idx_ugc_reports_status" ON "ugc_reports"("status");

-- CreateIndex
CREATE INDEX "idx_ugc_reports_submission_id" ON "ugc_reports"("submission_id");

-- CreateIndex
CREATE INDEX "idx_ugc_media_sub_id" ON "ugc_submission_media"("submission_id");

-- CreateIndex
CREATE INDEX "idx_ugc_sub_created_at" ON "ugc_submissions"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ugc_submissions_campaign_id" ON "ugc_submissions"("campaign_id");

-- CreateIndex
CREATE INDEX "idx_ugc_submissions_influencer_id" ON "ugc_submissions"("influencer_id");

-- CreateIndex
CREATE INDEX "idx_ugc_submissions_status" ON "ugc_submissions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ugc_submissions_campaign_id_post_url_key" ON "ugc_submissions"("campaign_id", "post_url");

-- CreateIndex
CREATE INDEX "idx_ugc_view_snapshots_at" ON "ugc_view_snapshots"("snapshotted_at" DESC);

-- CreateIndex
CREATE INDEX "idx_ugc_view_snapshots_submission_id" ON "ugc_view_snapshots"("submission_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role" ON "user_roles"("role");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "user_roles"("user_id", "role");

-- CreateIndex
CREATE INDEX "idx_vendor_followers_count" ON "vendor_followers"("vendor_id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_vendor_followers_composite" ON "vendor_followers"("vendor_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendor_followers_vendor_id_user_id_key" ON "vendor_followers"("vendor_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vendors_business_slug_key" ON "vendors"("business_slug");

-- CreateIndex
CREATE INDEX "idx_vendors_name_trgm" ON "vendors" USING GIN ("business_name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "idx_vendors_slug" ON "vendors"("business_slug");

-- CreateIndex
CREATE INDEX "idx_vendors_user_id" ON "vendors"("user_id");

-- CreateIndex
CREATE INDEX "idx_vendors_verification" ON "vendors"("verification_status");

-- CreateIndex
CREATE UNIQUE INDEX "wallets_user_id_key" ON "wallets"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_events_idempotency_key_key" ON "webhook_events"("idempotency_key");

-- CreateIndex
CREATE INDEX "webhook_events_order_id_idx" ON "webhook_events"("order_id") WHERE (order_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "webhook_events_provider_idx" ON "webhook_events"("provider", "created_at" DESC);

-- CreateIndex
CREATE INDEX "webhook_events_status_idx" ON "webhook_events"("status", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "wishlists_user_id_product_id_key" ON "wishlists"("user_id", "product_id");

-- AddForeignKey
ALTER TABLE "auth"."identities" ADD CONSTRAINT "identities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_amr_claims" ADD CONSTRAINT "mfa_amr_claims_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_challenges" ADD CONSTRAINT "mfa_challenges_auth_factor_id_fkey" FOREIGN KEY ("factor_id") REFERENCES "auth"."mfa_factors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."mfa_factors" ADD CONSTRAINT "mfa_factors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."oauth_consents" ADD CONSTRAINT "oauth_consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."one_time_tokens" ADD CONSTRAINT "one_time_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."refresh_tokens" ADD CONSTRAINT "refresh_tokens_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "auth"."sessions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_providers" ADD CONSTRAINT "saml_providers_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_flow_state_id_fkey" FOREIGN KEY ("flow_state_id") REFERENCES "auth"."flow_state"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."saml_relay_states" ADD CONSTRAINT "saml_relay_states_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_oauth_client_id_fkey" FOREIGN KEY ("oauth_client_id") REFERENCES "auth"."oauth_clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."sso_domains" ADD CONSTRAINT "sso_domains_sso_provider_id_fkey" FOREIGN KEY ("sso_provider_id") REFERENCES "auth"."sso_providers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."webauthn_challenges" ADD CONSTRAINT "webauthn_challenges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth"."webauthn_credentials" ADD CONSTRAINT "webauthn_credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "affiliate_links"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_commissions" ADD CONSTRAINT "affiliate_commissions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "affiliates"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliate_links" ADD CONSTRAINT "affiliate_links_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "buying_lead_offers" ADD CONSTRAINT "buying_lead_offers_buying_request_id_fkey" FOREIGN KEY ("buying_request_id") REFERENCES "buying_requests"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "buying_lead_offers" ADD CONSTRAINT "buying_lead_offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "buying_requests" ADD CONSTRAINT "buying_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "communities" ADD CONSTRAINT "communities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_courses" ADD CONSTRAINT "community_courses_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_courses" ADD CONSTRAINT "community_courses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_courses" ADD CONSTRAINT "community_courses_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_inbox_conversations" ADD CONSTRAINT "community_inbox_conversations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_inbox_conversations" ADD CONSTRAINT "community_inbox_conversations_user_high_fkey" FOREIGN KEY ("user_high") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_inbox_conversations" ADD CONSTRAINT "community_inbox_conversations_user_low_fkey" FOREIGN KEY ("user_low") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_inbox_messages" ADD CONSTRAINT "community_inbox_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "community_inbox_conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_inbox_messages" ADD CONSTRAINT "community_inbox_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "community_messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_payments" ADD CONSTRAINT "community_payments_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_payments" ADD CONSTRAINT "community_payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "community_memberships"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_payments" ADD CONSTRAINT "community_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_post_comments" ADD CONSTRAINT "community_post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_post_comments" ADD CONSTRAINT "community_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "community_post_comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_post_comments" ADD CONSTRAINT "community_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_post_likes" ADD CONSTRAINT "community_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_posts" ADD CONSTRAINT "community_posts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_saved_posts" ADD CONSTRAINT "community_saved_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "community_posts"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_saved_posts" ADD CONSTRAINT "community_saved_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_tasks" ADD CONSTRAINT "community_tasks_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_tasks" ADD CONSTRAINT "community_tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "community_tasks" ADD CONSTRAINT "community_tasks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "conversation_messages"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "community_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_lessons" ADD CONSTRAINT "course_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "course_modules"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "course_modules" ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "community_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "exchange_rate_logs" ADD CONSTRAINT "exchange_rate_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "influencers" ADD CONSTRAINT "influencers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "community_courses"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "course_lessons"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_points" ADD CONSTRAINT "member_points_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "member_points" ADD CONSTRAINT "member_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_views" ADD CONSTRAINT "product_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "order_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shopify_credentials" ADD CONSTRAINT "shopify_credentials_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_clicks" ADD CONSTRAINT "short_video_clicks_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_clicks" ADD CONSTRAINT "short_video_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_clicks" ADD CONSTRAINT "short_video_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_clicks" ADD CONSTRAINT "short_video_clicks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_comments" ADD CONSTRAINT "short_video_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_comments" ADD CONSTRAINT "short_video_comments_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_comments" ADD CONSTRAINT "short_video_comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_earnings" ADD CONSTRAINT "short_video_earnings_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_earnings" ADD CONSTRAINT "short_video_earnings_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_likes" ADD CONSTRAINT "short_video_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_likes" ADD CONSTRAINT "short_video_likes_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_views" ADD CONSTRAINT "short_video_views_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "short_videos"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_video_views" ADD CONSTRAINT "short_video_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "short_videos" ADD CONSTRAINT "short_videos_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "community_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "task_completions" ADD CONSTRAINT "task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_webhook_event_id_fkey" FOREIGN KEY ("webhook_event_id") REFERENCES "webhook_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ugc_campaign_escrow" ADD CONSTRAINT "ugc_campaign_escrow_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ugc_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_campaign_escrow" ADD CONSTRAINT "ugc_campaign_escrow_deposited_by_fkey" FOREIGN KEY ("deposited_by") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_campaign_media" ADD CONSTRAINT "ugc_campaign_media_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ugc_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_campaign_participants" ADD CONSTRAINT "ugc_campaign_participants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ugc_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_campaign_participants" ADD CONSTRAINT "ugc_campaign_participants_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_campaigns" ADD CONSTRAINT "ugc_campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_payouts" ADD CONSTRAINT "ugc_payouts_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_payouts" ADD CONSTRAINT "ugc_payouts_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_payouts" ADD CONSTRAINT "ugc_payouts_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ugc_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_reports" ADD CONSTRAINT "ugc_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_reports" ADD CONSTRAINT "ugc_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_reports" ADD CONSTRAINT "ugc_reports_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ugc_submissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_submission_media" ADD CONSTRAINT "ugc_submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ugc_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_submissions" ADD CONSTRAINT "ugc_submissions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "ugc_campaigns"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_submissions" ADD CONSTRAINT "ugc_submissions_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "influencers"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_submissions" ADD CONSTRAINT "ugc_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "profiles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ugc_view_snapshots" ADD CONSTRAINT "ugc_view_snapshots_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "ugc_submissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vendor_followers" ADD CONSTRAINT "vendor_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vendor_followers" ADD CONSTRAINT "vendor_followers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wallets" ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "webhook_events" ADD CONSTRAINT "webhook_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wishlists" ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
