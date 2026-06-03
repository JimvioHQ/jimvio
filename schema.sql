


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "postgres";


CREATE TYPE "public"."campaign_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."campaign_status" OWNER TO "postgres";


CREATE TYPE "public"."community_member_status" AS ENUM (
    'active',
    'paused',
    'cancelled',
    'expired'
);


ALTER TYPE "public"."community_member_status" OWNER TO "postgres";


CREATE TYPE "public"."notification_type" AS ENUM (
    'order',
    'payment',
    'affiliate',
    'influencer',
    'community',
    'system',
    'review',
    'message'
);


ALTER TYPE "public"."notification_type" OWNER TO "postgres";


CREATE TYPE "public"."order_status" AS ENUM (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'delivered',
    'cancelled',
    'refunded',
    'completed',
    'checkout_direct'
);


ALTER TYPE "public"."order_status" OWNER TO "postgres";


CREATE TYPE "public"."payment_status" AS ENUM (
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded',
    'cancelled',
    'paid'
);


ALTER TYPE "public"."payment_status" OWNER TO "postgres";


CREATE TYPE "public"."payout_status" AS ENUM (
    'pending',
    'processing',
    'paid',
    'failed'
);


ALTER TYPE "public"."payout_status" OWNER TO "postgres";


CREATE TYPE "public"."product_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'archived'
);


ALTER TYPE "public"."product_status" OWNER TO "postgres";


CREATE TYPE "public"."product_type" AS ENUM (
    'physical',
    'digital',
    'subscription',
    'course',
    'software',
    'template',
    'ebook',
    'coaching',
    'community',
    'bundle'
);


ALTER TYPE "public"."product_type" OWNER TO "postgres";


CREATE TYPE "public"."subscription_plan" AS ENUM (
    'monthly',
    'yearly',
    'lifetime'
);


ALTER TYPE "public"."subscription_plan" OWNER TO "postgres";


CREATE TYPE "public"."ugc_campaign_status" AS ENUM (
    'draft',
    'active',
    'paused',
    'completed',
    'cancelled'
);


ALTER TYPE "public"."ugc_campaign_status" OWNER TO "postgres";


CREATE TYPE "public"."ugc_campaign_type" AS ENUM (
    'clipping',
    'ugc',
    'music_clipping',
    'promotion'
);


ALTER TYPE "public"."ugc_campaign_type" OWNER TO "postgres";


CREATE TYPE "public"."ugc_media_type" AS ENUM (
    'image',
    'video',
    'file'
);


ALTER TYPE "public"."ugc_media_type" OWNER TO "postgres";


CREATE TYPE "public"."ugc_media_usage" AS ENUM (
    'banner',
    'example',
    'ad_creative'
);


ALTER TYPE "public"."ugc_media_usage" OWNER TO "postgres";


CREATE TYPE "public"."ugc_participation_status" AS ENUM (
    'invited',
    'accepted',
    'rejected',
    'banned'
);


ALTER TYPE "public"."ugc_participation_status" OWNER TO "postgres";


CREATE TYPE "public"."ugc_payment_model" AS ENUM (
    'per_views',
    'fixed_per_content'
);


ALTER TYPE "public"."ugc_payment_model" OWNER TO "postgres";


CREATE TYPE "public"."ugc_payout_status" AS ENUM (
    'pending',
    'approved',
    'paid'
);


ALTER TYPE "public"."ugc_payout_status" OWNER TO "postgres";


CREATE TYPE "public"."ugc_platform" AS ENUM (
    'tiktok',
    'instagram',
    'youtube',
    'x'
);


ALTER TYPE "public"."ugc_platform" OWNER TO "postgres";


CREATE TYPE "public"."ugc_platform_format" AS ENUM (
    'reels',
    'tiktok_video',
    'youtube_short',
    'post',
    'story'
);


ALTER TYPE "public"."ugc_platform_format" OWNER TO "postgres";


CREATE TYPE "public"."ugc_submission_status" AS ENUM (
    'pending',
    'approved',
    'rejected',
    'removed'
);


ALTER TYPE "public"."ugc_submission_status" OWNER TO "postgres";


CREATE TYPE "public"."user_role" AS ENUM (
    'buyer',
    'vendor',
    'affiliate',
    'influencer',
    'community_owner',
    'admin'
);


ALTER TYPE "public"."user_role" OWNER TO "postgres";


CREATE TYPE "public"."verification_status" AS ENUM (
    'pending',
    'verified',
    'rejected',
    'suspended'
);


ALTER TYPE "public"."verification_status" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_to_cart"("p_product_id" "uuid", "p_variant_id" "uuid" DEFAULT NULL::"uuid", "p_quantity" integer DEFAULT 1, "p_affiliate_link_id" "uuid" DEFAULT NULL::"uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_user_id      uuid := auth.uid();
  v_cart_id      uuid;
  v_product      RECORD;
  v_variant      RECORD;
  v_existing_qty integer;
  v_unit_price   numeric(14,2);
  v_currency     text;
  v_item_id      uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF p_quantity < 1 OR p_quantity > 99 THEN
    RAISE EXCEPTION 'Invalid quantity';
  END IF;

  -- Look up product + verify it's purchasable
  SELECT id, vendor_id, price, currency, source, source_metadata,
         status, is_active, deleted_at, track_inventory,
         inventory_quantity, allow_backorder, requires_shipping
    INTO v_product
  FROM public.products
  WHERE id = p_product_id;

  IF NOT FOUND OR v_product.status != 'active'
     OR NOT v_product.is_active OR v_product.deleted_at IS NOT NULL THEN
    RAISE EXCEPTION 'Product not available';
  END IF;

  -- Variant lookup (optional)
  IF p_variant_id IS NOT NULL THEN
    SELECT id, price, inventory_quantity, is_active
      INTO v_variant
    FROM public.product_variants
    WHERE id = p_variant_id AND product_id = p_product_id;

    IF NOT FOUND OR NOT v_variant.is_active THEN
      RAISE EXCEPTION 'Variant not available';
    END IF;

    v_unit_price := v_variant.price;
  ELSE
    v_unit_price := v_product.price;
  END IF;

  v_currency := v_product.currency;

  -- Get or create cart (atomic)
  INSERT INTO public.carts (user_id, currency)
  VALUES (v_user_id, v_currency)
  ON CONFLICT (user_id) DO UPDATE
    SET last_activity_at = now()
  RETURNING id INTO v_cart_id;

  -- Check existing quantity for stock validation
  SELECT id, quantity INTO v_item_id, v_existing_qty
  FROM public.cart_items
  WHERE cart_id = v_cart_id
    AND product_id = p_product_id
    AND variant_id IS NOT DISTINCT FROM p_variant_id;

  v_existing_qty := COALESCE(v_existing_qty, 0);

  -- Stock check (variant first, falls back to product)
  IF v_product.track_inventory AND NOT v_product.allow_backorder THEN
    IF p_variant_id IS NOT NULL THEN
      IF v_existing_qty + p_quantity > v_variant.inventory_quantity THEN
        RAISE EXCEPTION 'Only % in stock', v_variant.inventory_quantity
          USING ERRCODE = 'check_violation';
      END IF;
    ELSE
      IF v_existing_qty + p_quantity > v_product.inventory_quantity THEN
        RAISE EXCEPTION 'Only % in stock', v_product.inventory_quantity
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
  END IF;

  -- Upsert the line
  INSERT INTO public.cart_items (
    cart_id, product_id, variant_id, vendor_id,
    quantity, unit_price_at_add, currency_at_add,
    product_source, source_metadata, affiliate_link_id
  )
  VALUES (
    v_cart_id, p_product_id, p_variant_id, v_product.vendor_id,
    p_quantity, v_unit_price, v_currency,
    COALESCE(v_product.source, 'vendor'), v_product.source_metadata, p_affiliate_link_id
  )
  ON CONFLICT (cart_id, product_id, variant_id) WHERE variant_id IS NOT NULL
  DO UPDATE SET
    quantity = cart_items.quantity + EXCLUDED.quantity,
    updated_at = now()
  RETURNING id INTO v_item_id;

  -- Handle null-variant conflict separately (partial unique index)
  IF v_item_id IS NULL THEN
    INSERT INTO public.cart_items (
      cart_id, product_id, variant_id, vendor_id,
      quantity, unit_price_at_add, currency_at_add,
      product_source, source_metadata, affiliate_link_id
    )
    VALUES (
      v_cart_id, p_product_id, NULL, v_product.vendor_id,
      p_quantity, v_unit_price, v_currency,
      COALESCE(v_product.source, 'vendor'), v_product.source_metadata, p_affiliate_link_id
    )
    ON CONFLICT (cart_id, product_id) WHERE variant_id IS NULL
    DO UPDATE SET
      quantity = cart_items.quantity + EXCLUDED.quantity,
      updated_at = now()
    RETURNING id INTO v_item_id;
  END IF;

  RETURN jsonb_build_object(
    'cart_id', v_cart_id,
    'item_id', v_item_id,
    'unit_price', v_unit_price,
    'currency', v_currency
  );
END;
$$;


