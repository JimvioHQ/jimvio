-- Extend conversation_messages for rich messages, replies, and negotiation
ALTER TABLE public.conversation_messages
  ADD COLUMN IF NOT EXISTS message_type text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.conversation_messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';

ALTER TABLE public.conversation_messages ALTER COLUMN body DROP NOT NULL;
ALTER TABLE public.conversation_messages ALTER COLUMN body SET DEFAULT '';

COMMENT ON COLUMN public.conversation_messages.message_type IS 'text|product|image|file|quote_request|quote_reply';
COMMENT ON COLUMN public.conversation_messages.metadata IS 'product_id, product_slug, file_url, file_name, quantity, expected_price, delivery_country, offer_price, delivery_time, status(accepted|rejected)';

CREATE INDEX IF NOT EXISTS idx_conversation_messages_reply_to ON public.conversation_messages(reply_to_id);
CREATE INDEX IF NOT EXISTS idx_conversation_messages_created ON public.conversation_messages(conversation_id, created_at);

-- Vendors can update conversation (e.g. updated_at when they send a message)
DROP POLICY IF EXISTS "Vendors can update own conversations" ON public.conversations;
CREATE POLICY "Vendors can update own conversations" ON public.conversations
  FOR UPDATE USING (vendor_id IN (SELECT id FROM public.vendors WHERE user_id = auth.uid()));

-- Allow notification type for messages (optional; add only if your enum doesn't have it)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'message' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'notification_type')) THEN
    ALTER TYPE notification_type ADD VALUE 'message';
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

-- Notify other party on new message (insert into notifications; use service role or SECURITY DEFINER)
CREATE OR REPLACE FUNCTION notify_conversation_message()
RETURNS TRIGGER AS $$
DECLARE
  v_conv RECORD;
  v_recipient_id uuid;
  v_sender_name text;
  v_preview text;
BEGIN
  SELECT buyer_id, vendor_id INTO v_conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF NEW.sender_id = v_conv.buyer_id THEN
    v_recipient_id := (SELECT user_id FROM public.vendors WHERE id = v_conv.vendor_id);
  ELSE
    v_recipient_id := v_conv.buyer_id;
  END IF;
  IF v_recipient_id IS NULL OR v_recipient_id = NEW.sender_id THEN
    RETURN NEW;
  END IF;
  SELECT full_name INTO v_sender_name FROM public.profiles WHERE id = NEW.sender_id;
  v_preview := COALESCE(LEFT(NEW.body, 80), 'New message');
  IF NEW.message_type = 'product' THEN v_preview := 'Shared a product'; END IF;
  IF NEW.message_type = 'quote_request' THEN v_preview := 'Quote request'; END IF;
  IF NEW.message_type = 'quote_reply' THEN v_preview := 'Sent an offer'; END IF;
  IF NEW.message_type IN ('image','file') THEN v_preview := 'Sent an attachment'; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, action_url)
  VALUES (
    v_recipient_id,
    'message',
    COALESCE(v_sender_name, 'Someone') || ' sent a message',
    v_preview,
    '/dashboard/messages?conversation=' || NEW.conversation_id
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_notify_conversation_message ON public.conversation_messages;
CREATE TRIGGER trigger_notify_conversation_message
  AFTER INSERT ON public.conversation_messages
  FOR EACH ROW EXECUTE FUNCTION notify_conversation_message();

-- Optional: Create storage bucket "chat-files" in Supabase Dashboard (Storage) for image/file uploads.
-- Policy: Allow authenticated users to upload and read objects in bucket "chat-files".
