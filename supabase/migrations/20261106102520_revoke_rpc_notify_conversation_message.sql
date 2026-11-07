-- Trigger-only function: not meant to be called over the REST API.
revoke execute on function public.notify_conversation_message() from public, anon, authenticated;