ALTER FUNCTION "public"."add_to_cart"("p_product_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_affiliate_link_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_video_earnings"("vid" "uuid", "amt" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.short_videos SET total_earnings = total_earnings + amt WHERE id = vid;
END;
$$;


ALTER FUNCTION "public"."add_video_earnings"("vid" "uuid", "amt" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_community_task_completion_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.community_tasks SET completion_count = COALESCE(completion_count, 0) + 1 WHERE id = NEW.task_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bump_community_task_completion_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_parent_message_reply_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  IF NEW.thread_id IS NOT NULL THEN
    UPDATE public.community_messages SET reply_count = COALESCE(reply_count, 0) + 1 WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."bump_parent_message_reply_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_post_like_count"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.community_posts SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_post_id;
END;
$$;


ALTER FUNCTION "public"."decrement_post_like_count"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrement_video_like_count"("vid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.short_videos SET like_count = GREATEST(like_count - 1, 0) WHERE id = vid;
END;
$$;


ALTER FUNCTION "public"."decrement_video_like_count"("vid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."decrypt_token"("ciphertext" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    RETURN ciphertext;
  END IF;
  RETURN pgp_sym_decrypt(decode(ciphertext, 'base64'), v_key);
END;
$$;


ALTER FUNCTION "public"."decrypt_token"("ciphertext" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."encrypt_token"("plaintext" "text") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_key TEXT;
BEGIN
  v_key := current_setting('app.encryption_key', true);
  IF v_key IS NULL OR v_key = '' THEN
    -- If no key configured, return plaintext (development mode)
    -- Production should always have a key set
    RETURN plaintext;
  END IF;
  RETURN encode(
    pgp_sym_encrypt(plaintext, v_key, 'cipher-algo=aes256'),
    'base64'
  );
END;
$$;


ALTER FUNCTION "public"."encrypt_token"("plaintext" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_or_create_community_inbox_conversation"("p_community_id" "uuid", "p_peer_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_uid UUID := auth.uid(); v_low UUID; v_high UUID; v_id UUID;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF p_peer_id = v_uid THEN RAISE EXCEPTION 'invalid peer'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_memberships WHERE community_id = p_community_id AND user_id = v_uid AND status = 'active') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_memberships WHERE community_id = p_community_id AND user_id = p_peer_id AND status = 'active') THEN
    RAISE EXCEPTION 'peer not in community';
  END IF;
  v_low := LEAST(v_uid, p_peer_id);
  v_high := GREATEST(v_uid, p_peer_id);
  INSERT INTO public.community_inbox_conversations (community_id, user_low, user_high)
  VALUES (p_community_id, v_low, v_high)
  ON CONFLICT (community_id, user_low, user_high) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


ALTER FUNCTION "public"."get_or_create_community_inbox_conversation"("p_community_id" "uuid", "p_peer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_roles"("lookup_user_id" "uuid") RETURNS "text"[]
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  roles_out TEXT[] := ARRAY['buyer'::TEXT];
  rec RECORD;
BEGIN
  FOR rec IN (SELECT role::TEXT AS r FROM public.user_roles WHERE user_id = lookup_user_id AND is_active = TRUE) LOOP
    IF NOT (rec.r = ANY(roles_out)) THEN roles_out := array_append(roles_out, rec.r); END IF;
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.vendors WHERE user_id = lookup_user_id) THEN
    IF NOT ('vendor' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'vendor'::TEXT); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.affiliates WHERE user_id = lookup_user_id) THEN
    IF NOT ('affiliate' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'affiliate'::TEXT); END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM public.influencers WHERE user_id = lookup_user_id) THEN
    IF NOT ('influencer' = ANY(roles_out)) THEN roles_out := array_append(roles_out, 'influencer'::TEXT); END IF;
  END IF;
  RETURN roles_out;
END;
$$;


ALTER FUNCTION "public"."get_user_roles"("lookup_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_membership_plan_change"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- Owners can change anything
  IF EXISTS (SELECT 1 FROM public.communities WHERE id = NEW.community_id AND owner_id = auth.uid()) THEN
    RETURN NEW;
  END IF;
  -- Service role bypasses
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  -- Self-update: cannot escalate plan_type
  IF NEW.plan_type IS DISTINCT FROM OLD.plan_type THEN
    RAISE EXCEPTION 'Cannot change plan_type via direct UPDATE — must go through payment flow';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status = 'active' AND OLD.status != 'active' THEN
    -- Reactivating a cancelled membership requires payment
    IF NOT EXISTS (
      SELECT 1 FROM public.community_payments
      WHERE community_id = NEW.community_id
        AND user_id = NEW.user_id
        AND status = 'completed'
        AND created_at > NOW() - INTERVAL '10 minutes'
    ) AND NOT EXISTS (
      SELECT 1 FROM public.communities WHERE id = NEW.community_id AND is_free = TRUE
    ) THEN
      RAISE EXCEPTION 'Cannot reactivate paid membership without payment';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."guard_membership_plan_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_product_delete"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order_count integer;
BEGIN
  SELECT COUNT(*) INTO v_order_count
  FROM public.order_items
  WHERE product_id = OLD.id;

  IF v_order_count > 0 THEN
    RAISE EXCEPTION
      'Cannot delete product % — it has % order item(s). Archive it instead.',
      OLD.id, v_order_count;
  END IF;

  RETURN OLD;
END;
$$;


ALTER FUNCTION "public"."guard_product_delete"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."guard_wallet_mutations"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Wallets can only be modified by service_role (via increment_wallet_balance or admin tools)';
END;
$$;


ALTER FUNCTION "public"."guard_wallet_mutations"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name  = COALESCE(EXCLUDED.full_name, profiles.full_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, profiles.avatar_url),
        updated_at = NOW();
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'buyer')
  ON CONFLICT (user_id, role) DO NOTHING;
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'handle_new_user error for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_affiliate_clicks"("p_affiliate_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.affiliates
  SET total_clicks = total_clicks + 1
  WHERE id = p_affiliate_id;
END;
$$;


ALTER FUNCTION "public"."increment_affiliate_clicks"("p_affiliate_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_link_clicks"("p_link_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE public.affiliate_links
  SET total_clicks = total_clicks + 1
  WHERE id = p_link_id;
END;
$$;


ALTER FUNCTION "public"."increment_link_clicks"("p_link_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_post_comment_count"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.community_posts 
  SET comment_count = comment_count + 1 
  WHERE id = p_post_id;
END;
$$;


ALTER FUNCTION "public"."increment_post_comment_count"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_post_like_count"("p_post_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.community_posts SET like_count = like_count + 1 WHERE id = p_post_id;
END;
$$;


ALTER FUNCTION "public"."increment_post_like_count"("p_post_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_product_view_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  UPDATE public.products
  SET view_count = view_count + 1
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_product_view_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_video_click_count"("vid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.short_videos SET click_count = click_count + 1 WHERE id = vid;
END;
$$;


ALTER FUNCTION "public"."increment_video_click_count"("vid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_video_like_count"("vid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.short_videos SET like_count = like_count + 1 WHERE id = vid;
END;
$$;


ALTER FUNCTION "public"."increment_video_like_count"("vid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_video_view_count"("vid" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.short_videos SET view_count = view_count + 1 WHERE id = vid;
END;
$$;


ALTER FUNCTION "public"."increment_video_view_count"("vid" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_wallet_balance"("p_wallet_id" "uuid", "p_amount" numeric) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  UPDATE public.wallets 
  SET available_balance = available_balance + p_amount,
      total_earned = total_earned + p_amount,
      updated_at = NOW()
  WHERE id = p_wallet_id;
END;
$$;


ALTER FUNCTION "public"."increment_wallet_balance"("p_wallet_id" "uuid", "p_amount" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_variant_stock_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.inventory_quantity = OLD.inventory_quantity THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.variant_stock_history (
    variant_id,
    product_id,
    previous_quantity,
    new_quantity,
    change_reason,
    source,
    note
  ) VALUES (
    NEW.id,
    NEW.product_id,
    OLD.inventory_quantity,
    NEW.inventory_quantity,
    CASE
      WHEN NEW.source = 'cj'      THEN 'sync'
      WHEN NEW.source = 'shopify' THEN 'sync'
      ELSE 'manual'
    END,
    NEW.source,
    -- ✅ Note the warehouse breakdown context
    CASE
      WHEN NEW.inventory_quantity = 0 THEN 'Stock reached zero'
      WHEN NEW.inventory_quantity > OLD.inventory_quantity THEN 'Stock increased'
      ELSE 'Stock decreased'
    END
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_variant_stock_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_variant_stock_on_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.variant_stock_history (
    variant_id,
    product_id,
    previous_quantity,
    new_quantity,
    change_reason,
    source
  ) VALUES (
    NEW.id,
    NEW.product_id,
    0,
    NEW.inventory_quantity,
    'import',
    NEW.source
  );

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_variant_stock_on_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."merge_variant_source_metadata"("p_cj_vid" "text", "p_patch" "jsonb") RETURNS "void"
    LANGUAGE "sql"
    AS $$
    update product_variants
    set source_metadata = source_metadata || p_patch
    where cj_vid = p_cj_vid;
$$;


ALTER FUNCTION "public"."merge_variant_source_metadata"("p_cj_vid" "text", "p_patch" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."notify_conversation_message"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_conv RECORD;
  v_recipient_id UUID;
  v_sender_name TEXT;
  v_preview TEXT;
BEGIN
  SELECT buyer_id, vendor_id INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id = v_conv.buyer_id THEN
    v_recipient_id := (SELECT user_id FROM public.vendors WHERE id = v_conv.vendor_id);
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;
  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN RETURN NEW; END IF;
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_preview := COALESCE(LEFT(NEW.body, 80), 'New message');
  IF NEW.message_type = 'product'       THEN v_preview := 'Shared a product'; END IF;
  IF NEW.message_type = 'quote_request' THEN v_preview := 'Quote request'; END IF;
  IF NEW.message_type = 'quote_reply'   THEN v_preview := 'Sent an offer'; END IF;
  IF NEW.message_type IN ('image','file') THEN v_preview := 'Sent an attachment'; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (v_recipient_id, 'message', COALESCE(v_sender_name, 'Someone') || ' sent a message', v_preview, '/dashboard/messages?conversation=' || NEW.conversation_id);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."notify_conversation_message"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_financial_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (
    auth.role() != 'service_role' AND
    current_setting('role', true) != 'supabase_admin' AND
    (auth.jwt() ->> 'role') != 'service_role'
  ) THEN
    RAISE EXCEPTION 'Financial and payment fields can only be modified by service_role';
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."protect_financial_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_cart_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_cart_id uuid := COALESCE(NEW.cart_id, OLD.cart_id);
BEGIN
  UPDATE public.carts
  SET
    item_count       = COALESCE((SELECT SUM(quantity) FROM public.cart_items WHERE cart_id = v_cart_id), 0),
    subtotal         = COALESCE((SELECT SUM(quantity * unit_price_at_add) FROM public.cart_items WHERE cart_id = v_cart_id), 0),
    last_activity_at = now(),
    updated_at       = now()
  WHERE id = v_cart_id;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."recompute_cart_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recompute_order_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.total_amount = COALESCE(NEW.subtotal, 0)
                   + COALESCE(NEW.shipping_amount, 0)
                   + COALESCE(NEW.tax_amount, 0)
                   - COALESCE(NEW.discount_amount, 0);
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."recompute_order_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_product_published_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  -- On UPDATE: status transitioning into 'active' for the first time
  IF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'active'
       AND OLD.status IS DISTINCT FROM 'active'
       AND NEW.published_at IS NULL THEN
      NEW.published_at = NOW();
    END IF;
  END IF;

  -- On INSERT: row created already 'active'
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'active' AND NEW.published_at IS NULL THEN
      NEW.published_at = NOW();
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."set_product_published_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."toggle_community_message_reaction"("p_message_id" "uuid", "p_emoji" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_community_id UUID; v_reactions JSONB;
  v_uid UUID := auth.uid();
  emj TEXT; arr JSONB; new_arr JSONB;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  emj := nullif(trim(p_emoji), '');
  IF emj IS NULL OR length(emj) > 32 THEN RAISE EXCEPTION 'invalid emoji'; END IF;
  SELECT cm.community_id, cm.reactions INTO v_community_id, v_reactions
  FROM public.community_messages cm WHERE cm.id = p_message_id AND cm.is_deleted = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'not found'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.community_memberships m WHERE m.community_id = v_community_id AND m.user_id = v_uid AND m.status = 'active') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_reactions := coalesce(v_reactions, '{}'::jsonb);
  IF jsonb_typeof(v_reactions) != 'object' THEN v_reactions := '{}'::jsonb; END IF;
  arr := v_reactions -> emj;
  IF arr IS NULL OR jsonb_typeof(arr) != 'array' THEN arr := '[]'::jsonb; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_array_elements_text(arr) AS t(x) WHERE t.x = v_uid::text) THEN
    SELECT CASE WHEN count(*) = 0 THEN NULL ELSE jsonb_agg(to_jsonb(x)) END INTO new_arr
    FROM (SELECT x FROM jsonb_array_elements_text(arr) AS t(x) WHERE x IS DISTINCT FROM v_uid::text) s;
    IF new_arr IS NULL OR jsonb_array_length(new_arr) = 0 THEN v_reactions := v_reactions - emj;
    ELSE v_reactions := jsonb_set(v_reactions, ARRAY[emj], new_arr, true); END IF;
  ELSE
    arr := arr || jsonb_build_array(v_uid::text);
    v_reactions := jsonb_set(v_reactions, ARRAY[emj], arr, true);
  END IF;
  UPDATE public.community_messages SET reactions = v_reactions WHERE id = p_message_id;
  RETURN v_reactions;
END;
$$;


ALTER FUNCTION "public"."toggle_community_message_reaction"("p_message_id" "uuid", "p_emoji" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_order_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  v_order_id UUID := COALESCE(NEW.order_id, OLD.order_id);
  v_subtotal DECIMAL(14,2);
BEGIN
  SELECT COALESCE(SUM(total_price), 0)
    INTO v_subtotal
    FROM public.order_items
   WHERE order_id = v_order_id;

  UPDATE public.orders
     SET subtotal     = v_subtotal,
         total_amount = v_subtotal
                      + COALESCE(shipping_amount, 0)
                      + COALESCE(tax_amount, 0)
                      - COALESCE(discount_amount, 0),
         updated_at   = NOW()
   WHERE id = v_order_id;

  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_order_totals"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
  target_product_id uuid;
  v_avg   decimal(3,2);
  v_count bigint;
  v_breakdown jsonb;
BEGIN
  target_product_id := COALESCE(NEW.product_id, OLD.product_id);

  SELECT
    AVG(rating)::decimal(3,2),
    COUNT(*)
  INTO v_avg, v_count
  FROM public.reviews
  WHERE product_id = target_product_id;

  SELECT jsonb_build_object(
    '5', COUNT(*) FILTER (WHERE rating = 5),
    '4', COUNT(*) FILTER (WHERE rating = 4),
    '3', COUNT(*) FILTER (WHERE rating = 3),
    '2', COUNT(*) FILTER (WHERE rating = 2),
    '1', COUNT(*) FILTER (WHERE rating = 1)
  )
  INTO v_breakdown
  FROM public.reviews
  WHERE product_id = target_product_id;

  UPDATE public.products
  SET
    rating           = COALESCE(v_avg, 0),
    review_count     = v_count,
    rating_breakdown = v_breakdown
  WHERE id = target_product_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_product_rating"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_sale_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products
    SET sale_count = sale_count + NEW.quantity
    WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products
    SET sale_count = GREATEST(sale_count - OLD.quantity, 0)
    WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_product_sale_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_product_wishlist_count"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.products SET wishlist_count = wishlist_count + 1 WHERE id = NEW.product_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.products SET wishlist_count = GREATEST(wishlist_count - 1, 0) WHERE id = OLD.product_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_product_wishlist_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_vendor_follower_count"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE public.vendors SET follower_count = follower_count + 1 WHERE id = NEW.vendor_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE public.vendors SET follower_count = follower_count - 1 WHERE id = OLD.vendor_id;
  END IF;
  RETURN NULL;
END;
$$;


ALTER FUNCTION "public"."update_vendor_follower_count"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_vendor_overall_rating"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF COALESCE(NEW.vendor_id, OLD.vendor_id) IS NOT NULL THEN
    UPDATE public.vendors
    SET rating = (SELECT AVG(rating)::DECIMAL(3,2) FROM public.reviews WHERE vendor_id = COALESCE(NEW.vendor_id, OLD.vendor_id))
    WHERE id = COALESCE(NEW.vendor_id, OLD.vendor_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_vendor_overall_rating"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."affiliate_clicks" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "link_id" "uuid" NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "ip_address" "inet",
    "user_agent" "text",
    "referrer" "text",
    "country" "text",
    "device_type" "text",
    "session_id" "text",
    "converted" boolean DEFAULT false,
    "converted_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."affiliate_clicks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_commissions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "link_id" "uuid",
    "order_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "product_id" "uuid",
    "vendor_id" "uuid",
    "commission_rate" numeric(5,2) NOT NULL,
    "order_amount" numeric(14,2) NOT NULL,
    "commission_amount" numeric(14,2) NOT NULL,
    "status" "public"."payout_status" DEFAULT 'pending'::"public"."payout_status",
    "paid_at" timestamp(6) with time zone,
    "payout_id" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."affiliate_commissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliate_links" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "affiliate_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "vendor_id" "uuid",
    "link_code" "text" DEFAULT ('LNK-'::"text" || "upper"("substring"(("gen_random_uuid"())::"text", 1, 10))) NOT NULL,
    "custom_slug" "text",
    "destination_url" "text" NOT NULL,
    "full_url" "text",
    "commission_rate" numeric(5,2),
    "total_clicks" bigint DEFAULT 0,
    "unique_clicks" bigint DEFAULT 0,
    "total_conversions" bigint DEFAULT 0,
    "total_earnings" numeric(14,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "expires_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."affiliate_links" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."affiliates" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "affiliate_code" "text" DEFAULT ('AFF-'::"text" || "upper"("substring"(("gen_random_uuid"())::"text", 1, 8))) NOT NULL,
    "bio" "text",
    "website" "text",
    "social_links" "jsonb" DEFAULT '{}'::"jsonb",
    "niche" "text"[],
    "tier" "text" DEFAULT 'bronze'::"text",
    "total_clicks" bigint DEFAULT 0,
    "total_conversions" bigint DEFAULT 0,
    "total_earnings" numeric(14,2) DEFAULT 0,
    "available_balance" numeric(14,2) DEFAULT 0,
    "pending_earnings" numeric(14,2) DEFAULT 0,
    "paid_earnings" numeric(14,2) DEFAULT 0,
    "conversion_rate" numeric(5,2) DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "payout_method" "text" DEFAULT 'bank'::"text",
    "payout_account" "text"
);


ALTER TABLE "public"."affiliates" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."blog_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "slug" "text" NOT NULL,
    "title" "text" NOT NULL,
    "excerpt" "text" NOT NULL,
    "author_name" "text" NOT NULL,
    "published_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "read_time_minutes" integer DEFAULT 5 NOT NULL,
    "category" "text" DEFAULT 'General'::"text" NOT NULL,
    "image_url" "text",
    "body" "text",
    "is_published" boolean DEFAULT false NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."blog_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buying_lead_offers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buying_request_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "message" "text",
    "offered_price" numeric,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."buying_lead_offers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."buying_requests" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "product_name" "text" NOT NULL,
    "category" "text",
    "quantity_needed" numeric DEFAULT 1 NOT NULL,
    "budget_min" numeric,
    "budget_max" numeric,
    "delivery_country" "text",
    "description" "text",
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."buying_requests" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cart_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "cart_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "variant_id" "uuid",
    "vendor_id" "uuid" NOT NULL,
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price_at_add" numeric(14,2) NOT NULL,
    "currency_at_add" "text" NOT NULL,
    "product_source" "text" DEFAULT 'vendor'::"text" NOT NULL,
    "source_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "affiliate_link_id" "uuid",
    "added_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "cart_items_quantity_check" CHECK (("quantity" > 0))
);


ALTER TABLE "public"."cart_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."carts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "currency" "text" DEFAULT 'RWF'::"text",
    "item_count" integer DEFAULT 0 NOT NULL,
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "last_activity_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "carts_item_count_check" CHECK (("item_count" >= 0)),
    CONSTRAINT "carts_subtotal_check" CHECK (("subtotal" >= (0)::numeric))
);


ALTER TABLE "public"."carts" OWNER TO "postgres";


COMMENT ON TABLE "public"."carts" IS 'Active shopping basket per user. Cleared after successful checkout. Distinct from orders (which are commerce events).';



CREATE TABLE IF NOT EXISTS "public"."cj_product_map" (
    "cj_pid" "text" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."cj_product_map" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."cj_sync_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "started_at" timestamp with time zone DEFAULT "now"(),
    "finished_at" timestamp with time zone,
    "total_fetched" integer DEFAULT 0,
    "total_saved" integer DEFAULT 0,
    "total_errors" integer DEFAULT 0,
    "status" "text" DEFAULT 'running'::"text",
    "error_message" "text",
    CONSTRAINT "cj_sync_logs_status_check" CHECK (("status" = ANY (ARRAY['running'::"text", 'success'::"text", 'partial'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."cj_sync_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."communities" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "owner_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "tagline" "text",
    "description" "text",
    "long_description" "text",
    "avatar_url" "text",
    "cover_image" "text",
    "category" "text",
    "tags" "text"[],
    "is_private" boolean DEFAULT false,
    "is_free" boolean DEFAULT true,
    "monthly_price" numeric DEFAULT 0,
    "yearly_price" numeric DEFAULT 0,
    "lifetime_price" numeric DEFAULT 0,
    "currency" "text" DEFAULT 'USD'::"text",
    "trial_days" integer DEFAULT 0,
    "member_count" integer DEFAULT 0,
    "space_count" integer DEFAULT 0,
    "post_count" integer DEFAULT 0,
    "is_featured" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "platform_commission_rate" numeric DEFAULT 15,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."communities" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_courses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "thumbnail_url" "text",
    "total_modules" integer DEFAULT 0,
    "total_lessons" integer DEFAULT 0,
    "total_duration" integer DEFAULT 0,
    "difficulty" "text" DEFAULT 'beginner'::"text",
    "is_published" boolean DEFAULT false,
    "published_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_courses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_inbox_conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_low" "uuid" NOT NULL,
    "user_high" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_inbox_conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_inbox_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" DEFAULT ''::"text" NOT NULL,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "message_type" "text" DEFAULT 'text'::"text",
    "reactions" "jsonb" DEFAULT '{}'::"jsonb"
);


ALTER TABLE "public"."community_inbox_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_memberships" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'member'::"text",
    "plan_type" "text" DEFAULT 'free'::"text",
    "status" "text" DEFAULT 'active'::"text",
    "subscribed_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "expires_at" timestamp(6) with time zone,
    "cancelled_at" timestamp(6) with time zone,
    "payment_reference" "text",
    "payment_provider" "text",
    "amount_paid" numeric DEFAULT 0,
    "space_access" "uuid"[] DEFAULT ARRAY[]::"uuid"[],
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_memberships" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" DEFAULT ''::"text",
    "message_type" "text" DEFAULT 'text'::"text",
    "thread_id" "uuid",
    "reply_count" integer DEFAULT 0,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "reactions" "jsonb" DEFAULT '{}'::"jsonb",
    "is_pinned" boolean DEFAULT false,
    "is_edited" boolean DEFAULT false,
    "edited_at" timestamp(6) with time zone,
    "is_deleted" boolean DEFAULT false,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_by" "uuid"
);


ALTER TABLE "public"."community_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_payments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "membership_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text",
    "plan_type" "text" NOT NULL,
    "payment_provider" "text",
    "payment_reference" "text",
    "platform_commission" numeric DEFAULT 0,
    "creator_earnings" numeric DEFAULT 0,
    "status" "text" DEFAULT 'pending'::"text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_payments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_post_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "parent_id" "uuid",
    "body" "text" NOT NULL,
    "like_count" integer DEFAULT 0,
    "is_published" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_post_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_post_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "post_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_post_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "space_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "author_id" "uuid" NOT NULL,
    "title" "text",
    "body" "text" NOT NULL,
    "post_type" "text" DEFAULT 'discussion'::"text",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "video_url" "text",
    "like_count" integer DEFAULT 0,
    "comment_count" integer DEFAULT 0,
    "view_count" integer DEFAULT 0,
    "is_pinned" boolean DEFAULT false,
    "is_exclusive" boolean DEFAULT false,
    "is_published" boolean DEFAULT true,
    "published_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_saved_posts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "post_id" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_saved_posts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."community_tasks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "room_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "task_type" "text" DEFAULT 'daily'::"text",
    "difficulty" "text" DEFAULT 'easy'::"text",
    "points" integer DEFAULT 10,
    "is_recurring" boolean DEFAULT false,
    "recurrence_days" integer DEFAULT 1,
    "due_date" timestamp(6) with time zone,
    "completion_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."community_tasks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversation_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "conversation_id" "uuid" NOT NULL,
    "sender_id" "uuid" NOT NULL,
    "body" "text" DEFAULT ''::"text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "message_type" "text" DEFAULT 'text'::"text" NOT NULL,
    "reply_to_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL
);


ALTER TABLE "public"."conversation_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."conversations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."conversations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_lessons" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "module_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "body" "text",
    "video_url" "text",
    "duration" integer DEFAULT 0,
    "sort_order" integer DEFAULT 0,
    "is_free" boolean DEFAULT false,
    "attachments" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_lessons" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."course_modules" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "course_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "sort_order" integer DEFAULT 0,
    "is_free" boolean DEFAULT false,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."course_modules" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."digital_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "order_id" "uuid",
    "access_url" "text",
    "subtype" "text",
    "granted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "expires_at" timestamp with time zone,
    "revoked_at" timestamp with time zone,
    "revoke_reason" "text",
    "last_accessed_at" timestamp with time zone
);


ALTER TABLE "public"."digital_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exchange_rate_logs" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "from_currency" "text" NOT NULL,
    "to_currency" "text" NOT NULL,
    "rate" numeric(14,6) NOT NULL,
    "order_id" "uuid",
    "recorded_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."exchange_rate_logs" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."failed_wallet_credits" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid",
    "vendor_id" "uuid",
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'RWF'::"text" NOT NULL,
    "reason" "text",
    "resolved" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "resolved_at" timestamp with time zone
);


ALTER TABLE "public"."failed_wallet_credits" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."influencers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "niche" "text"[],
    "bio" "text",
    "profile_image" "text",
    "cover_image" "text",
    "social_platforms" "jsonb" DEFAULT '{}'::"jsonb",
    "total_followers" bigint DEFAULT 0,
    "engagement_rate" numeric(5,2) DEFAULT 0,
    "total_campaigns" integer DEFAULT 0,
    "total_earnings" numeric(14,2) DEFAULT 0,
    "available_balance" numeric(14,2) DEFAULT 0,
    "rating" numeric(3,2) DEFAULT 0,
    "is_verified" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "guidelines_accepted_at" timestamp(6) with time zone,
    "pending_balance" numeric DEFAULT 0
);


ALTER TABLE "public"."influencers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_progress" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "lesson_id" "uuid" NOT NULL,
    "course_id" "uuid" NOT NULL,
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp(6) with time zone,
    "watch_time" integer DEFAULT 0,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."lesson_progress" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."member_points" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "total_points" integer DEFAULT 0,
    "level" integer DEFAULT 1,
    "streak_days" integer DEFAULT 0,
    "last_active_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."member_points" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "public"."notification_type" NOT NULL,
    "title" "text" NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "is_read" boolean DEFAULT false,
    "read_at" timestamp(6) with time zone,
    "action_url" "text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_items" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "product_id" "uuid",
    "variant_id" "uuid",
    "vendor_id" "uuid",
    "product_name" "text" NOT NULL,
    "product_image" "text",
    "variant_name" "text",
    "quantity" integer DEFAULT 1 NOT NULL,
    "unit_price" numeric(14,2) NOT NULL,
    "total_price" numeric(14,2) NOT NULL,
    "affiliate_id" "uuid",
    "affiliate_commission_rate" numeric(5,2),
    "affiliate_commission_amount" numeric(14,2),
    "digital_download_url" "text",
    "download_count" integer DEFAULT 0,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "shopify_variant_id" bigint,
    "shopify_product_id" "text",
    "product_source" "text" DEFAULT 'vendor'::"text" NOT NULL,
    "source_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "product_type" "text" DEFAULT 'physical'::"text",
    "access_granted_at" timestamp(6) with time zone,
    "pricing_type" "text" DEFAULT 'one_time'::"text",
    "billing_period" "text",
    CONSTRAINT "order_items_billing_period_consistency" CHECK (((("pricing_type" = 'recurring'::"text") AND ("billing_period" IS NOT NULL)) OR (("pricing_type" = 'one_time'::"text") AND ("billing_period" IS NULL))))
);


ALTER TABLE "public"."order_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_payment_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "previous_status" "public"."payment_status",
    "new_status" "public"."payment_status" NOT NULL,
    "provider" "text",
    "provider_transaction_id" "text",
    "triggered_by" "text",
    "notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."order_payment_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."order_status_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "order_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "previous_status" "public"."order_status",
    "new_status" "public"."order_status" NOT NULL,
    "notes" "text",
    "metadata" "jsonb",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."order_status_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."orders" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "order_number" "text" DEFAULT ('ORD-'::"text" || "upper"("substring"(("gen_random_uuid"())::"text", 1, 8))) NOT NULL,
    "buyer_id" "uuid" NOT NULL,
    "vendor_id" "uuid",
    "affiliate_id" "uuid",
    "status" "public"."order_status" DEFAULT 'pending'::"public"."order_status",
    "payment_status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status",
    "subtotal" numeric(14,2) DEFAULT 0 NOT NULL,
    "discount_amount" numeric(14,2) DEFAULT 0,
    "shipping_amount" numeric(14,2) DEFAULT 0,
    "tax_amount" numeric(14,2) DEFAULT 0,
    "total_amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'RWF'::"text",
    "shipping_address" "jsonb",
    "billing_address" "jsonb",
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "paid_at" timestamp(6) with time zone,
    "shipped_at" timestamp(6) with time zone,
    "delivered_at" timestamp(6) with time zone,
    "cancelled_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "integration_source" "text",
    "shopify_order_id" "text",
    "shopify_order_number" integer,
    "shopify_fulfillment_status" "text" DEFAULT 'unfulfilled'::"text",
    "shopify_order_ids" "text"[] DEFAULT ARRAY[]::"text"[],
    "tracking_number" "text",
    "tracking_status" "text",
    "nowpayments_payment_id" bigint,
    "cj_order_id" "text",
    "cj_order_num" "text",
    "cj_fulfillment_status" "text" DEFAULT 'unfulfilled'::"text",
    "cj_shipping_method" "text",
    "cj_supplier_cost" numeric(14,2),
    "cj_dispute_id" "text"
);


ALTER TABLE "public"."orders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."payouts" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" "text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "fee" numeric(14,2) DEFAULT 0,
    "net_amount" numeric(14,2),
    "currency" "text" DEFAULT 'RWF'::"text",
    "status" "public"."payout_status" DEFAULT 'pending'::"public"."payout_status",
    "payout_method" "text" DEFAULT 'mtn'::"text",
    "payout_account" "text",
    "provider_reference" "text",
    "notes" "text",
    "processed_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "release_date" timestamp(6) with time zone
);


ALTER TABLE "public"."payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_secrets" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."platform_secrets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."platform_settings" (
    "key" "text" NOT NULL,
    "value" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."platform_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_categories" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "parent_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "image_url" "text",
    "color" "text",
    "is_active" boolean DEFAULT true,
    "sort_order" integer DEFAULT 0,
    "product_count" integer DEFAULT 0,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "category_type" "text" DEFAULT 'physical'::"text" NOT NULL,
    "tint_color" "text",
    "visible" boolean DEFAULT true
);


ALTER TABLE "public"."product_categories" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_shipping_options" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "source" "text" DEFAULT 'vendor'::"text" NOT NULL,
    "source_method_id" "text",
    "ship_from_country" "text" DEFAULT 'CN'::"text" NOT NULL,
    "ship_from_name" "text",
    "ship_to_country" "text" NOT NULL,
    "method_name" "text" NOT NULL,
    "carrier" "text",
    "has_tracking" boolean DEFAULT true,
    "min_delivery_days" integer,
    "max_delivery_days" integer,
    "estimated_delivery" "text" GENERATED ALWAYS AS (
CASE
    WHEN ("min_delivery_days" IS NULL) THEN NULL::"text"
    WHEN ("min_delivery_days" = "max_delivery_days") THEN (("min_delivery_days")::"text" || ' days'::"text")
    ELSE (((("min_delivery_days")::"text" || '–'::"text") || ("max_delivery_days")::"text") || ' days'::"text")
END) STORED,
    "shipping_fee" numeric(10,2) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'USD'::"text" NOT NULL,
    "is_free_shipping" boolean DEFAULT false,
    "is_recommended" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "remark" "text",
    "synced_at" timestamp with time zone DEFAULT "now"(),
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "chk_fee_or_free" CHECK ((("is_free_shipping" = true) OR ("shipping_fee" >= (0)::numeric))),
    CONSTRAINT "chk_source" CHECK (("source" = ANY (ARRAY['cj'::"text", 'vendor'::"text", 'shopify'::"text"])))
);


ALTER TABLE "public"."product_shipping_options" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "sku" "text",
    "price" numeric(14,2) NOT NULL,
    "compare_at_price" numeric(14,2),
    "inventory_quantity" integer DEFAULT 0,
    "image_url" "text",
    "options" "jsonb" DEFAULT '{}'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "cj_vid" "text",
    "cj_pid" "text",
    "weight" numeric(10,2) DEFAULT 0,
    "length" integer DEFAULT 0,
    "width" integer DEFAULT 0,
    "height" integer DEFAULT 0,
    "volume" numeric(15,2) DEFAULT 0,
    "source" "text" DEFAULT 'vendor'::"text" NOT NULL,
    "source_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "affiliate_price" numeric DEFAULT 0,
    "affiliate_commission_rate" numeric DEFAULT 0,
    CONSTRAINT "product_variants_inventory_non_negative" CHECK (("inventory_quantity" >= 0)),
    CONSTRAINT "product_variants_source_check" CHECK (("source" = ANY (ARRAY['vendor'::"text", 'shopify'::"text", 'cj'::"text"])))
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."product_views" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "session_id" "text",
    "ip_address" "inet",
    "referrer" "text",
    "country" "text",
    "device_type" "text",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."product_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "category_id" "uuid",
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "short_description" "text",
    "description" "text",
    "product_type" "public"."product_type" DEFAULT 'physical'::"public"."product_type",
    "status" "public"."product_status" DEFAULT 'draft'::"public"."product_status",
    "price" numeric(14,2) DEFAULT 0 NOT NULL,
    "compare_at_price" numeric(14,2),
    "cost_price" numeric(14,2),
    "currency" "text" DEFAULT 'RWF'::"text",
    "sku" "text",
    "barcode" "text",
    "weight" numeric(10,3),
    "dimensions" "jsonb",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "videos" "jsonb" DEFAULT '[]'::"jsonb",
    "tags" "text"[],
    "meta_title" "text",
    "meta_description" "text",
    "is_digital" boolean DEFAULT false,
    "digital_file_url" "text",
    "digital_file_size" bigint,
    "requires_shipping" boolean DEFAULT true,
    "track_inventory" boolean DEFAULT true,
    "inventory_quantity" integer DEFAULT 0,
    "low_stock_threshold" integer DEFAULT 5,
    "allow_backorder" boolean DEFAULT false,
    "affiliate_enabled" boolean DEFAULT true,
    "affiliate_commission_rate" numeric(5,2),
    "influencer_enabled" boolean DEFAULT true,
    "is_featured" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "view_count" integer DEFAULT 0,
    "sale_count" integer DEFAULT 0,
    "rating" numeric(3,2) DEFAULT 0,
    "review_count" integer DEFAULT 0,
    "wishlist_count" integer DEFAULT 0,
    "published_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "shopify_product_id" "text",
    "shopify_variant_id" bigint,
    "shopify_handle" "text",
    "shopify_synced_at" timestamp(6) with time zone,
    "source" "text" DEFAULT 'vendor'::"text",
    "source_metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "price_usd" numeric(10,2) DEFAULT 0 NOT NULL,
    "button_text" "text",
    "pricing_type" "text" DEFAULT 'one_time'::"text",
    "billing_period" "text",
    "show_author" boolean DEFAULT true,
    "show_reviews" boolean DEFAULT true,
    "enable_discussions" boolean DEFAULT false,
    "features" "text"[] DEFAULT '{}'::"text"[],
    "cj_last_synced_at" timestamp with time zone,
    "is_free_shipping" boolean DEFAULT false,
    "brand" "text",
    "material" "text",
    "rating_breakdown" "jsonb" DEFAULT '{}'::"jsonb",
    "deleted_at" timestamp with time zone,
    "affiliate_price" numeric DEFAULT 0,
    "is_flash_deal" boolean DEFAULT false,
    "discount_label" "text",
    "shipping_from" "text",
    "delivery_time" "text",
    "sold_count" integer DEFAULT 0,
    "claimed_pct" integer DEFAULT 0,
    CONSTRAINT "products_billing_period_consistency" CHECK (((("pricing_type" = 'recurring'::"text") AND ("billing_period" IS NOT NULL)) OR (("pricing_type" = 'one_time'::"text") AND ("billing_period" IS NULL)))),
    CONSTRAINT "products_claimed_pct_check" CHECK ((("claimed_pct" >= 0) AND ("claimed_pct" <= 100))),
    CONSTRAINT "products_delivery_time_check" CHECK (("delivery_time" = ANY (ARRAY['fast'::"text", 'standard'::"text", 'economy'::"text"]))),
    CONSTRAINT "products_digital_shipping_consistency" CHECK (((("is_digital" = true) AND ("requires_shipping" = false)) OR ("is_digital" = false))),
    CONSTRAINT "products_inventory_non_negative" CHECK (((NOT "track_inventory") OR "allow_backorder" OR ("inventory_quantity" >= 0)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON COLUMN "public"."products"."dimensions" IS 'JSONB shape: {length: number, width: number, height: number, unit: "cm"|"in"}';



CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "email" "text" NOT NULL,
    "username" "text",
    "full_name" "text",
    "avatar_url" "text",
    "bio" "text",
    "website" "text",
    "phone" "text",
    "country" "text" DEFAULT 'RW'::"text",
    "city" "text",
    "timezone" "text" DEFAULT 'Africa/Kigali'::"text",
    "language" "text" DEFAULT 'en'::"text",
    "is_verified" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "two_factor_enabled" boolean DEFAULT false,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."reviews" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "product_id" "uuid",
    "buyer_id" "uuid" NOT NULL,
    "order_item_id" "uuid",
    "vendor_id" "uuid",
    "rating" integer NOT NULL,
    "title" "text",
    "body" "text",
    "images" "jsonb" DEFAULT '[]'::"jsonb",
    "is_verified_purchase" boolean DEFAULT false,
    "is_featured" boolean DEFAULT false,
    "helpful_count" integer DEFAULT 0,
    "vendor_reply" "text",
    "vendor_replied_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "reviews_verified_requires_order_item" CHECK ((("is_verified_purchase" = false) OR ("order_item_id" IS NOT NULL)))
);


ALTER TABLE "public"."reviews" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."rooms" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "space_id" "uuid" NOT NULL,
    "community_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "sort_order" integer DEFAULT 0,
    "room_type" "text" DEFAULT 'chat'::"text" NOT NULL,
    "access_type" "text" DEFAULT 'inherit'::"text",
    "is_locked" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."rooms" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."shopify_credentials" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "shop_domain" "text" NOT NULL,
    "access_token" "text" NOT NULL,
    "api_version" "text" DEFAULT '2024-07'::"text" NOT NULL,
    "platform_commission_rate" numeric DEFAULT 8 NOT NULL,
    "connected_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "last_synced_at" timestamp(6) with time zone,
    "is_active" boolean DEFAULT true
);


ALTER TABLE "public"."shopify_credentials" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_video_clicks" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid",
    "product_id" "uuid",
    "converted" boolean DEFAULT false NOT NULL,
    "order_id" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "community_id" "uuid"
);


ALTER TABLE "public"."short_video_clicks" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_video_comments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "body" "text" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."short_video_comments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_video_earnings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "event_type" "text" NOT NULL,
    "amount" numeric(14,4) DEFAULT 0 NOT NULL,
    "currency" "text" DEFAULT 'RWF'::"text" NOT NULL,
    "reference_id" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."short_video_earnings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_video_likes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."short_video_likes" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_video_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "video_id" "uuid" NOT NULL,
    "viewer_id" "uuid",
    "watch_time_sec" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."short_video_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."short_videos" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "creator_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "video_url" "text" NOT NULL,
    "thumbnail_url" "text",
    "duration_sec" integer DEFAULT 0,
    "product_id" "uuid",
    "community_id" "uuid",
    "status" "text" DEFAULT 'processing'::"text" NOT NULL,
    "view_count" bigint DEFAULT 0 NOT NULL,
    "like_count" bigint DEFAULT 0 NOT NULL,
    "click_count" bigint DEFAULT 0 NOT NULL,
    "total_earnings" numeric(14,4) DEFAULT 0 NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "video_type" character varying(50) DEFAULT 'product'::character varying,
    "external_link" "text",
    "comment_count" integer DEFAULT 0
);


ALTER TABLE "public"."short_videos" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."spaces" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "community_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "description" "text",
    "icon" "text",
    "color" "text",
    "sort_order" integer DEFAULT 0,
    "access_type" "text" DEFAULT 'free'::"text",
    "price" numeric,
    "currency" "text" DEFAULT 'USD'::"text",
    "room_count" integer DEFAULT 0,
    "member_count" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."spaces" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."task_completions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "task_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "proof_text" "text",
    "proof_url" "text",
    "status" "text" DEFAULT 'submitted'::"text",
    "points_earned" integer DEFAULT 0,
    "reviewed_by" "uuid",
    "reviewed_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."task_completions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."transactions" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "order_id" "uuid",
    "webhook_event_id" "uuid",
    "type" "text" NOT NULL,
    "direction" "text" DEFAULT 'credit'::"text" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "currency" "text" DEFAULT 'RWF'::"text" NOT NULL,
    "amount_usd" numeric(10,2),
    "exchange_rate" numeric(14,6),
    "status" "public"."payment_status" DEFAULT 'pending'::"public"."payment_status" NOT NULL,
    "provider" "text",
    "provider_transaction_id" "text",
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "reference" "text"
);


ALTER TABLE "public"."transactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_campaign_escrow" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "deposited_by" "uuid" NOT NULL,
    "amount" numeric NOT NULL,
    "currency" "text" DEFAULT 'RWF'::"text" NOT NULL,
    "status" "text" DEFAULT 'held'::"text" NOT NULL,
    "payment_method" "text",
    "payment_ref" "text",
    "deposited_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "released_at" timestamp(6) with time zone
);


ALTER TABLE "public"."ugc_campaign_escrow" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_campaign_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "type" "public"."ugc_media_type" DEFAULT 'image'::"public"."ugc_media_type" NOT NULL,
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "usage" "public"."ugc_media_usage" DEFAULT 'example'::"public"."ugc_media_usage" NOT NULL,
    "platform_format" "public"."ugc_platform_format",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ugc_campaign_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_campaign_participants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "influencer_id" "uuid" NOT NULL,
    "status" "public"."ugc_participation_status" DEFAULT 'accepted'::"public"."ugc_participation_status" NOT NULL,
    "joined_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ugc_campaign_participants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_campaigns" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "brand_id" "uuid" NOT NULL,
    "title" "text" NOT NULL,
    "description" "text",
    "campaign_type" "public"."ugc_campaign_type" DEFAULT 'clipping'::"public"."ugc_campaign_type" NOT NULL,
    "status" "public"."ugc_campaign_status" DEFAULT 'draft'::"public"."ugc_campaign_status" NOT NULL,
    "rate_per_1k_views" numeric DEFAULT 3.00 NOT NULL,
    "total_budget" numeric DEFAULT 0 NOT NULL,
    "spent_budget" numeric DEFAULT 0 NOT NULL,
    "max_payout_per_sub" numeric DEFAULT 400,
    "allowed_platforms" "text"[] DEFAULT ARRAY['tiktok'::"text", 'instagram'::"text", 'youtube'::"text", 'x'::"text"],
    "requires_face" boolean DEFAULT false,
    "submission_count" integer DEFAULT 0,
    "approved_count" integer DEFAULT 0,
    "total_views_tracked" bigint DEFAULT 0,
    "starts_at" timestamp(6) with time zone,
    "ends_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "min_duration" integer,
    "max_duration" integer,
    "required_hashtags" "jsonb" DEFAULT '[]'::"jsonb",
    "required_mentions" "jsonb" DEFAULT '[]'::"jsonb",
    "required_keywords" "jsonb" DEFAULT '[]'::"jsonb",
    "music_track_url" "text",
    "music_artist_name" "text",
    "promotion_target" "text",
    "promotion_target_url" "text",
    "payment_model" "public"."ugc_payment_model" DEFAULT 'per_views'::"public"."ugc_payment_model",
    "fixed_rate" numeric DEFAULT 0
);


ALTER TABLE "public"."ugc_campaigns" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_payouts" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "influencer_id" "uuid" NOT NULL,
    "amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "status" "public"."ugc_payout_status" DEFAULT 'pending'::"public"."ugc_payout_status" NOT NULL,
    "paid_at" timestamp(6) with time zone,
    "payout_id" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ugc_payouts" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_reports" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "reporter_id" "uuid" NOT NULL,
    "submission_id" "uuid",
    "reason" "text" NOT NULL,
    "details" "text",
    "status" "text" DEFAULT 'pending'::"text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ugc_reports" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_submission_media" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "type" "public"."ugc_media_type" DEFAULT 'video'::"public"."ugc_media_type" NOT NULL,
    "url" "text" NOT NULL,
    "thumbnail_url" "text",
    "duration" integer,
    "aspect_ratio" "text",
    "platform_format" "public"."ugc_platform_format",
    "file_size" bigint,
    "mime_type" "text",
    "order_index" integer DEFAULT 0,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ugc_submission_media" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_submissions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "campaign_id" "uuid" NOT NULL,
    "influencer_id" "uuid" NOT NULL,
    "post_url" "text" NOT NULL,
    "platform" "public"."ugc_platform" NOT NULL,
    "caption" "text",
    "status" "public"."ugc_submission_status" DEFAULT 'pending'::"public"."ugc_submission_status" NOT NULL,
    "rejection_reason" "text",
    "reviewed_by" "uuid",
    "reviewed_at" timestamp(6) with time zone,
    "total_views_earned" bigint DEFAULT 0,
    "total_earnings" numeric DEFAULT 0,
    "last_synced_at" timestamp(6) with time zone,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "is_suspicious" boolean DEFAULT false,
    "fraud_score" numeric(5,2) DEFAULT 0.00
);


