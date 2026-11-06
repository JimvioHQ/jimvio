-- Unified messaging (Nov 2026)
--
-- 1. Direct messages between any two registered users, on the EXISTING
--    direct-message tables (community_inbox_*). A conversation with
--    community_id NULL is a platform-wide DM; community DMs keep their
--    community_id. No new messaging tables.
-- 2. Closes two insert holes: permissive policies are OR'd, so the loose
--    "sender = me" insert policies let any user write into ANY conversation.
-- 3. Marketplace message notifications link to /messages instead of a 404,
--    and repeat messages refresh one unread notification instead of piling up.

-- ── 1. Platform-wide direct conversations ───────────────────────────────
alter table public.community_inbox_conversations alter column community_id drop not null;

do $$ begin
  alter table public.community_inbox_conversations
    add constraint community_inbox_conversations_ordered_pair check (user_low < user_high);
exception when duplicate_object then null; end $$;

-- One platform-wide DM per pair (community DMs keep their own unique key).
create unique index if not exists community_inbox_direct_pair_key
  on public.community_inbox_conversations (user_low, user_high)
  where community_id is null;

create index if not exists community_inbox_conv_low_updated on public.community_inbox_conversations (user_low, updated_at desc);
create index if not exists community_inbox_conv_high_updated on public.community_inbox_conversations (user_high, updated_at desc);

-- Find or create the DM with another user. Safe under concurrency (unique index + ON CONFLICT),
-- never lets a user message themselves or a non-existent / inactive account.
create or replace function public.get_or_create_direct_conversation(p_peer uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_me uuid := auth.uid();
  v_low uuid;
  v_high uuid;
  v_id uuid;
begin
  if v_me is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_peer is null or p_peer = v_me then raise exception 'invalid recipient' using errcode = '22023'; end if;
  if not exists (select 1 from profiles where id = p_peer and coalesce(is_active, true)) then
    raise exception 'recipient not found' using errcode = 'P0002';
  end if;
  v_low := least(v_me, p_peer);
  v_high := greatest(v_me, p_peer);
  insert into community_inbox_conversations (community_id, user_low, user_high)
  values (null, v_low, v_high)
  on conflict (user_low, user_high) where community_id is null do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from community_inbox_conversations
    where community_id is null and user_low = v_low and user_high = v_high;
  end if;
  return v_id;
end;
$$;

revoke all on function public.get_or_create_direct_conversation(uuid) from public, anon;
grant execute on function public.get_or_create_direct_conversation(uuid) to authenticated;

-- ── 2. Close the message insert holes ──────────────────────────────────
-- Strict participant policy "community_inbox_msg_insert_sender" already exists; drop the loose one.
drop policy if exists community_inbox_messages_insert on public.community_inbox_messages;

drop policy if exists conversation_messages_insert on public.conversation_messages;
create policy conversation_messages_insert on public.conversation_messages
  for insert with check (
    (select auth.uid()) = sender_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
        and (
          c.buyer_id = (select auth.uid())
          or exists (select 1 from public.vendors v where v.id = c.vendor_id and v.user_id = (select auth.uid()))
        )
    )
  );

-- ── 3. Marketplace notification link ───────────────────────────────────
-- (Direct-message notifications are sent by the app's notification pipeline,
-- which honours user preferences — no trigger needed for them.)
-- One unread notification per conversation: later messages refresh it instead of piling up.
create or replace function public.notify_conversation_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_conv record;
  v_recipient_id uuid;
  v_sender_name text;
  v_preview text;
  v_url text;
begin
  select buyer_id, vendor_id into v_conv from conversations where id = new.conversation_id;
  if new.sender_id = v_conv.buyer_id then
    v_recipient_id := (select user_id from vendors where id = v_conv.vendor_id);
  else
    v_recipient_id := v_conv.buyer_id;
  end if;
  if v_recipient_id is null or v_recipient_id = new.sender_id then return new; end if;
  select full_name into v_sender_name from profiles where id = new.sender_id;
  v_preview := coalesce(left(new.body, 80), 'New message');
  if new.message_type = 'product' then v_preview := 'Shared a product'; end if;
  if new.message_type = 'quote_request' then v_preview := 'Quote request'; end if;
  if new.message_type = 'quote_reply' then v_preview := 'Sent an offer'; end if;
  if new.message_type in ('image', 'file') then v_preview := 'Sent an attachment'; end if;
  v_url := '/messages?conversation=' || new.conversation_id;
  update notifications set message = v_preview, created_at = now()
   where user_id = v_recipient_id and type = 'message' and is_read = false and action_url = v_url;
  if not found then
    insert into notifications (user_id, type, title, message, action_url)
    values (v_recipient_id, 'message', coalesce(v_sender_name, 'Someone') || ' sent a message', v_preview, v_url);
  end if;
  return new;
end;
$$;
