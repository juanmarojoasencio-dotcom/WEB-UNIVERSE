/*
# Create chat_members table for persistent read state and group membership

## Purpose
1. **Persistent unread state:** store `last_read_at` per (user, chat) so unread
   counts survive reloads, computed from the `messages` table.
2. **Group chat membership:** when a student joins a Community (or creates a
   group, automatically) a row here + a `chats` row (chat_type='group') makes
   the group appear instantly in Chats > Grupos.

## Changes

### 1. New table: `chat_members`
- `id` uuid PK default gen_random_uuid()
- `chat_id` text NOT NULL — matches chats.chat_id (group chat id = `grp_<group uuid>`)
- `user_email` text NOT NULL
- `last_read_at` timestamptz NOT NULL DEFAULT now()
- `created_at` timestamptz DEFAULT now()
- UNIQUE(chat_id, user_email)

### 2. Security
- RLS enabled. CRUD granted to anon, authenticated (app manages ownership by
  email in application logic, consistent with the rest of the schema).
- Four separate policies, one per CRUD verb.
*/

CREATE TABLE IF NOT EXISTS chat_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  user_email text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(chat_id, user_email)
);

ALTER TABLE chat_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON chat_members TO anon, authenticated;

DROP POLICY IF EXISTS "select_chat_members" ON chat_members;
CREATE POLICY "select_chat_members"
ON chat_members FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_chat_members" ON chat_members;
CREATE POLICY "insert_chat_members"
ON chat_members FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_chat_members" ON chat_members;
CREATE POLICY "update_chat_members"
ON chat_members FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_chat_members" ON chat_members;
CREATE POLICY "delete_chat_members"
ON chat_members FOR DELETE
TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chat_members_user ON chat_members(user_email);
CREATE INDEX IF NOT EXISTS idx_chat_members_chat ON chat_members(chat_id);