ALTER TABLE "public"."ugc_submissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ugc_view_snapshots" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "submission_id" "uuid" NOT NULL,
    "views_at_snapshot" bigint DEFAULT 0 NOT NULL,
    "delta_views" bigint DEFAULT 0 NOT NULL,
    "earnings_this_snapshot" numeric DEFAULT 0 NOT NULL,
    "snapshotted_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "likes" bigint DEFAULT 0,
    "comments" bigint DEFAULT 0,
    "shares" bigint DEFAULT 0,
    "saves" bigint DEFAULT 0
);


ALTER TABLE "public"."ugc_view_snapshots" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_2fa_secrets" (
    "user_id" "uuid" NOT NULL,
    "secret" "text",
    "backup_codes" "jsonb" DEFAULT '[]'::"jsonb",
    "pending_secret" "text",
    "pending_backup_codes" "jsonb",
    "pending_expires_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_2fa_secrets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_roles" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."user_role" NOT NULL,
    "is_active" boolean DEFAULT true,
    "activated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_roles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."variant_stock_history" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "variant_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "previous_quantity" integer DEFAULT 0 NOT NULL,
    "new_quantity" integer DEFAULT 0 NOT NULL,
    "delta" integer GENERATED ALWAYS AS (("new_quantity" - "previous_quantity")) STORED,
    "change_reason" "text" DEFAULT 'sync'::"text" NOT NULL,
    "order_id" "uuid",
    "order_item_id" "uuid",
    "changed_by" "uuid",
    "source" "text" DEFAULT 'cj'::"text" NOT NULL,
    "note" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."variant_stock_history" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendor_followers" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."vendor_followers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."vendors" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_name" "text" NOT NULL,
    "business_slug" "text" NOT NULL,
    "business_description" "text",
    "business_logo" "text",
    "business_banner" "text",
    "business_email" "text",
    "business_phone" "text",
    "business_address" "text",
    "business_country" "text" DEFAULT 'RW'::"text",
    "tax_id" "text",
    "website" "text",
    "verification_status" "public"."verification_status" DEFAULT 'pending'::"public"."verification_status",
    "verification_notes" "text",
    "verified_at" timestamp(6) with time zone,
    "rating" numeric(3,2) DEFAULT 0,
    "total_sales" integer DEFAULT 0,
    "total_revenue" numeric(14,2) DEFAULT 0,
    "commission_rate" numeric(5,2) DEFAULT 0,
    "affiliate_enabled" boolean DEFAULT true,
    "affiliate_commission_rate" numeric(5,2) DEFAULT 10,
    "stripe_account_id" "text",
    "payout_method" "text" DEFAULT 'mtn'::"text",
    "payout_account" "text",
    "is_featured" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP,
    "follower_count" integer DEFAULT 0,
    "business_type" "text",
    "product_categories" "text",
    "response_time" "text"
);


ALTER TABLE "public"."vendors" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wallets" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "available_balance" numeric(14,2) DEFAULT 0,
    "pending_balance" numeric(14,2) DEFAULT 0,
    "total_earned" numeric(14,2) DEFAULT 0,
    "total_paid" numeric(14,2) DEFAULT 0,
    "currency" "text" DEFAULT 'RWF'::"text",
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."wallets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_events" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "provider" "text" NOT NULL,
    "idempotency_key" "text" NOT NULL,
    "payload" "jsonb",
    "status" "text" DEFAULT 'received'::"text" NOT NULL,
    "error" "text",
    "order_id" "uuid",
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."webhook_events" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."webhook_subscriptions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "vendor_id" "uuid" NOT NULL,
    "product_id" "text" NOT NULL,
    "webhook_url" "text" NOT NULL,
    "events" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "secret" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "failure_count" integer DEFAULT 0 NOT NULL,
    "last_triggered_at" timestamp with time zone,
    "last_failure_at" timestamp with time zone,
    "last_failure_reason" "text",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."webhook_subscriptions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."wishlists" (
    "id" "uuid" DEFAULT "extensions"."uuid_generate_v4"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "product_id" "uuid" NOT NULL,
    "created_at" timestamp(6) with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."wishlists" OWNER TO "postgres";


ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."blog_posts"
    ADD CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buying_lead_offers"
    ADD CONSTRAINT "buying_lead_offers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."buying_requests"
    ADD CONSTRAINT "buying_requests_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."cj_product_map"
    ADD CONSTRAINT "cj_product_map_pkey" PRIMARY KEY ("cj_pid");



ALTER TABLE ONLY "public"."cj_sync_logs"
    ADD CONSTRAINT "cj_sync_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_courses"
    ADD CONSTRAINT "community_courses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_inbox_conversations"
    ADD CONSTRAINT "community_inbox_conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_inbox_messages"
    ADD CONSTRAINT "community_inbox_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_messages"
    ADD CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_payments"
    ADD CONSTRAINT "community_payments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_post_likes"
    ADD CONSTRAINT "community_post_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_saved_posts"
    ADD CONSTRAINT "community_saved_posts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."community_tasks"
    ADD CONSTRAINT "community_tasks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."digital_access"
    ADD CONSTRAINT "digital_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."digital_access"
    ADD CONSTRAINT "digital_access_user_id_product_id_key" UNIQUE ("user_id", "product_id");



