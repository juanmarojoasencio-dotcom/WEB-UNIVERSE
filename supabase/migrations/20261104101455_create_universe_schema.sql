/*
# Uni verse - Social Network Schema (Single-tenant, no auth)

## Overview
Creates the core data model for Uni verse, a university social network for Seville students.
This is a prototype/MVP with no authentication — all data is intentionally public/shared.

## New Tables

1. `posts` — Wall posts (feed)
   - id (uuid, PK)
   - author_name (text) — display name of the poster
   - author_faculty (text) — faculty/campus tag
   - content (text) — the post body
   - likes (int) — like counter
   - created_at (timestamptz)

2. `groups` — Student communities/associations
   - id (uuid, PK)
   - name (text)
   - description (text)
   - category (text) — faculty, hobby, sport, projects
   - faculty (text) — associated faculty or "Interfacultativo"
   - member_count (int)
   - is_joined (boolean) — whether the current session user joined
   - created_at (timestamptz)

3. `events` — University events
   - id (uuid, PK)
   - title (text)
   - description (text)
   - event_date (date)
   - event_time (text)
   - location (text)
   - category (text) — party, talk, sports, study
   - attendee_count (int)
   - is_attending (boolean)
   - created_at (timestamptz)

4. `messages` — Private chat messages
   - id (uuid, PK)
   - chat_id (text) — conversation identifier
   - sender_name (text)
   - sender_avatar (text) — initials or emoji
   - content (text)
   - is_me (boolean) — whether the current session user sent it
   - created_at (timestamptz)

5. `chats` — Chat conversations metadata
   - id (uuid, PK)
   - chat_id (text, unique) — links to messages.chat_id
   - contact_name (text)
   - contact_avatar (text)
   - contact_faculty (text)
   - last_message (text)
   - last_time (text)
   - unread (int)
   - created_at (timestamptz)

6. `contact_submissions` — Contact form submissions
   - id (uuid, PK)
   - name (text)
   - email (text)
   - message (text)
   - created_at (timestamptz)

## Security
- RLS enabled on all tables.
- All tables use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)` because
  this is a single-tenant prototype with intentionally public/shared data (no sign-in).
- CRUD grants to anon + authenticated on all tables.

## Important Notes
1. No user authentication — all data is shared and public by design.
2. Seed data is inserted in a separate migration.
*/

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_name text NOT NULL,
  author_faculty text NOT NULL DEFAULT 'General',
  content text NOT NULL,
  likes int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON posts TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_posts" ON posts;
CREATE POLICY "anon_select_posts" ON posts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_posts" ON posts;
CREATE POLICY "anon_insert_posts" ON posts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_posts" ON posts;
CREATE POLICY "anon_update_posts" ON posts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_posts" ON posts;
CREATE POLICY "anon_delete_posts" ON posts FOR DELETE
  TO anon, authenticated USING (true);

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL DEFAULT 'Aficiones',
  faculty text NOT NULL DEFAULT 'Interfacultativo',
  member_count int NOT NULL DEFAULT 0,
  is_joined boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON groups TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_groups" ON groups;
CREATE POLICY "anon_select_groups" ON groups FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_groups" ON groups;
CREATE POLICY "anon_insert_groups" ON groups FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_groups" ON groups;
CREATE POLICY "anon_update_groups" ON groups FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_groups" ON groups;
CREATE POLICY "anon_delete_groups" ON groups FOR DELETE
  TO anon, authenticated USING (true);

-- Events table
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  event_date date NOT NULL,
  event_time text NOT NULL,
  location text NOT NULL,
  category text NOT NULL DEFAULT 'Otros',
  attendee_count int NOT NULL DEFAULT 0,
  is_attending boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON events TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  sender_name text NOT NULL,
  sender_avatar text NOT NULL DEFAULT 'U',
  content text NOT NULL,
  is_me boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

-- Chats table
CREATE TABLE IF NOT EXISTS chats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text UNIQUE NOT NULL,
  contact_name text NOT NULL,
  contact_avatar text NOT NULL DEFAULT 'U',
  contact_faculty text NOT NULL DEFAULT 'General',
  last_message text NOT NULL DEFAULT '',
  last_time text NOT NULL DEFAULT '',
  unread int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON chats TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_chats" ON chats;
CREATE POLICY "anon_select_chats" ON chats FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chats" ON chats;
CREATE POLICY "anon_insert_chats" ON chats FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chats" ON chats;
CREATE POLICY "anon_update_chats" ON chats FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chats" ON chats;
CREATE POLICY "anon_delete_chats" ON chats FOR DELETE
  TO anon, authenticated USING (true);

-- Contact submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON contact_submissions TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_contact" ON contact_submissions;
CREATE POLICY "anon_select_contact" ON contact_submissions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_contact" ON contact_submissions;
CREATE POLICY "anon_insert_contact" ON contact_submissions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_contact" ON contact_submissions;
CREATE POLICY "anon_update_contact" ON contact_submissions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_contact" ON contact_submissions;
CREATE POLICY "anon_delete_contact" ON contact_submissions FOR DELETE
  TO anon, authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_date ON events (event_date);
