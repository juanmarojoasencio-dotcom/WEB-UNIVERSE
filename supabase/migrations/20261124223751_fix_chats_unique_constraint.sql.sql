/*
# Fix chats table unique constraint blocking private chat creation

1. Problem
- The `chats` table had a UNIQUE constraint on `chat_id` alone (`chats_chat_id_key`).
- The app creates a private chat by inserting TWO rows with the SAME `chat_id`:
  one row per participant (each row stores the participant in `user_email`
  and the other person in `peer_email`).
- The second INSERT always failed with a unique-violation error, so pressing
  "Chatear" on a student could never create or open a conversation.

2. Changes
- Drop the incorrect UNIQUE constraint on `chat_id`.
- Add a composite UNIQUE constraint on (`chat_id`, `user_email`) instead, which
  still guarantees each user can only have ONE row per conversation (preventing
  duplicates) while allowing the two participant rows that share a `chat_id`.

3. Security
- No RLS changes. Existing policies and grants remain as they are.
*/

ALTER TABLE public.chats
  DROP CONSTRAINT IF EXISTS chats_chat_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chats_chat_id_user_email_key'
      AND conrelid = 'public.chats'::regclass
  ) THEN
    ALTER TABLE public.chats
      ADD CONSTRAINT chats_chat_id_user_email_key UNIQUE (chat_id, user_email);
  END IF;
END $$;