ALTER TABLE ONLY "public"."exchange_rate_logs"
    ADD CONSTRAINT "exchange_rate_logs_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."failed_wallet_credits"
    ADD CONSTRAINT "failed_wallet_credits_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."influencers"
    ADD CONSTRAINT "influencers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."member_points"
    ADD CONSTRAINT "member_points_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_payment_status_history"
    ADD CONSTRAINT "order_payment_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."platform_secrets"
    ADD CONSTRAINT "platform_secrets_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."platform_settings"
    ADD CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("key");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_shipping_options"
    ADD CONSTRAINT "product_shipping_options_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_cj_vid_key" UNIQUE ("cj_vid");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_views"
    ADD CONSTRAINT "product_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_vendor_slug_unique" UNIQUE ("vendor_id", "slug");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."shopify_credentials"
    ADD CONSTRAINT "shopify_credentials_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_video_clicks"
    ADD CONSTRAINT "short_video_clicks_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_video_comments"
    ADD CONSTRAINT "short_video_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_video_earnings"
    ADD CONSTRAINT "short_video_earnings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_video_likes"
    ADD CONSTRAINT "short_video_likes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_video_views"
    ADD CONSTRAINT "short_video_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."short_videos"
    ADD CONSTRAINT "short_videos_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_reference_key" UNIQUE ("reference");



ALTER TABLE ONLY "public"."ugc_campaign_escrow"
    ADD CONSTRAINT "ugc_campaign_escrow_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_campaign_media"
    ADD CONSTRAINT "ugc_campaign_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_campaign_participants"
    ADD CONSTRAINT "ugc_campaign_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_campaigns"
    ADD CONSTRAINT "ugc_campaigns_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_payouts"
    ADD CONSTRAINT "ugc_payouts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_reports"
    ADD CONSTRAINT "ugc_reports_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_submission_media"
    ADD CONSTRAINT "ugc_submission_media_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_submissions"
    ADD CONSTRAINT "ugc_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ugc_view_snapshots"
    ADD CONSTRAINT "ugc_view_snapshots_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_2fa_secrets"
    ADD CONSTRAINT "user_2fa_secrets_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."variant_stock_history"
    ADD CONSTRAINT "variant_stock_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendor_followers"
    ADD CONSTRAINT "vendor_followers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."webhook_subscriptions"
    ADD CONSTRAINT "webhook_subscriptions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_pkey" PRIMARY KEY ("id");



CREATE UNIQUE INDEX "affiliate_links_custom_slug_key" ON "public"."affiliate_links" USING "btree" ("custom_slug");



CREATE UNIQUE INDEX "affiliate_links_link_code_key" ON "public"."affiliate_links" USING "btree" ("link_code");



CREATE UNIQUE INDEX "affiliates_affiliate_code_key" ON "public"."affiliates" USING "btree" ("affiliate_code");



CREATE UNIQUE INDEX "affiliates_user_id_key" ON "public"."affiliates" USING "btree" ("user_id");



CREATE INDEX "blog_posts_published_idx" ON "public"."blog_posts" USING "btree" ("is_published", "published_at" DESC);



CREATE UNIQUE INDEX "blog_posts_slug_key" ON "public"."blog_posts" USING "btree" ("slug");



CREATE UNIQUE INDEX "cart_items_unique_line_no_variant" ON "public"."cart_items" USING "btree" ("cart_id", "product_id") WHERE ("variant_id" IS NULL);



CREATE UNIQUE INDEX "cart_items_unique_line_with_variant" ON "public"."cart_items" USING "btree" ("cart_id", "product_id", "variant_id") WHERE ("variant_id" IS NOT NULL);



CREATE INDEX "cj_product_map_product_id_idx" ON "public"."cj_product_map" USING "btree" ("product_id");



CREATE UNIQUE INDEX "communities_slug_key" ON "public"."communities" USING "btree" ("slug");



CREATE UNIQUE INDEX "community_inbox_conversations_community_id_user_low_user_hi_key" ON "public"."community_inbox_conversations" USING "btree" ("community_id", "user_low", "user_high");



CREATE UNIQUE INDEX "community_memberships_community_id_user_id_key" ON "public"."community_memberships" USING "btree" ("community_id", "user_id");



CREATE UNIQUE INDEX "community_payments_payment_reference_key" ON "public"."community_payments" USING "btree" ("payment_reference");



CREATE UNIQUE INDEX "community_post_likes_post_id_user_id_key" ON "public"."community_post_likes" USING "btree" ("post_id", "user_id");



CREATE UNIQUE INDEX "community_saved_posts_user_id_post_id_key" ON "public"."community_saved_posts" USING "btree" ("user_id", "post_id");



CREATE UNIQUE INDEX "conversations_buyer_id_vendor_id_key" ON "public"."conversations" USING "btree" ("buyer_id", "vendor_id");



CREATE INDEX "idx_affiliate_clicks_created_at" ON "public"."affiliate_clicks" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_affiliate_clicks_link_id" ON "public"."affiliate_clicks" USING "btree" ("link_id");



CREATE INDEX "idx_affiliate_commissions_affiliate_created" ON "public"."affiliate_commissions" USING "btree" ("affiliate_id", "created_at" DESC);



CREATE INDEX "idx_affiliate_commissions_affiliate_id" ON "public"."affiliate_commissions" USING "btree" ("affiliate_id");



CREATE INDEX "idx_affiliate_links_affiliate_id" ON "public"."affiliate_links" USING "btree" ("affiliate_id");



CREATE INDEX "idx_affiliate_links_product_id" ON "public"."affiliate_links" USING "btree" ("product_id");



CREATE INDEX "idx_affiliates_code" ON "public"."affiliates" USING "btree" ("affiliate_code");



CREATE INDEX "idx_affiliates_user_id" ON "public"."affiliates" USING "btree" ("user_id");



CREATE INDEX "idx_buying_lead_offers_request" ON "public"."buying_lead_offers" USING "btree" ("buying_request_id");



CREATE INDEX "idx_buying_requests_buyer" ON "public"."buying_requests" USING "btree" ("buyer_id");



CREATE INDEX "idx_buying_requests_status" ON "public"."buying_requests" USING "btree" ("status");



CREATE INDEX "idx_cart_items_cart" ON "public"."cart_items" USING "btree" ("cart_id");



CREATE INDEX "idx_cart_items_vendor" ON "public"."cart_items" USING "btree" ("vendor_id");



CREATE INDEX "idx_carts_abandoned" ON "public"."carts" USING "btree" ("last_activity_at") WHERE ("item_count" > 0);



CREATE INDEX "idx_carts_user" ON "public"."carts" USING "btree" ("user_id");



CREATE INDEX "idx_cj_sync_logs_started_at" ON "public"."cj_sync_logs" USING "btree" ("started_at" DESC);



CREATE INDEX "idx_communities_owner" ON "public"."communities" USING "btree" ("owner_id");



CREATE INDEX "idx_communities_slug" ON "public"."communities" USING "btree" ("slug");



CREATE INDEX "idx_community_inbox_conv_community" ON "public"."community_inbox_conversations" USING "btree" ("community_id");



CREATE INDEX "idx_community_inbox_msg_conv" ON "public"."community_inbox_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_completions_task" ON "public"."task_completions" USING "btree" ("task_id");



CREATE INDEX "idx_completions_user" ON "public"."task_completions" USING "btree" ("user_id");



CREATE INDEX "idx_conversation_messages_conversation" ON "public"."conversation_messages" USING "btree" ("conversation_id");



CREATE INDEX "idx_conversation_messages_created" ON "public"."conversation_messages" USING "btree" ("conversation_id", "created_at");



CREATE INDEX "idx_conversation_messages_reply_to" ON "public"."conversation_messages" USING "btree" ("reply_to_id");



CREATE INDEX "idx_conversations_buyer" ON "public"."conversations" USING "btree" ("buyer_id");



CREATE INDEX "idx_conversations_vendor" ON "public"."conversations" USING "btree" ("vendor_id");



CREATE INDEX "idx_courses_room" ON "public"."community_courses" USING "btree" ("room_id");



CREATE INDEX "idx_digital_access_active" ON "public"."digital_access" USING "btree" ("user_id") WHERE ("revoked_at" IS NULL);



CREATE INDEX "idx_digital_access_order_id" ON "public"."digital_access" USING "btree" ("order_id");



CREATE INDEX "idx_digital_access_product_id" ON "public"."digital_access" USING "btree" ("product_id");



CREATE INDEX "idx_digital_access_user_id" ON "public"."digital_access" USING "btree" ("user_id");



CREATE INDEX "idx_failed_wallet_credits_unresolved" ON "public"."failed_wallet_credits" USING "btree" ("created_at" DESC) WHERE ("resolved" = false);



CREATE INDEX "idx_failed_wallet_credits_vendor" ON "public"."failed_wallet_credits" USING "btree" ("vendor_id");



CREATE INDEX "idx_influencers_user_id" ON "public"."influencers" USING "btree" ("user_id");



CREATE INDEX "idx_lessons_course" ON "public"."course_lessons" USING "btree" ("course_id");



CREATE INDEX "idx_lessons_module" ON "public"."course_lessons" USING "btree" ("module_id");



CREATE INDEX "idx_memberships_community" ON "public"."community_memberships" USING "btree" ("community_id");



CREATE INDEX "idx_memberships_status" ON "public"."community_memberships" USING "btree" ("status");



CREATE INDEX "idx_memberships_user" ON "public"."community_memberships" USING "btree" ("user_id");



CREATE INDEX "idx_messages_community" ON "public"."community_messages" USING "btree" ("community_id");



CREATE INDEX "idx_messages_created" ON "public"."community_messages" USING "btree" ("created_at");



CREATE INDEX "idx_messages_room" ON "public"."community_messages" USING "btree" ("room_id");



CREATE INDEX "idx_messages_thread" ON "public"."community_messages" USING "btree" ("thread_id");



CREATE INDEX "idx_modules_course" ON "public"."course_modules" USING "btree" ("course_id");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("user_id", "is_read") WHERE ("is_read" = false);



CREATE INDEX "idx_notifications_user_id" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_order_items_order_id" ON "public"."order_items" USING "btree" ("order_id");



CREATE INDEX "idx_order_items_pricing_type" ON "public"."order_items" USING "btree" ("pricing_type");



CREATE INDEX "idx_order_items_product_id" ON "public"."order_items" USING "btree" ("product_id");



CREATE INDEX "idx_order_items_product_source" ON "public"."order_items" USING "btree" ("product_source");



CREATE INDEX "idx_order_items_product_type" ON "public"."order_items" USING "btree" ("product_type");



CREATE INDEX "idx_order_items_vendor_id" ON "public"."order_items" USING "btree" ("vendor_id");



CREATE INDEX "idx_order_payment_status_history_new_status" ON "public"."order_payment_status_history" USING "btree" ("new_status");



CREATE INDEX "idx_order_payment_status_history_order_id" ON "public"."order_payment_status_history" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_order_payment_status_history_provider" ON "public"."order_payment_status_history" USING "btree" ("provider") WHERE ("provider" IS NOT NULL);



CREATE INDEX "idx_order_payment_status_history_provider_tx" ON "public"."order_payment_status_history" USING "btree" ("provider", "provider_transaction_id") WHERE ("provider_transaction_id" IS NOT NULL);



CREATE INDEX "idx_order_status_history_created_at" ON "public"."order_status_history" USING "btree" ("order_id", "created_at" DESC);



CREATE INDEX "idx_order_status_history_order_id" ON "public"."order_status_history" USING "btree" ("order_id");



CREATE INDEX "idx_orders_buyer_id" ON "public"."orders" USING "btree" ("buyer_id");



CREATE INDEX "idx_orders_buyer_status" ON "public"."orders" USING "btree" ("buyer_id", "status");



CREATE INDEX "idx_orders_cj_fulfillment" ON "public"."orders" USING "btree" ("cj_fulfillment_status") WHERE ("cj_order_id" IS NOT NULL);



CREATE INDEX "idx_orders_cj_order_id" ON "public"."orders" USING "btree" ("cj_order_id") WHERE ("cj_order_id" IS NOT NULL);



CREATE INDEX "idx_orders_created_at" ON "public"."orders" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_orders_integration_source" ON "public"."orders" USING "btree" ("integration_source");



CREATE UNIQUE INDEX "idx_orders_no_duplicate_pending_checkout" ON "public"."orders" USING "btree" ("buyer_id", "vendor_id", COALESCE(("metadata" ->> 'cart_id'::"text"), 'null'::"text")) WHERE (("status" = 'pending'::"public"."order_status") AND ("payment_status" = ANY (ARRAY['pending'::"public"."payment_status", 'failed'::"public"."payment_status"])));



CREATE INDEX "idx_orders_payment_status" ON "public"."orders" USING "btree" ("payment_status");



CREATE INDEX "idx_orders_status" ON "public"."orders" USING "btree" ("status");



CREATE INDEX "idx_orders_vendor_id" ON "public"."orders" USING "btree" ("vendor_id");



CREATE INDEX "idx_orders_vendor_status" ON "public"."orders" USING "btree" ("vendor_id", "status");



CREATE INDEX "idx_payments_community" ON "public"."community_payments" USING "btree" ("community_id");



CREATE INDEX "idx_payments_user" ON "public"."community_payments" USING "btree" ("user_id");



CREATE INDEX "idx_points_community" ON "public"."member_points" USING "btree" ("community_id");



CREATE INDEX "idx_points_user" ON "public"."member_points" USING "btree" ("user_id");



CREATE INDEX "idx_post_comments_post" ON "public"."community_post_comments" USING "btree" ("post_id");



CREATE INDEX "idx_post_likes_post" ON "public"."community_post_likes" USING "btree" ("post_id");



CREATE INDEX "idx_posts_author" ON "public"."community_posts" USING "btree" ("author_id");



CREATE INDEX "idx_posts_community" ON "public"."community_posts" USING "btree" ("community_id");



CREATE INDEX "idx_posts_room" ON "public"."community_posts" USING "btree" ("room_id");



CREATE INDEX "idx_product_categories_visible" ON "public"."product_categories" USING "btree" ("sort_order") WHERE (("is_active" = true) AND ("visible" = true));



CREATE INDEX "idx_product_shipping_free" ON "public"."product_shipping_options" USING "btree" ("product_id", "ship_to_country") WHERE (("is_free_shipping" = true) AND ("is_active" = true));



CREATE INDEX "idx_product_shipping_product" ON "public"."product_shipping_options" USING "btree" ("product_id");



CREATE INDEX "idx_product_shipping_route" ON "public"."product_shipping_options" USING "btree" ("product_id", "ship_to_country") WHERE ("is_active" = true);



CREATE INDEX "idx_product_shipping_source" ON "public"."product_shipping_options" USING "btree" ("source");



CREATE UNIQUE INDEX "idx_product_shipping_unique" ON "public"."product_shipping_options" USING "btree" ("product_id", "ship_to_country", "method_name");



CREATE INDEX "idx_product_variants_cj_pid" ON "public"."product_variants" USING "btree" ("cj_pid") WHERE ("cj_pid" IS NOT NULL);



CREATE INDEX "idx_product_variants_cj_vid" ON "public"."product_variants" USING "btree" ("cj_vid") WHERE ("cj_vid" IS NOT NULL);



CREATE INDEX "idx_product_variants_source" ON "public"."product_variants" USING "btree" ("source");



CREATE INDEX "idx_product_views_created_at" ON "public"."product_views" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_product_views_product_id" ON "public"."product_views" USING "btree" ("product_id");



CREATE INDEX "idx_products_active" ON "public"."products" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_products_active_category" ON "public"."products" USING "btree" ("category_id", "sale_count" DESC) WHERE (("status" = 'active'::"public"."product_status") AND ("is_active" = true));



CREATE INDEX "idx_products_active_vendor" ON "public"."products" USING "btree" ("vendor_id", "created_at" DESC) WHERE (("status" = 'active'::"public"."product_status") AND ("is_active" = true));



CREATE INDEX "idx_products_category_id" ON "public"."products" USING "btree" ("category_id");



CREATE INDEX "idx_products_cj_free_shipping" ON "public"."products" USING "btree" ("is_free_shipping") WHERE (("source" = 'cj'::"text") AND ("is_free_shipping" = true));



CREATE INDEX "idx_products_cj_needs_resync" ON "public"."products" USING "btree" ("cj_last_synced_at" NULLS FIRST) WHERE (("source" = 'cj'::"text") AND ("status" = 'active'::"public"."product_status"));



CREATE INDEX "idx_products_delivery_time" ON "public"."products" USING "btree" ("delivery_time") WHERE (("delivery_time" IS NOT NULL) AND ("status" = 'active'::"public"."product_status"));



CREATE INDEX "idx_products_enable_discussions" ON "public"."products" USING "btree" ("enable_discussions") WHERE ("enable_discussions" = true);



CREATE INDEX "idx_products_featured" ON "public"."products" USING "btree" ("is_featured") WHERE ("is_featured" = true);



CREATE INDEX "idx_products_flash_deal" ON "public"."products" USING "btree" ("is_flash_deal", "status") WHERE ("is_flash_deal" = true);



CREATE INDEX "idx_products_free_shipping" ON "public"."products" USING "btree" ("is_free_shipping") WHERE ("is_free_shipping" = true);



CREATE INDEX "idx_products_name_trgm" ON "public"."products" USING "gin" ("name" "public"."gin_trgm_ops");



CREATE INDEX "idx_products_not_deleted" ON "public"."products" USING "btree" ("id") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_products_product_type" ON "public"."products" USING "btree" ("product_type");



CREATE INDEX "idx_products_search" ON "public"."products" USING "gin" ("to_tsvector"('"english"'::"regconfig", (("name" || ' '::"text") || COALESCE("description", ''::"text"))));



CREATE INDEX "idx_products_shipping_from" ON "public"."products" USING "btree" ("shipping_from") WHERE (("shipping_from" IS NOT NULL) AND ("status" = 'active'::"public"."product_status"));



CREATE UNIQUE INDEX "idx_products_shopify_id" ON "public"."products" USING "btree" ("shopify_product_id", "vendor_id") WHERE ("shopify_product_id" IS NOT NULL);



CREATE INDEX "idx_products_slug" ON "public"."products" USING "btree" ("slug");



CREATE INDEX "idx_products_source" ON "public"."products" USING "btree" ("source");



CREATE INDEX "idx_products_status" ON "public"."products" USING "btree" ("status");



CREATE INDEX "idx_products_type" ON "public"."products" USING "btree" ("product_type");



CREATE INDEX "idx_products_vendor_id" ON "public"."products" USING "btree" ("vendor_id");



CREATE INDEX "idx_profiles_email" ON "public"."profiles" USING "btree" ("email");



CREATE INDEX "idx_profiles_username" ON "public"."profiles" USING "btree" ("username");



CREATE INDEX "idx_progress_lesson" ON "public"."lesson_progress" USING "btree" ("lesson_id");



CREATE INDEX "idx_progress_user" ON "public"."lesson_progress" USING "btree" ("user_id");



CREATE INDEX "idx_reviews_order_item_id" ON "public"."reviews" USING "btree" ("order_item_id");



CREATE INDEX "idx_reviews_product_id" ON "public"."reviews" USING "btree" ("product_id");



CREATE INDEX "idx_reviews_vendor_id" ON "public"."reviews" USING "btree" ("vendor_id");



CREATE INDEX "idx_rooms_community" ON "public"."rooms" USING "btree" ("community_id");



CREATE INDEX "idx_rooms_room_type" ON "public"."rooms" USING "btree" ("room_type");



CREATE INDEX "idx_rooms_space" ON "public"."rooms" USING "btree" ("space_id");



CREATE INDEX "idx_saved_posts_user" ON "public"."community_saved_posts" USING "btree" ("user_id");



CREATE INDEX "idx_shopify_creds_domain" ON "public"."shopify_credentials" USING "btree" ("shop_domain");



CREATE INDEX "idx_short_videos_community" ON "public"."short_videos" USING "btree" ("community_id");



CREATE INDEX "idx_short_videos_creator" ON "public"."short_videos" USING "btree" ("creator_id");



CREATE INDEX "idx_short_videos_product" ON "public"."short_videos" USING "btree" ("product_id");



CREATE INDEX "idx_short_videos_status" ON "public"."short_videos" USING "btree" ("status");



CREATE INDEX "idx_short_videos_user" ON "public"."short_videos" USING "btree" ("user_id");



CREATE INDEX "idx_spaces_community" ON "public"."spaces" USING "btree" ("community_id");



CREATE INDEX "idx_stock_history_delta" ON "public"."variant_stock_history" USING "btree" ("variant_id") WHERE ("delta" <> 0);



CREATE INDEX "idx_stock_history_product" ON "public"."variant_stock_history" USING "btree" ("product_id", "created_at" DESC);



CREATE INDEX "idx_stock_history_reason" ON "public"."variant_stock_history" USING "btree" ("change_reason");



CREATE INDEX "idx_stock_history_variant" ON "public"."variant_stock_history" USING "btree" ("variant_id", "created_at" DESC);



CREATE INDEX "idx_svclicks_product" ON "public"."short_video_clicks" USING "btree" ("product_id");



CREATE INDEX "idx_svclicks_video" ON "public"."short_video_clicks" USING "btree" ("video_id");



CREATE INDEX "idx_svearnings_creator" ON "public"."short_video_earnings" USING "btree" ("creator_id");



CREATE INDEX "idx_svearnings_video" ON "public"."short_video_earnings" USING "btree" ("video_id");



CREATE INDEX "idx_svlikes_video" ON "public"."short_video_likes" USING "btree" ("video_id");



CREATE INDEX "idx_svviews_video" ON "public"."short_video_views" USING "btree" ("video_id");



CREATE INDEX "idx_svviews_viewer" ON "public"."short_video_views" USING "btree" ("viewer_id");



CREATE INDEX "idx_tasks_room" ON "public"."community_tasks" USING "btree" ("room_id");



CREATE INDEX "idx_transactions_order_id" ON "public"."transactions" USING "btree" ("order_id");



CREATE INDEX "idx_transactions_provider_lookup" ON "public"."transactions" USING "btree" ("provider", "provider_transaction_id") WHERE ("provider_transaction_id" IS NOT NULL);



CREATE INDEX "idx_transactions_reference" ON "public"."transactions" USING "btree" ("reference") WHERE ("reference" IS NOT NULL);



CREATE INDEX "idx_transactions_status" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "idx_transactions_user_id" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "idx_ugc_campaign_media_campaign_id" ON "public"."ugc_campaign_media" USING "btree" ("campaign_id");



CREATE INDEX "idx_ugc_campaigns_brand_id" ON "public"."ugc_campaigns" USING "btree" ("brand_id");



CREATE INDEX "idx_ugc_campaigns_status" ON "public"."ugc_campaigns" USING "btree" ("status");



CREATE INDEX "idx_ugc_campaigns_type" ON "public"."ugc_campaigns" USING "btree" ("campaign_type");



CREATE INDEX "idx_ugc_media_camp_id" ON "public"."ugc_campaign_media" USING "btree" ("campaign_id");



CREATE INDEX "idx_ugc_media_sub_id" ON "public"."ugc_submission_media" USING "btree" ("submission_id");



CREATE INDEX "idx_ugc_parts_camp_id" ON "public"."ugc_campaign_participants" USING "btree" ("campaign_id");



CREATE INDEX "idx_ugc_parts_inf_id" ON "public"."ugc_campaign_participants" USING "btree" ("influencer_id");



CREATE INDEX "idx_ugc_payouts_created_at" ON "public"."ugc_payouts" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ugc_payouts_inf_id" ON "public"."ugc_payouts" USING "btree" ("influencer_id");



CREATE INDEX "idx_ugc_payouts_status" ON "public"."ugc_payouts" USING "btree" ("status");



CREATE INDEX "idx_ugc_payouts_sub_id" ON "public"."ugc_payouts" USING "btree" ("submission_id");



CREATE INDEX "idx_ugc_reports_status" ON "public"."ugc_reports" USING "btree" ("status");



CREATE INDEX "idx_ugc_reports_submission_id" ON "public"."ugc_reports" USING "btree" ("submission_id");



CREATE INDEX "idx_ugc_sub_created_at" ON "public"."ugc_submissions" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_ugc_submissions_campaign_id" ON "public"."ugc_submissions" USING "btree" ("campaign_id");



CREATE INDEX "idx_ugc_submissions_influencer_id" ON "public"."ugc_submissions" USING "btree" ("influencer_id");



CREATE INDEX "idx_ugc_submissions_status" ON "public"."ugc_submissions" USING "btree" ("status");



CREATE INDEX "idx_ugc_view_snapshots_at" ON "public"."ugc_view_snapshots" USING "btree" ("snapshotted_at" DESC);



CREATE INDEX "idx_ugc_view_snapshots_submission_id" ON "public"."ugc_view_snapshots" USING "btree" ("submission_id");



CREATE INDEX "idx_user_roles_role" ON "public"."user_roles" USING "btree" ("role");



CREATE INDEX "idx_user_roles_user_id" ON "public"."user_roles" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_vendor_followers_composite" ON "public"."vendor_followers" USING "btree" ("vendor_id", "user_id");



CREATE INDEX "idx_vendor_followers_count" ON "public"."vendor_followers" USING "btree" ("vendor_id");



CREATE INDEX "idx_vendors_name_trgm" ON "public"."vendors" USING "gin" ("business_name" "public"."gin_trgm_ops");



CREATE INDEX "idx_vendors_slug" ON "public"."vendors" USING "btree" ("business_slug");



CREATE INDEX "idx_vendors_user_id" ON "public"."vendors" USING "btree" ("user_id");



CREATE INDEX "idx_vendors_verification" ON "public"."vendors" USING "btree" ("verification_status");



CREATE UNIQUE INDEX "influencers_user_id_key" ON "public"."influencers" USING "btree" ("user_id");



CREATE UNIQUE INDEX "lesson_progress_user_id_lesson_id_key" ON "public"."lesson_progress" USING "btree" ("user_id", "lesson_id");



CREATE UNIQUE INDEX "member_points_user_id_community_id_key" ON "public"."member_points" USING "btree" ("user_id", "community_id");



CREATE UNIQUE INDEX "orders_order_number_key" ON "public"."orders" USING "btree" ("order_number");



CREATE INDEX "platform_settings_updated_at_idx" ON "public"."platform_settings" USING "btree" ("updated_at" DESC);



CREATE UNIQUE INDEX "product_categories_slug_key" ON "public"."product_categories" USING "btree" ("slug");



CREATE UNIQUE INDEX "product_variants_sku_key" ON "public"."product_variants" USING "btree" ("sku");



CREATE UNIQUE INDEX "products_sku_key" ON "public"."products" USING "btree" ("sku");



CREATE UNIQUE INDEX "products_slug_key" ON "public"."products" USING "btree" ("slug");



CREATE UNIQUE INDEX "profiles_email_key" ON "public"."profiles" USING "btree" ("email");



CREATE UNIQUE INDEX "profiles_username_key" ON "public"."profiles" USING "btree" ("username");



CREATE UNIQUE INDEX "reviews_product_id_buyer_id_key" ON "public"."reviews" USING "btree" ("product_id", "buyer_id");



CREATE UNIQUE INDEX "rooms_space_id_slug_key" ON "public"."rooms" USING "btree" ("space_id", "slug");



CREATE UNIQUE INDEX "shopify_credentials_vendor_id_key" ON "public"."shopify_credentials" USING "btree" ("vendor_id");



CREATE UNIQUE INDEX "short_video_likes_video_id_user_id_key" ON "public"."short_video_likes" USING "btree" ("video_id", "user_id");



CREATE UNIQUE INDEX "short_video_views_video_id_viewer_id_key" ON "public"."short_video_views" USING "btree" ("video_id", "viewer_id");



CREATE UNIQUE INDEX "spaces_community_id_slug_key" ON "public"."spaces" USING "btree" ("community_id", "slug");



CREATE UNIQUE INDEX "task_completions_task_id_user_id_key" ON "public"."task_completions" USING "btree" ("task_id", "user_id");



CREATE INDEX "transactions_order_id_idx" ON "public"."transactions" USING "btree" ("order_id");



CREATE UNIQUE INDEX "transactions_provider_provider_transaction_id_key" ON "public"."transactions" USING "btree" ("provider", "provider_transaction_id");



CREATE INDEX "transactions_status_idx" ON "public"."transactions" USING "btree" ("status");



CREATE INDEX "transactions_user_id_idx" ON "public"."transactions" USING "btree" ("user_id");



CREATE INDEX "transactions_webhook_event_id_idx" ON "public"."transactions" USING "btree" ("webhook_event_id");



CREATE UNIQUE INDEX "ugc_campaign_escrow_campaign_id_key" ON "public"."ugc_campaign_escrow" USING "btree" ("campaign_id");



CREATE UNIQUE INDEX "ugc_campaign_participants_campaign_id_influencer_id_key" ON "public"."ugc_campaign_participants" USING "btree" ("campaign_id", "influencer_id");



CREATE UNIQUE INDEX "ugc_submissions_campaign_id_post_url_key" ON "public"."ugc_submissions" USING "btree" ("campaign_id", "post_url");



CREATE UNIQUE INDEX "user_roles_user_id_role_key" ON "public"."user_roles" USING "btree" ("user_id", "role");



CREATE UNIQUE INDEX "vendor_followers_vendor_id_user_id_key" ON "public"."vendor_followers" USING "btree" ("vendor_id", "user_id");



CREATE UNIQUE INDEX "vendors_business_slug_key" ON "public"."vendors" USING "btree" ("business_slug");



CREATE UNIQUE INDEX "wallets_user_id_key" ON "public"."wallets" USING "btree" ("user_id");



CREATE UNIQUE INDEX "webhook_events_idempotency_key_key" ON "public"."webhook_events" USING "btree" ("idempotency_key");



CREATE INDEX "webhook_events_order_id_idx" ON "public"."webhook_events" USING "btree" ("order_id") WHERE ("order_id" IS NOT NULL);



CREATE INDEX "webhook_events_provider_idx" ON "public"."webhook_events" USING "btree" ("provider", "created_at" DESC);



CREATE INDEX "webhook_events_status_idx" ON "public"."webhook_events" USING "btree" ("status", "created_at" DESC);



CREATE UNIQUE INDEX "webhook_subscriptions_active_unique" ON "public"."webhook_subscriptions" USING "btree" ("vendor_id", "product_id", "webhook_url") WHERE ("is_active" = true);



CREATE INDEX "webhook_subscriptions_product_active_idx" ON "public"."webhook_subscriptions" USING "btree" ("product_id", "is_active");



CREATE UNIQUE INDEX "wishlists_user_id_product_id_key" ON "public"."wishlists" USING "btree" ("user_id", "product_id");



CREATE OR REPLACE TRIGGER "cj_product_map_updated_at" BEFORE UPDATE ON "public"."cj_product_map" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "on_review_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_rating"();



CREATE OR REPLACE TRIGGER "on_vendor_follower_change" AFTER INSERT OR DELETE ON "public"."vendor_followers" FOR EACH ROW EXECUTE FUNCTION "public"."update_vendor_follower_count"();



CREATE OR REPLACE TRIGGER "on_vendor_review_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."reviews" FOR EACH ROW EXECUTE FUNCTION "public"."update_vendor_overall_rating"();



CREATE OR REPLACE TRIGGER "set_product_shipping_updated_at" BEFORE UPDATE ON "public"."product_shipping_options" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "set_product_variants_updated_at" BEFORE UPDATE ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_cart_items_recompute" AFTER INSERT OR DELETE OR UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."recompute_cart_totals"();



CREATE OR REPLACE TRIGGER "tr_cart_items_updated_at" BEFORE UPDATE ON "public"."cart_items" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "tr_community_messages_bump_reply" AFTER INSERT ON "public"."community_messages" FOR EACH ROW EXECUTE FUNCTION "public"."bump_parent_message_reply_count"();



CREATE OR REPLACE TRIGGER "tr_guard_membership_plan" BEFORE UPDATE ON "public"."community_memberships" FOR EACH ROW EXECUTE FUNCTION "public"."guard_membership_plan_change"();



CREATE OR REPLACE TRIGGER "tr_guard_product_delete" BEFORE DELETE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."guard_product_delete"();



CREATE OR REPLACE TRIGGER "tr_guard_wallet_mutations" BEFORE DELETE OR UPDATE ON "public"."wallets" FOR EACH ROW EXECUTE FUNCTION "public"."guard_wallet_mutations"();



CREATE OR REPLACE TRIGGER "tr_order_items_sale_count" AFTER INSERT OR DELETE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_sale_count"();



CREATE OR REPLACE TRIGGER "tr_orders_recompute_total" BEFORE UPDATE OF "shipping_amount", "tax_amount", "discount_amount", "subtotal" ON "public"."orders" FOR EACH ROW WHEN ((("new"."shipping_amount" IS DISTINCT FROM "old"."shipping_amount") OR ("new"."tax_amount" IS DISTINCT FROM "old"."tax_amount") OR ("new"."discount_amount" IS DISTINCT FROM "old"."discount_amount") OR ("new"."subtotal" IS DISTINCT FROM "old"."subtotal"))) EXECUTE FUNCTION "public"."recompute_order_total"();



CREATE OR REPLACE TRIGGER "tr_product_views_increment_count" AFTER INSERT ON "public"."product_views" FOR EACH ROW EXECUTE FUNCTION "public"."increment_product_view_count"();



CREATE OR REPLACE TRIGGER "tr_products_published_at" BEFORE INSERT OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."set_product_published_at"();



CREATE OR REPLACE TRIGGER "tr_task_completions_bump_count" AFTER INSERT ON "public"."task_completions" FOR EACH ROW EXECUTE FUNCTION "public"."bump_community_task_completion_count"();



CREATE OR REPLACE TRIGGER "tr_update_order_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_order_totals"();



CREATE OR REPLACE TRIGGER "tr_variant_stock_change" AFTER UPDATE OF "inventory_quantity" ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."log_variant_stock_change"();



CREATE OR REPLACE TRIGGER "tr_variant_stock_on_insert" AFTER INSERT ON "public"."product_variants" FOR EACH ROW EXECUTE FUNCTION "public"."log_variant_stock_on_insert"();



CREATE OR REPLACE TRIGGER "tr_wishlists_update_count" AFTER INSERT OR DELETE ON "public"."wishlists" FOR EACH ROW EXECUTE FUNCTION "public"."update_product_wishlist_count"();



CREATE OR REPLACE TRIGGER "trigger_notify_conversation_message" AFTER INSERT ON "public"."conversation_messages" FOR EACH ROW EXECUTE FUNCTION "public"."notify_conversation_message"();



CREATE OR REPLACE TRIGGER "update_affiliates_updated_at" BEFORE UPDATE ON "public"."affiliates" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_communities_updated_at" BEFORE UPDATE ON "public"."communities" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_influencers_updated_at" BEFORE UPDATE ON "public"."influencers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_orders_updated_at" BEFORE UPDATE ON "public"."orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_transactions_updated_at" BEFORE UPDATE ON "public"."transactions" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_vendors_updated_at" BEFORE UPDATE ON "public"."vendors" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id");



ALTER TABLE ONLY "public"."affiliate_clicks"
    ADD CONSTRAINT "affiliate_clicks_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id");



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_link_id_fkey" FOREIGN KEY ("link_id") REFERENCES "public"."affiliate_links"("id");



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."affiliate_commissions"
    ADD CONSTRAINT "affiliate_commissions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_affiliate_id_fkey" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliate_links"
    ADD CONSTRAINT "affiliate_links_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."affiliates"
    ADD CONSTRAINT "affiliates_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buying_lead_offers"
    ADD CONSTRAINT "buying_lead_offers_buying_request_id_fkey" FOREIGN KEY ("buying_request_id") REFERENCES "public"."buying_requests"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buying_lead_offers"
    ADD CONSTRAINT "buying_lead_offers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."buying_requests"
    ADD CONSTRAINT "buying_requests_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_affiliate_link_id_fkey" FOREIGN KEY ("affiliate_link_id") REFERENCES "public"."affiliate_links"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cart_items"
    ADD CONSTRAINT "cart_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."carts"
    ADD CONSTRAINT "carts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cj_product_map"
    ADD CONSTRAINT "cj_product_map_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."communities"
    ADD CONSTRAINT "communities_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_courses"
    ADD CONSTRAINT "community_courses_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_courses"
    ADD CONSTRAINT "community_courses_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_courses"
    ADD CONSTRAINT "community_courses_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_inbox_conversations"
    ADD CONSTRAINT "community_inbox_conversations_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_inbox_conversations"
    ADD CONSTRAINT "community_inbox_conversations_user_high_fkey" FOREIGN KEY ("user_high") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_inbox_conversations"
    ADD CONSTRAINT "community_inbox_conversations_user_low_fkey" FOREIGN KEY ("user_low") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_inbox_messages"
    ADD CONSTRAINT "community_inbox_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."community_inbox_conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_inbox_messages"
    ADD CONSTRAINT "community_inbox_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_memberships"
    ADD CONSTRAINT "community_memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_messages"
    ADD CONSTRAINT "community_messages_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_messages"
    ADD CONSTRAINT "community_messages_deleted_by_fkey" FOREIGN KEY ("deleted_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_messages"
    ADD CONSTRAINT "community_messages_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_messages"
    ADD CONSTRAINT "community_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_messages"
    ADD CONSTRAINT "community_messages_thread_id_fkey" FOREIGN KEY ("thread_id") REFERENCES "public"."community_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."community_payments"
    ADD CONSTRAINT "community_payments_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_payments"
    ADD CONSTRAINT "community_payments_membership_id_fkey" FOREIGN KEY ("membership_id") REFERENCES "public"."community_memberships"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."community_payments"
    ADD CONSTRAINT "community_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."community_post_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_comments"
    ADD CONSTRAINT "community_post_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_likes"
    ADD CONSTRAINT "community_post_likes_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_post_likes"
    ADD CONSTRAINT "community_post_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_posts"
    ADD CONSTRAINT "community_posts_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_saved_posts"
    ADD CONSTRAINT "community_saved_posts_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "public"."community_posts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_saved_posts"
    ADD CONSTRAINT "community_saved_posts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tasks"
    ADD CONSTRAINT "community_tasks_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tasks"
    ADD CONSTRAINT "community_tasks_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."community_tasks"
    ADD CONSTRAINT "community_tasks_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "public"."rooms"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "public"."conversation_messages"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."conversation_messages"
    ADD CONSTRAINT "conversation_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."conversations"
    ADD CONSTRAINT "conversations_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."community_courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_lessons"
    ADD CONSTRAINT "course_lessons_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "public"."course_modules"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."course_modules"
    ADD CONSTRAINT "course_modules_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."community_courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."digital_access"
    ADD CONSTRAINT "digital_access_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."digital_access"
    ADD CONSTRAINT "digital_access_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."digital_access"
    ADD CONSTRAINT "digital_access_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."digital_access"
    ADD CONSTRAINT "digital_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."exchange_rate_logs"
    ADD CONSTRAINT "exchange_rate_logs_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id");



ALTER TABLE ONLY "public"."failed_wallet_credits"
    ADD CONSTRAINT "failed_wallet_credits_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."failed_wallet_credits"
    ADD CONSTRAINT "failed_wallet_credits_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."influencers"
    ADD CONSTRAINT "influencers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_course_id_fkey" FOREIGN KEY ("course_id") REFERENCES "public"."community_courses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "public"."course_lessons"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_progress"
    ADD CONSTRAINT "lesson_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_points"
    ADD CONSTRAINT "member_points_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."member_points"
    ADD CONSTRAINT "member_points_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."order_items"
    ADD CONSTRAINT "order_items_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id");



ALTER TABLE ONLY "public"."order_payment_status_history"
    ADD CONSTRAINT "order_payment_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."order_status_history"
    ADD CONSTRAINT "order_status_history_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."orders"
    ADD CONSTRAINT "orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payouts"
    ADD CONSTRAINT "payouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."product_categories"
    ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."product_categories"("id");



ALTER TABLE ONLY "public"."product_shipping_options"
    ADD CONSTRAINT "product_shipping_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_views"
    ADD CONSTRAINT "product_views_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_views"
    ADD CONSTRAINT "product_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."product_categories"("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id");



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."reviews"
    ADD CONSTRAINT "reviews_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."rooms"
    ADD CONSTRAINT "rooms_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "public"."spaces"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."shopify_credentials"
    ADD CONSTRAINT "shopify_credentials_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_clicks"
    ADD CONSTRAINT "short_video_clicks_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_video_clicks"
    ADD CONSTRAINT "short_video_clicks_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_video_clicks"
    ADD CONSTRAINT "short_video_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_video_clicks"
    ADD CONSTRAINT "short_video_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_video_clicks"
    ADD CONSTRAINT "short_video_clicks_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."short_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_comments"
    ADD CONSTRAINT "short_video_comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_comments"
    ADD CONSTRAINT "short_video_comments_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."short_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_earnings"
    ADD CONSTRAINT "short_video_earnings_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."influencers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_earnings"
    ADD CONSTRAINT "short_video_earnings_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."short_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_likes"
    ADD CONSTRAINT "short_video_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_likes"
    ADD CONSTRAINT "short_video_likes_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."short_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_views"
    ADD CONSTRAINT "short_video_views_video_id_fkey" FOREIGN KEY ("video_id") REFERENCES "public"."short_videos"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_video_views"
    ADD CONSTRAINT "short_video_views_viewer_id_fkey" FOREIGN KEY ("viewer_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_videos"
    ADD CONSTRAINT "short_videos_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_videos"
    ADD CONSTRAINT "short_videos_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "public"."influencers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."short_videos"
    ADD CONSTRAINT "short_videos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."short_videos"
    ADD CONSTRAINT "short_videos_user_id_profiles_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."spaces"
    ADD CONSTRAINT "spaces_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "public"."communities"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "public"."community_tasks"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."task_completions"
    ADD CONSTRAINT "task_completions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON UPDATE CASCADE ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."transactions"
    ADD CONSTRAINT "transactions_webhook_event_id_fkey" FOREIGN KEY ("webhook_event_id") REFERENCES "public"."webhook_events"("id") ON UPDATE CASCADE ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ugc_campaign_escrow"
    ADD CONSTRAINT "ugc_campaign_escrow_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ugc_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_campaign_escrow"
    ADD CONSTRAINT "ugc_campaign_escrow_deposited_by_fkey" FOREIGN KEY ("deposited_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ugc_campaign_media"
    ADD CONSTRAINT "ugc_campaign_media_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ugc_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_campaign_participants"
    ADD CONSTRAINT "ugc_campaign_participants_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ugc_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_campaign_participants"
    ADD CONSTRAINT "ugc_campaign_participants_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_campaigns"
    ADD CONSTRAINT "ugc_campaigns_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_payouts"
    ADD CONSTRAINT "ugc_payouts_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_payouts"
    ADD CONSTRAINT "ugc_payouts_payout_id_fkey" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id");



ALTER TABLE ONLY "public"."ugc_payouts"
    ADD CONSTRAINT "ugc_payouts_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."ugc_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_reports"
    ADD CONSTRAINT "ugc_reports_reporter_id_fkey" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ugc_reports"
    ADD CONSTRAINT "ugc_reports_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ugc_reports"
    ADD CONSTRAINT "ugc_reports_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."ugc_submissions"("id");



ALTER TABLE ONLY "public"."ugc_submission_media"
    ADD CONSTRAINT "ugc_submission_media_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."ugc_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_submissions"
    ADD CONSTRAINT "ugc_submissions_campaign_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "public"."ugc_campaigns"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_submissions"
    ADD CONSTRAINT "ugc_submissions_influencer_id_fkey" FOREIGN KEY ("influencer_id") REFERENCES "public"."influencers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ugc_submissions"
    ADD CONSTRAINT "ugc_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."ugc_view_snapshots"
    ADD CONSTRAINT "ugc_view_snapshots_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "public"."ugc_submissions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_2fa_secrets"
    ADD CONSTRAINT "user_2fa_secrets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_roles"
    ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_stock_history"
    ADD CONSTRAINT "variant_stock_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variant_stock_history"
    ADD CONSTRAINT "variant_stock_history_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variant_stock_history"
    ADD CONSTRAINT "variant_stock_history_order_item_id_fkey" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."variant_stock_history"
    ADD CONSTRAINT "variant_stock_history_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."variant_stock_history"
    ADD CONSTRAINT "variant_stock_history_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_followers"
    ADD CONSTRAINT "vendor_followers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendor_followers"
    ADD CONSTRAINT "vendor_followers_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."vendors"
    ADD CONSTRAINT "vendors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wallets"
    ADD CONSTRAINT "wallets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."webhook_events"
    ADD CONSTRAINT "webhook_events_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."webhook_subscriptions"
    ADD CONSTRAINT "webhook_subscriptions_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."wishlists"
    ADD CONSTRAINT "wishlists_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Active ugc campaigns are publicly viewable" ON "public"."ugc_campaigns" FOR SELECT USING (("status" = 'active'::"public"."ugc_campaign_status"));



CREATE POLICY "Buyers can view offers on their requests" ON "public"."buying_lead_offers" FOR SELECT USING (("buying_request_id" IN ( SELECT "buying_requests"."id"
   FROM "public"."buying_requests"
  WHERE ("buying_requests"."buyer_id" = "auth"."uid"()))));



CREATE POLICY "Influencers can manage own submissions" ON "public"."ugc_submissions" USING (("influencer_id" IN ( SELECT "influencers"."id"
   FROM "public"."influencers"
  WHERE ("influencers"."user_id" = "auth"."uid"()))));



CREATE POLICY "Service role can manage digital access" ON "public"."digital_access" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "Users can manage own buying requests" ON "public"."buying_requests" USING (("auth"."uid"() = "buyer_id")) WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "Users can read own digital access" ON "public"."digital_access" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own cart" ON "public"."carts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users delete own cart items" ON "public"."cart_items" FOR DELETE USING (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users insert own cart" ON "public"."carts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users insert own cart items" ON "public"."cart_items" FOR INSERT WITH CHECK (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users select own cart" ON "public"."carts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users select own cart items" ON "public"."cart_items" FOR SELECT USING (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"()))));



CREATE POLICY "Users update own cart" ON "public"."carts" FOR UPDATE USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users update own cart items" ON "public"."cart_items" FOR UPDATE USING (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"())))) WITH CHECK (("cart_id" IN ( SELECT "carts"."id"
   FROM "public"."carts"
  WHERE ("carts"."user_id" = "auth"."uid"()))));



CREATE POLICY "Vendors can insert offers" ON "public"."buying_lead_offers" FOR INSERT WITH CHECK (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



CREATE POLICY "Vendors can manage own ugc campaigns" ON "public"."ugc_campaigns" USING (("brand_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



CREATE POLICY "Vendors can update own offers" ON "public"."buying_lead_offers" FOR UPDATE USING (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



CREATE POLICY "active_short_videos_public" ON "public"."short_videos" FOR SELECT USING ((("status" = 'active'::"text") OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."affiliate_clicks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "affiliate_clicks_insert" ON "public"."affiliate_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "affiliate_clicks_select" ON "public"."affiliate_clicks" FOR SELECT USING (("auth"."uid"() = ( SELECT "affiliates"."user_id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."id" = "affiliate_clicks"."affiliate_id"))));



ALTER TABLE "public"."affiliate_commissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "affiliate_commissions_select" ON "public"."affiliate_commissions" FOR SELECT USING (("auth"."uid"() = ( SELECT "affiliates"."user_id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."id" = "affiliate_commissions"."affiliate_id"))));



ALTER TABLE "public"."affiliate_links" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "affiliate_links_delete" ON "public"."affiliate_links" FOR DELETE USING (("auth"."uid"() = ( SELECT "affiliates"."user_id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."id" = "affiliate_links"."affiliate_id"))));



CREATE POLICY "affiliate_links_insert" ON "public"."affiliate_links" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "affiliates"."user_id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."id" = "affiliate_links"."affiliate_id"))));



CREATE POLICY "affiliate_links_select" ON "public"."affiliate_links" FOR SELECT USING (true);



CREATE POLICY "affiliate_links_update" ON "public"."affiliate_links" FOR UPDATE USING (("auth"."uid"() = ( SELECT "affiliates"."user_id"
   FROM "public"."affiliates"
  WHERE ("affiliates"."id" = "affiliate_links"."affiliate_id"))));



ALTER TABLE "public"."affiliates" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "affiliates_delete" ON "public"."affiliates" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "affiliates_insert" ON "public"."affiliates" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "affiliates_select" ON "public"."affiliates" FOR SELECT USING (true);



CREATE POLICY "affiliates_update" ON "public"."affiliates" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "anyone_can_log_product_view" ON "public"."product_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "anyone_logs_clicks" ON "public"."short_video_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "anyone_logs_view" ON "public"."short_video_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "authors_manage_own_comments" ON "public"."community_post_comments" FOR UPDATE USING (("author_id" = "auth"."uid"())) WITH CHECK (("author_id" = "auth"."uid"()));



ALTER TABLE "public"."blog_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "blog_posts_select" ON "public"."blog_posts" FOR SELECT USING (true);



CREATE POLICY "blog_posts_select_published" ON "public"."blog_posts" FOR SELECT TO "anon", "authenticated" USING (("is_published" = true));



CREATE POLICY "brands_manage_escrow" ON "public"."ugc_campaign_escrow" USING (("campaign_id" IN ( SELECT "ugc_campaigns"."id"
   FROM "public"."ugc_campaigns"
  WHERE ("ugc_campaigns"."brand_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"())))))) WITH CHECK (("campaign_id" IN ( SELECT "ugc_campaigns"."id"
   FROM "public"."ugc_campaigns"
  WHERE ("ugc_campaigns"."brand_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"()))))));



CREATE POLICY "brands_view_campaign_participants" ON "public"."ugc_campaign_participants" FOR SELECT USING (("campaign_id" IN ( SELECT "ugc_campaigns"."id"
   FROM "public"."ugc_campaigns"
  WHERE ("ugc_campaigns"."brand_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"()))))));



CREATE POLICY "buyers_select_own_payment_history" ON "public"."order_payment_status_history" FOR SELECT USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."buyer_id" = "auth"."uid"()))));



CREATE POLICY "buyers_view_own_order_history" ON "public"."order_status_history" FOR SELECT USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."buyer_id" = "auth"."uid"()))));



ALTER TABLE "public"."buying_lead_offers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "buying_lead_offers_insert" ON "public"."buying_lead_offers" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "buying_lead_offers"."vendor_id"))));



CREATE POLICY "buying_lead_offers_select" ON "public"."buying_lead_offers" FOR SELECT USING (true);



CREATE POLICY "buying_lead_offers_update" ON "public"."buying_lead_offers" FOR UPDATE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "buying_lead_offers"."vendor_id"))));



ALTER TABLE "public"."buying_requests" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "buying_requests_delete" ON "public"."buying_requests" FOR DELETE USING (("auth"."uid"() = "buyer_id"));



CREATE POLICY "buying_requests_insert" ON "public"."buying_requests" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "buying_requests_select" ON "public"."buying_requests" FOR SELECT USING (true);



CREATE POLICY "buying_requests_update" ON "public"."buying_requests" FOR UPDATE USING (("auth"."uid"() = "buyer_id"));



ALTER TABLE "public"."cart_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."carts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cj_product_map" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cj_sync_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "comments_public_read" ON "public"."short_video_comments" FOR SELECT USING (true);



ALTER TABLE "public"."communities" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "communities_delete" ON "public"."communities" FOR DELETE USING (("auth"."uid"() = "owner_id"));



CREATE POLICY "communities_insert" ON "public"."communities" FOR INSERT WITH CHECK (("auth"."uid"() = "owner_id"));



CREATE POLICY "communities_select" ON "public"."communities" FOR SELECT USING (true);



CREATE POLICY "communities_update" ON "public"."communities" FOR UPDATE USING (("auth"."uid"() = "owner_id"));



ALTER TABLE "public"."community_courses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_courses_delete" ON "public"."community_courses" FOR DELETE USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "community_courses_insert" ON "public"."community_courses" FOR INSERT WITH CHECK (("auth"."uid"() = "creator_id"));



CREATE POLICY "community_courses_select" ON "public"."community_courses" FOR SELECT USING (true);



CREATE POLICY "community_courses_update" ON "public"."community_courses" FOR UPDATE USING (("auth"."uid"() = "creator_id"));



CREATE POLICY "community_inbox_conv_insert_participant" ON "public"."community_inbox_conversations" FOR INSERT WITH CHECK (((("auth"."uid"() = "user_low") OR ("auth"."uid"() = "user_high")) AND (EXISTS ( SELECT 1
   FROM "public"."community_memberships" "m"
  WHERE (("m"."community_id" = "community_inbox_conversations"."community_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."status" = 'active'::"text"))))));



CREATE POLICY "community_inbox_conv_select_participant" ON "public"."community_inbox_conversations" FOR SELECT USING (((("auth"."uid"() = "user_low") OR ("auth"."uid"() = "user_high")) AND (EXISTS ( SELECT 1
   FROM "public"."community_memberships" "m"
  WHERE (("m"."community_id" = "community_inbox_conversations"."community_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."status" = 'active'::"text"))))));



CREATE POLICY "community_inbox_conv_update_participant" ON "public"."community_inbox_conversations" FOR UPDATE USING ((("auth"."uid"() = "user_low") OR ("auth"."uid"() = "user_high")));



ALTER TABLE "public"."community_inbox_conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_inbox_conversations_insert" ON "public"."community_inbox_conversations" FOR INSERT WITH CHECK ((("auth"."uid"() = "user_low") OR ("auth"."uid"() = "user_high")));



CREATE POLICY "community_inbox_conversations_select" ON "public"."community_inbox_conversations" FOR SELECT USING ((("auth"."uid"() = "user_low") OR ("auth"."uid"() = "user_high")));



ALTER TABLE "public"."community_inbox_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_inbox_messages_delete" ON "public"."community_inbox_messages" FOR DELETE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "community_inbox_messages_insert" ON "public"."community_inbox_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "community_inbox_messages_select" ON "public"."community_inbox_messages" FOR SELECT USING (("auth"."uid"() IN ( SELECT "community_inbox_conversations"."user_low"
   FROM "public"."community_inbox_conversations"
  WHERE ("community_inbox_conversations"."id" = "community_inbox_messages"."conversation_id")
UNION
 SELECT "community_inbox_conversations"."user_high"
   FROM "public"."community_inbox_conversations"
  WHERE ("community_inbox_conversations"."id" = "community_inbox_messages"."conversation_id"))));



CREATE POLICY "community_inbox_msg_insert_sender" ON "public"."community_inbox_messages" FOR INSERT WITH CHECK ((("sender_id" = "auth"."uid"()) AND (EXISTS ( SELECT 1
   FROM "public"."community_inbox_conversations" "c"
  WHERE (("c"."id" = "community_inbox_messages"."conversation_id") AND (("c"."user_low" = "auth"."uid"()) OR ("c"."user_high" = "auth"."uid"())))))));



CREATE POLICY "community_inbox_msg_select_participant" ON "public"."community_inbox_messages" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."community_inbox_conversations" "c"
  WHERE (("c"."id" = "community_inbox_messages"."conversation_id") AND (("c"."user_low" = "auth"."uid"()) OR ("c"."user_high" = "auth"."uid"()))))));



ALTER TABLE "public"."community_memberships" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_memberships_delete" ON "public"."community_memberships" FOR DELETE USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_memberships"."community_id")))));



CREATE POLICY "community_memberships_select" ON "public"."community_memberships" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_memberships"."community_id")))));



ALTER TABLE "public"."community_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_messages_delete" ON "public"."community_messages" FOR DELETE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "community_messages_insert" ON "public"."community_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "community_messages_select" ON "public"."community_messages" FOR SELECT USING ((("auth"."uid"() IN ( SELECT "community_memberships"."user_id"
   FROM "public"."community_memberships"
  WHERE ("community_memberships"."community_id" = "community_messages"."community_id"))) OR ("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_messages"."community_id")))));



CREATE POLICY "community_messages_update" ON "public"."community_messages" FOR UPDATE USING (("auth"."uid"() = "sender_id"));



ALTER TABLE "public"."community_payments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_payments_select" ON "public"."community_payments" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_payments"."community_id")))));



ALTER TABLE "public"."community_post_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_post_comments_delete" ON "public"."community_post_comments" FOR DELETE USING (("auth"."uid"() = "author_id"));



CREATE POLICY "community_post_comments_insert" ON "public"."community_post_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "community_post_comments_select" ON "public"."community_post_comments" FOR SELECT USING (true);



CREATE POLICY "community_post_comments_update" ON "public"."community_post_comments" FOR UPDATE USING (("auth"."uid"() = "author_id"));



ALTER TABLE "public"."community_post_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_post_likes_delete" ON "public"."community_post_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "community_post_likes_insert" ON "public"."community_post_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "community_post_likes_select" ON "public"."community_post_likes" FOR SELECT USING (true);



ALTER TABLE "public"."community_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_posts_delete" ON "public"."community_posts" FOR DELETE USING ((("auth"."uid"() = "author_id") OR ("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_posts"."community_id")))));



CREATE POLICY "community_posts_insert" ON "public"."community_posts" FOR INSERT WITH CHECK (("auth"."uid"() = "author_id"));



CREATE POLICY "community_posts_select" ON "public"."community_posts" FOR SELECT USING (true);



CREATE POLICY "community_posts_update" ON "public"."community_posts" FOR UPDATE USING ((("auth"."uid"() = "author_id") OR ("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_posts"."community_id")))));



ALTER TABLE "public"."community_saved_posts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_saved_posts_delete" ON "public"."community_saved_posts" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "community_saved_posts_insert" ON "public"."community_saved_posts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "community_saved_posts_select" ON "public"."community_saved_posts" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."community_tasks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "community_tasks_delete" ON "public"."community_tasks" FOR DELETE USING (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_tasks"."community_id"))));



CREATE POLICY "community_tasks_insert" ON "public"."community_tasks" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_tasks"."community_id"))));



CREATE POLICY "community_tasks_select" ON "public"."community_tasks" FOR SELECT USING (true);



CREATE POLICY "community_tasks_update" ON "public"."community_tasks" FOR UPDATE USING (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "community_tasks"."community_id"))));



ALTER TABLE "public"."conversation_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversation_messages_delete" ON "public"."conversation_messages" FOR DELETE USING (("auth"."uid"() = "sender_id"));



CREATE POLICY "conversation_messages_insert" ON "public"."conversation_messages" FOR INSERT WITH CHECK (("auth"."uid"() = "sender_id"));



CREATE POLICY "conversation_messages_select" ON "public"."conversation_messages" FOR SELECT USING (("auth"."uid"() IN ( SELECT "conversations"."buyer_id"
   FROM "public"."conversations"
  WHERE ("conversations"."id" = "conversation_messages"."conversation_id")
UNION
 SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = ( SELECT "conversations"."vendor_id"
           FROM "public"."conversations"
          WHERE ("conversations"."id" = "conversation_messages"."conversation_id"))))));



ALTER TABLE "public"."conversations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "conversations_insert" ON "public"."conversations" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "conversations_select" ON "public"."conversations" FOR SELECT USING ((("auth"."uid"() = "buyer_id") OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "conversations"."vendor_id")))));



ALTER TABLE "public"."course_lessons" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_lessons_delete" ON "public"."course_lessons" FOR DELETE USING (("auth"."uid"() = ( SELECT "community_courses"."creator_id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."id" = "course_lessons"."course_id"))));



CREATE POLICY "course_lessons_insert" ON "public"."course_lessons" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "community_courses"."creator_id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."id" = "course_lessons"."course_id"))));



CREATE POLICY "course_lessons_select" ON "public"."course_lessons" FOR SELECT USING (true);



CREATE POLICY "course_lessons_update" ON "public"."course_lessons" FOR UPDATE USING (("auth"."uid"() = ( SELECT "community_courses"."creator_id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."id" = "course_lessons"."course_id"))));



ALTER TABLE "public"."course_modules" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "course_modules_delete" ON "public"."course_modules" FOR DELETE USING (("auth"."uid"() = ( SELECT "community_courses"."creator_id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."id" = "course_modules"."course_id"))));



CREATE POLICY "course_modules_insert" ON "public"."course_modules" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "community_courses"."creator_id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."id" = "course_modules"."course_id"))));



CREATE POLICY "course_modules_select" ON "public"."course_modules" FOR SELECT USING (true);



CREATE POLICY "course_modules_update" ON "public"."course_modules" FOR UPDATE USING (("auth"."uid"() = ( SELECT "community_courses"."creator_id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."id" = "course_modules"."course_id"))));



CREATE POLICY "courses_visible_to_members" ON "public"."community_courses" FOR SELECT USING ((("is_published" = true) AND (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ((NOT "communities"."is_private") OR ("communities"."owner_id" = "auth"."uid"())))) OR ("community_id" IN ( SELECT "community_memberships"."community_id"
   FROM "public"."community_memberships"
  WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text")))))));



CREATE POLICY "creators_manage_courses" ON "public"."community_courses" USING ((("creator_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"()))))) WITH CHECK ((("creator_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))));



CREATE POLICY "creators_manage_own_videos" ON "public"."short_videos" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "creators_manage_tasks" ON "public"."community_tasks" USING ((("creator_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"()))))) WITH CHECK ((("creator_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))));



CREATE POLICY "creators_read_clicks" ON "public"."short_video_clicks" FOR SELECT USING (("video_id" IN ( SELECT "short_videos"."id"
   FROM "public"."short_videos"
  WHERE ("short_videos"."user_id" = "auth"."uid"()))));



CREATE POLICY "creators_read_views" ON "public"."short_video_views" FOR SELECT USING ((("video_id" IN ( SELECT "short_videos"."id"
   FROM "public"."short_videos"
  WHERE ("short_videos"."user_id" = "auth"."uid"()))) OR ("viewer_id" = "auth"."uid"())));



CREATE POLICY "creators_view_own_earnings" ON "public"."short_video_earnings" FOR SELECT USING (("creator_id" IN ( SELECT "influencers"."id"
   FROM "public"."influencers"
  WHERE ("influencers"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."digital_access" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."exchange_rate_logs" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exchange_rate_logs_select" ON "public"."exchange_rate_logs" FOR SELECT USING (true);



ALTER TABLE "public"."failed_wallet_credits" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."influencers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "influencers_delete" ON "public"."influencers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "influencers_insert" ON "public"."influencers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "influencers_select" ON "public"."influencers" FOR SELECT USING (true);



CREATE POLICY "influencers_update" ON "public"."influencers" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "leaderboard_public_read" ON "public"."member_points" FOR SELECT USING ((("community_id" IN ( SELECT "community_memberships"."community_id"
   FROM "public"."community_memberships"
  WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text")))) OR ("user_id" = "auth"."uid"())));



ALTER TABLE "public"."lesson_progress" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lesson_progress_insert" ON "public"."lesson_progress" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "lesson_progress_select" ON "public"."lesson_progress" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "lesson_progress_update" ON "public"."lesson_progress" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "lessons_follow_course_access" ON "public"."course_lessons" FOR SELECT USING ((("course_id" IN ( SELECT "community_courses"."id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."is_published" = true))) OR ("course_id" IN ( SELECT "community_courses"."id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."creator_id" = "auth"."uid"())))));



CREATE POLICY "likes_public_read" ON "public"."short_video_likes" FOR SELECT USING (true);



ALTER TABLE "public"."member_points" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "member_points_insert" ON "public"."member_points" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "member_points_select" ON "public"."member_points" FOR SELECT USING (true);



CREATE POLICY "member_points_update" ON "public"."member_points" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "members_create_comments" ON "public"."community_post_comments" FOR INSERT WITH CHECK ((("author_id" = "auth"."uid"()) AND ("post_id" IN ( SELECT "community_posts"."id"
   FROM "public"."community_posts"
  WHERE ("community_posts"."community_id" IN ( SELECT "community_memberships"."community_id"
           FROM "public"."community_memberships"
          WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text"))))))));



CREATE POLICY "memberships_delete_own_or_owner" ON "public"."community_memberships" FOR DELETE USING ((("user_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))));



CREATE POLICY "memberships_insert_self_free_only" ON "public"."community_memberships" FOR INSERT WITH CHECK ((("user_id" = "auth"."uid"()) AND ((("plan_type" = 'free'::"text") AND ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."is_free" = true)))) OR (EXISTS ( SELECT 1
   FROM "public"."community_payments" "p"
  WHERE (("p"."community_id" = "community_memberships"."community_id") AND ("p"."user_id" = "auth"."uid"()) AND ("p"."status" = 'completed'::"text") AND ("p"."plan_type" = "community_memberships"."plan_type") AND ("p"."created_at" > ("now"() - '00:10:00'::interval))))))));



CREATE POLICY "memberships_select_own_or_owner" ON "public"."community_memberships" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))));



CREATE POLICY "memberships_update_own_or_owner" ON "public"."community_memberships" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR ("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))));



CREATE POLICY "modules_follow_course_access" ON "public"."course_modules" FOR SELECT USING ((("course_id" IN ( SELECT "community_courses"."id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."is_published" = true))) OR ("course_id" IN ( SELECT "community_courses"."id"
   FROM "public"."community_courses"
  WHERE ("community_courses"."creator_id" = "auth"."uid"())))));



ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "notifications_delete" ON "public"."notifications" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_insert_service" ON "public"."notifications" FOR INSERT WITH CHECK (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "notifications_select" ON "public"."notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "notifications_update" ON "public"."notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."order_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_items_insert_for_direct_checkout" ON "public"."order_items" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."orders" "o"
  WHERE (("o"."id" = "order_items"."order_id") AND ("o"."buyer_id" = "auth"."uid"()) AND ("o"."status" = 'checkout_direct'::"public"."order_status") AND ("o"."payment_status" = 'pending'::"public"."payment_status")))));



CREATE POLICY "order_items_select" ON "public"."order_items" FOR SELECT USING ((("auth"."uid"() = ( SELECT "orders"."buyer_id"
   FROM "public"."orders"
  WHERE ("orders"."id" = "order_items"."order_id"))) OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "order_items"."vendor_id")))));



CREATE POLICY "order_items_update_vendor_only" ON "public"."order_items" FOR UPDATE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "order_items"."vendor_id"))));



ALTER TABLE "public"."order_payment_status_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."order_status_history" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "order_status_history_select" ON "public"."order_status_history" FOR SELECT USING ((("auth"."uid"() = ( SELECT "orders"."buyer_id"
   FROM "public"."orders"
  WHERE ("orders"."id" = "order_status_history"."order_id"))) OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = ( SELECT "orders"."vendor_id"
           FROM "public"."orders"
          WHERE ("orders"."id" = "order_status_history"."order_id")))))));



ALTER TABLE "public"."orders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "orders_insert_buyer_only_for_direct_checkout" ON "public"."orders" FOR INSERT WITH CHECK ((("auth"."uid"() = "buyer_id") AND ("status" = 'checkout_direct'::"public"."order_status") AND ("payment_status" = 'pending'::"public"."payment_status") AND ("paid_at" IS NULL) AND ("cj_order_id" IS NULL) AND ("cj_supplier_cost" IS NULL) AND ("shipped_at" IS NULL) AND ("delivered_at" IS NULL) AND ("cancelled_at" IS NULL)));



CREATE POLICY "orders_select" ON "public"."orders" FOR SELECT USING ((("auth"."uid"() = "buyer_id") OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "orders"."vendor_id")))));



CREATE POLICY "owners_manage_rooms" ON "public"."rooms" USING (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))) WITH CHECK (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"()))));



CREATE POLICY "owners_manage_spaces" ON "public"."spaces" USING (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"())))) WITH CHECK (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"()))));



CREATE POLICY "owners_view_community_payments" ON "public"."community_payments" FOR SELECT USING (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ("communities"."owner_id" = "auth"."uid"()))));



CREATE POLICY "participants_view_own" ON "public"."ugc_campaign_participants" FOR SELECT USING (("influencer_id" IN ( SELECT "influencers"."id"
   FROM "public"."influencers"
  WHERE ("influencers"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "payouts_insert" ON "public"."payouts" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "payouts_select" ON "public"."payouts" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "payouts_update" ON "public"."payouts" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."platform_secrets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."platform_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "platform_settings_select" ON "public"."platform_settings" FOR SELECT USING (true);



CREATE POLICY "platform_settings_select_public" ON "public"."platform_settings" FOR SELECT TO "anon", "authenticated" USING ((("key" !~~ '%credentials%'::"text") AND ("key" !~~ '%secret%'::"text") AND ("key" !~~ '%token%'::"text") AND ("key" !~~ '%api_key%'::"text")));



CREATE POLICY "post_comments_visible_to_members" ON "public"."community_post_comments" FOR SELECT USING (("post_id" IN ( SELECT "community_posts"."id"
   FROM "public"."community_posts"
  WHERE (("community_posts"."community_id" IN ( SELECT "community_memberships"."community_id"
           FROM "public"."community_memberships"
          WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text")))) OR ("community_posts"."community_id" IN ( SELECT "communities"."id"
           FROM "public"."communities"
          WHERE ("communities"."owner_id" = "auth"."uid"())))))));



CREATE POLICY "post_likes_public_read" ON "public"."community_post_likes" FOR SELECT USING (true);



ALTER TABLE "public"."product_categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_categories_select" ON "public"."product_categories" FOR SELECT USING (true);



ALTER TABLE "public"."product_shipping_options" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_shipping_public_read" ON "public"."product_shipping_options" FOR SELECT USING (("is_active" = true));



ALTER TABLE "public"."product_variants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_variants_delete" ON "public"."product_variants" FOR DELETE USING (("auth"."uid"() = ( SELECT "v"."user_id"
   FROM ("public"."vendors" "v"
     JOIN "public"."products" "p" ON (("p"."vendor_id" = "v"."id")))
  WHERE ("p"."id" = "product_variants"."product_id"))));



CREATE POLICY "product_variants_insert" ON "public"."product_variants" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "v"."user_id"
   FROM ("public"."vendors" "v"
     JOIN "public"."products" "p" ON (("p"."vendor_id" = "v"."id")))
  WHERE ("p"."id" = "product_variants"."product_id"))));



CREATE POLICY "product_variants_select" ON "public"."product_variants" FOR SELECT USING (true);



CREATE POLICY "product_variants_update" ON "public"."product_variants" FOR UPDATE USING (("auth"."uid"() = ( SELECT "v"."user_id"
   FROM ("public"."vendors" "v"
     JOIN "public"."products" "p" ON (("p"."vendor_id" = "v"."id")))
  WHERE ("p"."id" = "product_variants"."product_id"))));



ALTER TABLE "public"."product_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "product_views_insert" ON "public"."product_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "product_views_select" ON "public"."product_views" FOR SELECT USING ((("auth"."uid"() = "user_id") OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = ( SELECT "products"."vendor_id"
           FROM "public"."products"
          WHERE ("products"."id" = "product_views"."product_id")))))));



ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_delete" ON "public"."products" FOR DELETE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "products"."vendor_id"))));



CREATE POLICY "products_insert" ON "public"."products" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "products"."vendor_id"))));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING (((("status" = 'active'::"public"."product_status") AND ("is_active" = true) AND ("deleted_at" IS NULL)) OR ("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"())))));



CREATE POLICY "products_update" ON "public"."products" FOR UPDATE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "products"."vendor_id"))));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_delete" ON "public"."profiles" FOR DELETE USING (("auth"."uid"() = "id"));



CREATE POLICY "profiles_insert" ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "profiles_update" ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "reporters_view_own_reports" ON "public"."ugc_reports" FOR SELECT USING (("reporter_id" = "auth"."uid"()));



ALTER TABLE "public"."reviews" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reviews_delete" ON "public"."reviews" FOR DELETE USING (("auth"."uid"() = "buyer_id"));



CREATE POLICY "reviews_insert" ON "public"."reviews" FOR INSERT WITH CHECK (("auth"."uid"() = "buyer_id"));



CREATE POLICY "reviews_select" ON "public"."reviews" FOR SELECT USING (true);



CREATE POLICY "reviews_update" ON "public"."reviews" FOR UPDATE USING (("auth"."uid"() = "buyer_id"));



ALTER TABLE "public"."rooms" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "rooms_delete" ON "public"."rooms" FOR DELETE USING (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "rooms"."community_id"))));



CREATE POLICY "rooms_insert" ON "public"."rooms" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "rooms"."community_id"))));



CREATE POLICY "rooms_select" ON "public"."rooms" FOR SELECT USING (true);



CREATE POLICY "rooms_update" ON "public"."rooms" FOR UPDATE USING (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "rooms"."community_id"))));



CREATE POLICY "rooms_visible_to_members" ON "public"."rooms" FOR SELECT USING ((("is_active" = true) AND (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ((NOT "communities"."is_private") OR ("communities"."owner_id" = "auth"."uid"())))) OR ("community_id" IN ( SELECT "community_memberships"."community_id"
   FROM "public"."community_memberships"
  WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text")))))));



CREATE POLICY "service_role_insert_order_status_history" ON "public"."order_status_history" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_insert_payment_history" ON "public"."order_payment_status_history" FOR INSERT TO "service_role" WITH CHECK (true);



CREATE POLICY "service_role_manage_shipping" ON "public"."product_shipping_options" USING (("auth"."role"() = 'service_role'::"text"));



ALTER TABLE "public"."shopify_credentials" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "shopify_credentials_delete" ON "public"."shopify_credentials" FOR DELETE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "shopify_credentials"."vendor_id"))));



CREATE POLICY "shopify_credentials_insert" ON "public"."shopify_credentials" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "shopify_credentials"."vendor_id"))));



CREATE POLICY "shopify_credentials_select" ON "public"."shopify_credentials" FOR SELECT USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "shopify_credentials"."vendor_id"))));



CREATE POLICY "shopify_credentials_update" ON "public"."shopify_credentials" FOR UPDATE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "shopify_credentials"."vendor_id"))));



ALTER TABLE "public"."short_video_clicks" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "short_video_clicks_insert" ON "public"."short_video_clicks" FOR INSERT WITH CHECK (true);



CREATE POLICY "short_video_clicks_select" ON "public"."short_video_clicks" FOR SELECT USING (true);



ALTER TABLE "public"."short_video_comments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "short_video_comments_delete" ON "public"."short_video_comments" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "short_video_comments_insert" ON "public"."short_video_comments" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "short_video_comments_select" ON "public"."short_video_comments" FOR SELECT USING (true);



ALTER TABLE "public"."short_video_earnings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "short_video_earnings_select" ON "public"."short_video_earnings" FOR SELECT USING (("auth"."uid"() = ( SELECT "influencers"."user_id"
   FROM "public"."influencers"
  WHERE ("influencers"."id" = "short_video_earnings"."creator_id"))));



ALTER TABLE "public"."short_video_likes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "short_video_likes_delete" ON "public"."short_video_likes" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "short_video_likes_insert" ON "public"."short_video_likes" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "short_video_likes_select" ON "public"."short_video_likes" FOR SELECT USING (true);



ALTER TABLE "public"."short_video_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "short_video_views_insert" ON "public"."short_video_views" FOR INSERT WITH CHECK (true);



CREATE POLICY "short_video_views_select" ON "public"."short_video_views" FOR SELECT USING (true);



ALTER TABLE "public"."short_videos" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "short_videos_delete" ON "public"."short_videos" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "short_videos_insert" ON "public"."short_videos" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "short_videos_select" ON "public"."short_videos" FOR SELECT USING (true);



CREATE POLICY "short_videos_update" ON "public"."short_videos" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "snapshots_visible_to_owners" ON "public"."ugc_view_snapshots" FOR SELECT USING ((("submission_id" IN ( SELECT "ugc_submissions"."id"
   FROM "public"."ugc_submissions"
  WHERE ("ugc_submissions"."influencer_id" IN ( SELECT "influencers"."id"
           FROM "public"."influencers"
          WHERE ("influencers"."user_id" = "auth"."uid"()))))) OR ("submission_id" IN ( SELECT "s"."id"
   FROM ("public"."ugc_submissions" "s"
     JOIN "public"."ugc_campaigns" "c" ON (("c"."id" = "s"."campaign_id")))
  WHERE ("c"."brand_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."spaces" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "spaces_delete" ON "public"."spaces" FOR DELETE USING (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "spaces"."community_id"))));



CREATE POLICY "spaces_insert" ON "public"."spaces" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "spaces"."community_id"))));



CREATE POLICY "spaces_select" ON "public"."spaces" FOR SELECT USING (true);



CREATE POLICY "spaces_update" ON "public"."spaces" FOR UPDATE USING (("auth"."uid"() = ( SELECT "communities"."owner_id"
   FROM "public"."communities"
  WHERE ("communities"."id" = "spaces"."community_id"))));



CREATE POLICY "spaces_visible_to_members" ON "public"."spaces" FOR SELECT USING ((("is_active" = true) AND (("community_id" IN ( SELECT "communities"."id"
   FROM "public"."communities"
  WHERE ((NOT "communities"."is_private") OR ("communities"."owner_id" = "auth"."uid"())))) OR ("community_id" IN ( SELECT "community_memberships"."community_id"
   FROM "public"."community_memberships"
  WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text")))))));



CREATE POLICY "stock_history_service_write" ON "public"."variant_stock_history" USING (("auth"."role"() = 'service_role'::"text"));



CREATE POLICY "stock_history_vendor_read" ON "public"."variant_stock_history" FOR SELECT USING (("product_id" IN ( SELECT "p"."id"
   FROM ("public"."products" "p"
     JOIN "public"."vendors" "v" ON (("v"."id" = "p"."vendor_id")))
  WHERE ("v"."user_id" = "auth"."uid"()))));



CREATE POLICY "submission_media_visible_to_owners" ON "public"."ugc_submission_media" FOR SELECT USING ((("submission_id" IN ( SELECT "ugc_submissions"."id"
   FROM "public"."ugc_submissions"
  WHERE ("ugc_submissions"."influencer_id" IN ( SELECT "influencers"."id"
           FROM "public"."influencers"
          WHERE ("influencers"."user_id" = "auth"."uid"()))))) OR ("submission_id" IN ( SELECT "s"."id"
   FROM ("public"."ugc_submissions" "s"
     JOIN "public"."ugc_campaigns" "c" ON (("c"."id" = "s"."campaign_id")))
  WHERE ("c"."brand_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."task_completions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "task_completions_insert" ON "public"."task_completions" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "task_completions_select" ON "public"."task_completions" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "task_completions_select_own_or_staff" ON "public"."task_completions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM ("public"."community_tasks" "t"
     JOIN "public"."community_memberships" "m" ON (("m"."community_id" = "t"."community_id")))
  WHERE (("t"."id" = "task_completions"."task_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."status" = 'active'::"text") AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'moderator'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."community_tasks" "t"
     JOIN "public"."communities" "c" ON (("c"."id" = "t"."community_id")))
  WHERE (("t"."id" = "task_completions"."task_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "task_completions_update" ON "public"."task_completions" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "task_completions_update_reviewer" ON "public"."task_completions" FOR UPDATE USING (((EXISTS ( SELECT 1
   FROM ("public"."community_tasks" "t"
     JOIN "public"."community_memberships" "m" ON (("m"."community_id" = "t"."community_id")))
  WHERE (("t"."id" = "task_completions"."task_id") AND ("m"."user_id" = "auth"."uid"()) AND ("m"."status" = 'active'::"text") AND ("m"."role" = ANY (ARRAY['owner'::"text", 'admin'::"text", 'moderator'::"text"]))))) OR (EXISTS ( SELECT 1
   FROM ("public"."community_tasks" "t"
     JOIN "public"."communities" "c" ON (("c"."id" = "t"."community_id")))
  WHERE (("t"."id" = "task_completions"."task_id") AND ("c"."owner_id" = "auth"."uid"()))))));



CREATE POLICY "tasks_visible_to_members" ON "public"."community_tasks" FOR SELECT USING ((("is_active" = true) AND ("community_id" IN ( SELECT "community_memberships"."community_id"
   FROM "public"."community_memberships"
  WHERE (("community_memberships"."user_id" = "auth"."uid"()) AND ("community_memberships"."status" = 'active'::"text"))))));



ALTER TABLE "public"."transactions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "transactions_select" ON "public"."transactions" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."ugc_campaign_escrow" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ugc_campaign_media" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ugc_campaign_media_public_read" ON "public"."ugc_campaign_media" FOR SELECT USING ((("campaign_id" IN ( SELECT "ugc_campaigns"."id"
   FROM "public"."ugc_campaigns"
  WHERE ("ugc_campaigns"."status" = 'active'::"public"."ugc_campaign_status"))) OR ("campaign_id" IN ( SELECT "ugc_campaigns"."id"
   FROM "public"."ugc_campaigns"
  WHERE ("ugc_campaigns"."brand_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"())))))));



ALTER TABLE "public"."ugc_campaign_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ugc_campaigns" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ugc_campaigns_delete" ON "public"."ugc_campaigns" FOR DELETE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "ugc_campaigns"."brand_id"))));



CREATE POLICY "ugc_campaigns_insert" ON "public"."ugc_campaigns" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "ugc_campaigns"."brand_id"))));



CREATE POLICY "ugc_campaigns_select" ON "public"."ugc_campaigns" FOR SELECT USING (true);



CREATE POLICY "ugc_campaigns_update" ON "public"."ugc_campaigns" FOR UPDATE USING (("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = "ugc_campaigns"."brand_id"))));



ALTER TABLE "public"."ugc_payouts" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ugc_payouts_select" ON "public"."ugc_payouts" FOR SELECT USING (("auth"."uid"() = ( SELECT "influencers"."user_id"
   FROM "public"."influencers"
  WHERE ("influencers"."id" = "ugc_payouts"."influencer_id"))));



CREATE POLICY "ugc_payouts_visible_to_influencer" ON "public"."ugc_payouts" FOR SELECT USING (("influencer_id" IN ( SELECT "influencers"."id"
   FROM "public"."influencers"
  WHERE ("influencers"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."ugc_reports" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ugc_submission_media" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."ugc_submissions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "ugc_submissions_insert" ON "public"."ugc_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = ( SELECT "influencers"."user_id"
   FROM "public"."influencers"
  WHERE ("influencers"."id" = "ugc_submissions"."influencer_id"))));



CREATE POLICY "ugc_submissions_select" ON "public"."ugc_submissions" FOR SELECT USING ((("auth"."uid"() = ( SELECT "influencers"."user_id"
   FROM "public"."influencers"
  WHERE ("influencers"."id" = "ugc_submissions"."influencer_id"))) OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = ( SELECT "ugc_campaigns"."brand_id"
           FROM "public"."ugc_campaigns"
          WHERE ("ugc_campaigns"."id" = "ugc_submissions"."campaign_id")))))));



CREATE POLICY "ugc_submissions_update" ON "public"."ugc_submissions" FOR UPDATE USING ((("auth"."uid"() = ( SELECT "influencers"."user_id"
   FROM "public"."influencers"
  WHERE ("influencers"."id" = "ugc_submissions"."influencer_id"))) OR ("auth"."uid"() = ( SELECT "vendors"."user_id"
   FROM "public"."vendors"
  WHERE ("vendors"."id" = ( SELECT "ugc_campaigns"."brand_id"
           FROM "public"."ugc_campaigns"
          WHERE ("ugc_campaigns"."id" = "ugc_submissions"."campaign_id")))))));



ALTER TABLE "public"."ugc_view_snapshots" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_2fa_secrets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_roles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_roles_delete" ON "public"."user_roles" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_roles_insert" ON "public"."user_roles" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "user_roles_select" ON "public"."user_roles" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "user_roles_update" ON "public"."user_roles" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "users_create_reports" ON "public"."ugc_reports" FOR INSERT WITH CHECK (("reporter_id" = "auth"."uid"()));



CREATE POLICY "users_manage_own_2fa" ON "public"."user_2fa_secrets" USING (("auth"."uid"() = "user_id")) WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "users_manage_own_comments" ON "public"."short_video_comments" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_manage_own_likes" ON "public"."community_post_likes" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_manage_own_likes" ON "public"."short_video_likes" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_manage_own_progress" ON "public"."lesson_progress" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_manage_own_saved_posts" ON "public"."community_saved_posts" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "users_view_own_payments" ON "public"."community_payments" FOR SELECT USING (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."variant_stock_history" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."vendor_followers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendor_followers_delete" ON "public"."vendor_followers" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vendor_followers_insert" ON "public"."vendor_followers" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "vendor_followers_select" ON "public"."vendor_followers" FOR SELECT USING (true);



CREATE POLICY "vendor_owns_subscription" ON "public"."webhook_subscriptions" USING (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"())))) WITH CHECK (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



ALTER TABLE "public"."vendors" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "vendors_delete" ON "public"."vendors" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vendors_insert" ON "public"."vendors" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "vendors_manage_own_shipping" ON "public"."product_shipping_options" USING (("product_id" IN ( SELECT "p"."id"
   FROM ("public"."products" "p"
     JOIN "public"."vendors" "v" ON (("v"."id" = "p"."vendor_id")))
  WHERE ("v"."user_id" = "auth"."uid"()))));



CREATE POLICY "vendors_manage_own_shopify_creds" ON "public"."shopify_credentials" USING (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"())))) WITH CHECK (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



CREATE POLICY "vendors_select" ON "public"."vendors" FOR SELECT USING (true);



CREATE POLICY "vendors_select_own_payment_history" ON "public"."order_payment_status_history" FOR SELECT USING (("order_id" IN ( SELECT "orders"."id"
   FROM "public"."orders"
  WHERE ("orders"."vendor_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"()))))));



CREATE POLICY "vendors_update" ON "public"."vendors" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "vendors_view_own_failed_credits" ON "public"."failed_wallet_credits" FOR SELECT USING (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



CREATE POLICY "vendors_view_own_product_views" ON "public"."product_views" FOR SELECT USING (("product_id" IN ( SELECT "p"."id"
   FROM "public"."products" "p"
  WHERE ("p"."vendor_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"()))))));



CREATE POLICY "vendors_view_own_shopify_creds" ON "public"."shopify_credentials" FOR SELECT USING (("vendor_id" IN ( SELECT "vendors"."id"
   FROM "public"."vendors"
  WHERE ("vendors"."user_id" = "auth"."uid"()))));



CREATE POLICY "vendors_view_their_order_history" ON "public"."order_status_history" FOR SELECT USING (("order_id" IN ( SELECT "o"."id"
   FROM "public"."orders" "o"
  WHERE ("o"."vendor_id" IN ( SELECT "vendors"."id"
           FROM "public"."vendors"
          WHERE ("vendors"."user_id" = "auth"."uid"()))))));



ALTER TABLE "public"."wallets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wallets_insert" ON "public"."wallets" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wallets_select" ON "public"."wallets" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wallets_update" ON "public"."wallets" FOR UPDATE USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."webhook_events" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."webhook_subscriptions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."wishlists" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "wishlists_delete" ON "public"."wishlists" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "wishlists_insert" ON "public"."wishlists" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "wishlists_select" ON "public"."wishlists" FOR SELECT USING (("auth"."uid"() = "user_id"));



REVOKE USAGE ON SCHEMA "public" FROM PUBLIC;
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT ALL ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."add_to_cart"("p_product_id" "uuid", "p_variant_id" "uuid", "p_quantity" integer, "p_affiliate_link_id" "uuid") TO "authenticated";



REVOKE ALL ON FUNCTION "public"."decrypt_token"("ciphertext" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."decrypt_token"("ciphertext" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."encrypt_token"("plaintext" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."encrypt_token"("plaintext" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_or_create_community_inbox_conversation"("p_community_id" "uuid", "p_peer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_or_create_community_inbox_conversation"("p_community_id" "uuid", "p_peer_id" "uuid") TO "authenticated";



GRANT ALL ON FUNCTION "public"."get_user_roles"("lookup_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_roles"("lookup_user_id" "uuid") TO "anon";



GRANT ALL ON FUNCTION "public"."increment_affiliate_clicks"("p_affiliate_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_link_clicks"("p_link_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."merge_variant_source_metadata"("p_cj_vid" "text", "p_patch" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."toggle_community_message_reaction"("p_message_id" "uuid", "p_emoji" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."toggle_community_message_reaction"("p_message_id" "uuid", "p_emoji" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."toggle_community_message_reaction"("p_message_id" "uuid", "p_emoji" "text") TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_clicks" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_clicks" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_commissions" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_commissions" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_commissions" TO "service_role";



GRANT ALL ON TABLE "public"."affiliate_links" TO "anon";
GRANT ALL ON TABLE "public"."affiliate_links" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliate_links" TO "service_role";



GRANT ALL ON TABLE "public"."affiliates" TO "anon";
GRANT ALL ON TABLE "public"."affiliates" TO "authenticated";
GRANT ALL ON TABLE "public"."affiliates" TO "service_role";



GRANT ALL ON TABLE "public"."blog_posts" TO "anon";
GRANT ALL ON TABLE "public"."blog_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."blog_posts" TO "service_role";



GRANT ALL ON TABLE "public"."buying_lead_offers" TO "anon";
GRANT ALL ON TABLE "public"."buying_lead_offers" TO "authenticated";
GRANT ALL ON TABLE "public"."buying_lead_offers" TO "service_role";



GRANT ALL ON TABLE "public"."buying_requests" TO "anon";
GRANT ALL ON TABLE "public"."buying_requests" TO "authenticated";
GRANT ALL ON TABLE "public"."buying_requests" TO "service_role";



GRANT ALL ON TABLE "public"."cart_items" TO "anon";
GRANT ALL ON TABLE "public"."cart_items" TO "authenticated";
GRANT ALL ON TABLE "public"."cart_items" TO "service_role";



GRANT ALL ON TABLE "public"."carts" TO "anon";
GRANT ALL ON TABLE "public"."carts" TO "authenticated";
GRANT ALL ON TABLE "public"."carts" TO "service_role";



GRANT ALL ON TABLE "public"."cj_product_map" TO "anon";
GRANT ALL ON TABLE "public"."cj_product_map" TO "authenticated";
GRANT ALL ON TABLE "public"."cj_product_map" TO "service_role";



GRANT ALL ON TABLE "public"."cj_sync_logs" TO "anon";
GRANT ALL ON TABLE "public"."cj_sync_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."cj_sync_logs" TO "service_role";



GRANT ALL ON TABLE "public"."communities" TO "anon";
GRANT ALL ON TABLE "public"."communities" TO "authenticated";
GRANT ALL ON TABLE "public"."communities" TO "service_role";



GRANT ALL ON TABLE "public"."community_courses" TO "anon";
GRANT ALL ON TABLE "public"."community_courses" TO "authenticated";
GRANT ALL ON TABLE "public"."community_courses" TO "service_role";



GRANT ALL ON TABLE "public"."community_inbox_conversations" TO "anon";
GRANT ALL ON TABLE "public"."community_inbox_conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."community_inbox_conversations" TO "service_role";



GRANT ALL ON TABLE "public"."community_inbox_messages" TO "anon";
GRANT ALL ON TABLE "public"."community_inbox_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."community_inbox_messages" TO "service_role";



GRANT ALL ON TABLE "public"."community_memberships" TO "anon";
GRANT ALL ON TABLE "public"."community_memberships" TO "authenticated";
GRANT ALL ON TABLE "public"."community_memberships" TO "service_role";



GRANT ALL ON TABLE "public"."community_messages" TO "anon";
GRANT ALL ON TABLE "public"."community_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."community_messages" TO "service_role";



GRANT ALL ON TABLE "public"."community_payments" TO "anon";
GRANT ALL ON TABLE "public"."community_payments" TO "authenticated";
GRANT ALL ON TABLE "public"."community_payments" TO "service_role";



GRANT ALL ON TABLE "public"."community_post_comments" TO "anon";
GRANT ALL ON TABLE "public"."community_post_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."community_post_comments" TO "service_role";



GRANT ALL ON TABLE "public"."community_post_likes" TO "anon";
GRANT ALL ON TABLE "public"."community_post_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."community_post_likes" TO "service_role";



GRANT ALL ON TABLE "public"."community_posts" TO "anon";
GRANT ALL ON TABLE "public"."community_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."community_posts" TO "service_role";



GRANT ALL ON TABLE "public"."community_saved_posts" TO "anon";
GRANT ALL ON TABLE "public"."community_saved_posts" TO "authenticated";
GRANT ALL ON TABLE "public"."community_saved_posts" TO "service_role";



GRANT ALL ON TABLE "public"."community_tasks" TO "anon";
GRANT ALL ON TABLE "public"."community_tasks" TO "authenticated";
GRANT ALL ON TABLE "public"."community_tasks" TO "service_role";



GRANT ALL ON TABLE "public"."conversation_messages" TO "anon";
GRANT ALL ON TABLE "public"."conversation_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."conversation_messages" TO "service_role";



GRANT ALL ON TABLE "public"."conversations" TO "anon";
GRANT ALL ON TABLE "public"."conversations" TO "authenticated";
GRANT ALL ON TABLE "public"."conversations" TO "service_role";



GRANT ALL ON TABLE "public"."course_lessons" TO "anon";
GRANT ALL ON TABLE "public"."course_lessons" TO "authenticated";
GRANT ALL ON TABLE "public"."course_lessons" TO "service_role";



GRANT ALL ON TABLE "public"."course_modules" TO "anon";
GRANT ALL ON TABLE "public"."course_modules" TO "authenticated";
GRANT ALL ON TABLE "public"."course_modules" TO "service_role";



GRANT ALL ON TABLE "public"."digital_access" TO "anon";
GRANT ALL ON TABLE "public"."digital_access" TO "authenticated";
GRANT ALL ON TABLE "public"."digital_access" TO "service_role";



GRANT ALL ON TABLE "public"."exchange_rate_logs" TO "anon";
GRANT ALL ON TABLE "public"."exchange_rate_logs" TO "authenticated";
GRANT ALL ON TABLE "public"."exchange_rate_logs" TO "service_role";



GRANT ALL ON TABLE "public"."failed_wallet_credits" TO "anon";
GRANT ALL ON TABLE "public"."failed_wallet_credits" TO "authenticated";
GRANT ALL ON TABLE "public"."failed_wallet_credits" TO "service_role";



GRANT ALL ON TABLE "public"."influencers" TO "anon";
GRANT ALL ON TABLE "public"."influencers" TO "authenticated";
GRANT ALL ON TABLE "public"."influencers" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_progress" TO "anon";
GRANT ALL ON TABLE "public"."lesson_progress" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_progress" TO "service_role";



GRANT ALL ON TABLE "public"."member_points" TO "anon";
GRANT ALL ON TABLE "public"."member_points" TO "authenticated";
GRANT ALL ON TABLE "public"."member_points" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON TABLE "public"."order_items" TO "anon";
GRANT ALL ON TABLE "public"."order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."order_items" TO "service_role";



GRANT ALL ON TABLE "public"."order_payment_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_payment_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_payment_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."order_status_history" TO "anon";
GRANT ALL ON TABLE "public"."order_status_history" TO "authenticated";
GRANT ALL ON TABLE "public"."order_status_history" TO "service_role";



GRANT ALL ON TABLE "public"."orders" TO "anon";
GRANT ALL ON TABLE "public"."orders" TO "authenticated";
GRANT ALL ON TABLE "public"."orders" TO "service_role";



GRANT ALL ON TABLE "public"."payouts" TO "anon";
GRANT ALL ON TABLE "public"."payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."payouts" TO "service_role";



GRANT ALL ON TABLE "public"."platform_secrets" TO "anon";
GRANT ALL ON TABLE "public"."platform_secrets" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_secrets" TO "service_role";



GRANT ALL ON TABLE "public"."platform_settings" TO "anon";
GRANT ALL ON TABLE "public"."platform_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."platform_settings" TO "service_role";



GRANT ALL ON TABLE "public"."product_categories" TO "anon";
GRANT ALL ON TABLE "public"."product_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."product_categories" TO "service_role";



GRANT ALL ON TABLE "public"."product_shipping_options" TO "anon";
GRANT ALL ON TABLE "public"."product_shipping_options" TO "authenticated";
GRANT ALL ON TABLE "public"."product_shipping_options" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON TABLE "public"."product_views" TO "anon";
GRANT ALL ON TABLE "public"."product_views" TO "authenticated";
GRANT ALL ON TABLE "public"."product_views" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."reviews" TO "anon";
GRANT ALL ON TABLE "public"."reviews" TO "authenticated";
GRANT ALL ON TABLE "public"."reviews" TO "service_role";



GRANT ALL ON TABLE "public"."rooms" TO "anon";
GRANT ALL ON TABLE "public"."rooms" TO "authenticated";
GRANT ALL ON TABLE "public"."rooms" TO "service_role";



GRANT ALL ON TABLE "public"."shopify_credentials" TO "anon";
GRANT ALL ON TABLE "public"."shopify_credentials" TO "authenticated";
GRANT ALL ON TABLE "public"."shopify_credentials" TO "service_role";



GRANT ALL ON TABLE "public"."short_video_clicks" TO "anon";
GRANT ALL ON TABLE "public"."short_video_clicks" TO "authenticated";
GRANT ALL ON TABLE "public"."short_video_clicks" TO "service_role";



GRANT ALL ON TABLE "public"."short_video_comments" TO "anon";
GRANT ALL ON TABLE "public"."short_video_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."short_video_comments" TO "service_role";



GRANT ALL ON TABLE "public"."short_video_earnings" TO "anon";
GRANT ALL ON TABLE "public"."short_video_earnings" TO "authenticated";
GRANT ALL ON TABLE "public"."short_video_earnings" TO "service_role";



GRANT ALL ON TABLE "public"."short_video_likes" TO "anon";
GRANT ALL ON TABLE "public"."short_video_likes" TO "authenticated";
GRANT ALL ON TABLE "public"."short_video_likes" TO "service_role";



GRANT ALL ON TABLE "public"."short_video_views" TO "anon";
GRANT ALL ON TABLE "public"."short_video_views" TO "authenticated";
GRANT ALL ON TABLE "public"."short_video_views" TO "service_role";



GRANT ALL ON TABLE "public"."short_videos" TO "anon";
GRANT ALL ON TABLE "public"."short_videos" TO "authenticated";
GRANT ALL ON TABLE "public"."short_videos" TO "service_role";



GRANT ALL ON TABLE "public"."spaces" TO "anon";
GRANT ALL ON TABLE "public"."spaces" TO "authenticated";
GRANT ALL ON TABLE "public"."spaces" TO "service_role";



GRANT ALL ON TABLE "public"."task_completions" TO "anon";
GRANT ALL ON TABLE "public"."task_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."task_completions" TO "service_role";



GRANT ALL ON TABLE "public"."transactions" TO "anon";
GRANT ALL ON TABLE "public"."transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."transactions" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_campaign_escrow" TO "anon";
GRANT ALL ON TABLE "public"."ugc_campaign_escrow" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_campaign_escrow" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_campaign_media" TO "anon";
GRANT ALL ON TABLE "public"."ugc_campaign_media" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_campaign_media" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_campaign_participants" TO "anon";
GRANT ALL ON TABLE "public"."ugc_campaign_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_campaign_participants" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_campaigns" TO "anon";
GRANT ALL ON TABLE "public"."ugc_campaigns" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_campaigns" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_payouts" TO "anon";
GRANT ALL ON TABLE "public"."ugc_payouts" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_payouts" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_reports" TO "anon";
GRANT ALL ON TABLE "public"."ugc_reports" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_reports" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_submission_media" TO "anon";
GRANT ALL ON TABLE "public"."ugc_submission_media" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_submission_media" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_submissions" TO "anon";
GRANT ALL ON TABLE "public"."ugc_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_submissions" TO "service_role";



GRANT ALL ON TABLE "public"."ugc_view_snapshots" TO "anon";
GRANT ALL ON TABLE "public"."ugc_view_snapshots" TO "authenticated";
GRANT ALL ON TABLE "public"."ugc_view_snapshots" TO "service_role";



GRANT ALL ON TABLE "public"."user_2fa_secrets" TO "anon";
GRANT ALL ON TABLE "public"."user_2fa_secrets" TO "authenticated";
GRANT ALL ON TABLE "public"."user_2fa_secrets" TO "service_role";



GRANT ALL ON TABLE "public"."user_roles" TO "anon";
GRANT ALL ON TABLE "public"."user_roles" TO "authenticated";
GRANT ALL ON TABLE "public"."user_roles" TO "service_role";



GRANT ALL ON TABLE "public"."variant_stock_history" TO "anon";
GRANT ALL ON TABLE "public"."variant_stock_history" TO "authenticated";
GRANT ALL ON TABLE "public"."variant_stock_history" TO "service_role";



GRANT ALL ON TABLE "public"."vendor_followers" TO "anon";
GRANT ALL ON TABLE "public"."vendor_followers" TO "authenticated";
GRANT ALL ON TABLE "public"."vendor_followers" TO "service_role";



GRANT ALL ON TABLE "public"."vendors" TO "anon";
GRANT ALL ON TABLE "public"."vendors" TO "authenticated";
GRANT ALL ON TABLE "public"."vendors" TO "service_role";



GRANT ALL ON TABLE "public"."wallets" TO "anon";
GRANT ALL ON TABLE "public"."wallets" TO "authenticated";
GRANT ALL ON TABLE "public"."wallets" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_events" TO "anon";
GRANT ALL ON TABLE "public"."webhook_events" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_events" TO "service_role";



GRANT ALL ON TABLE "public"."webhook_subscriptions" TO "anon";
GRANT ALL ON TABLE "public"."webhook_subscriptions" TO "authenticated";
GRANT ALL ON TABLE "public"."webhook_subscriptions" TO "service_role";



GRANT ALL ON TABLE "public"."wishlists" TO "anon";
GRANT ALL ON TABLE "public"."wishlists" TO "authenticated";
GRANT ALL ON TABLE "public"."wishlists" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";




