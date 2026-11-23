/*
# Event attendance, student groups cleanup, notification images, realtime

1. Plain-English explanation
Supports per-user event registration (a student can join/leave an event and
the attendee counter updates automatically, with no double signups), student
group creation (the groups table starts empty, students create real groups and
auto-join as first member), small images on manual notifications, and realtime
delivery of new notifications.

2. Modified Tables
- `events`: new columns `image_url` (text, nullable) and `creator_email`
  (text, nullable). Existing `is_attending` column is no longer used by the
  app (kept for compatibility).
- `notifications`: new column `brand` (text, nullable) — collaborator/local
  name, and `image_url` (text, nullable) — small thumbnail.
- `groups`: DELETE all seeded fake groups (product decision: section starts
  empty, only real user-created groups are shown). New columns `creator_email`
  (text, nullable).

3. New Tables
- `event_attendees`
  - `id` (uuid, primary key)
  - `event_id` (uuid, references events, on delete cascade)
  - `user_email` (text, not null) — the app identifies users by verified email
  - `created_at` (timestamptz, default now())
  - UNIQUE(event_id, user_email) prevents double signups.
- `group_members`
  - `id` (uuid, primary key)
  - `group_id` (uuid, references groups, on delete cascade)
  - `user_email` (text, not null)
  - `created_at` (timestamptz, default now())
  - UNIQUE(group_id, user_email) prevents double joins.

4. Security
- RLS enabled on `event_attendees` and `group_members`.
- Same access model as the existing tables (public read + app-level creator
  gating): SELECT/INSERT/DELETE to anon, authenticated. UPDATE is not needed.
- Realtime enabled for `notifications` (and event_attendees for live counters).

5. Important notes
- Image columns store Supabase Storage public URLs; the bucket must be public.
- attendee_count is denormalized for fast reads; kept in sync in app code
  (increment/decrement inside the same click handler).
*/

ALTER TABLE events ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE events ADD COLUMN IF NOT EXISTS creator_email text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS brand text;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS image_url text;
ALTER TABLE groups ADD COLUMN IF NOT EXISTS creator_email text;

DELETE FROM groups;

CREATE TABLE IF NOT EXISTS event_attendees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_email)
);

ALTER TABLE event_attendees ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON event_attendees TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_event_attendees" ON event_attendees;
CREATE POLICY "public_select_event_attendees" ON event_attendees
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_event_attendees" ON event_attendees;
CREATE POLICY "public_insert_event_attendees" ON event_attendees
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_event_attendees" ON event_attendees;
CREATE POLICY "public_delete_event_attendees" ON event_attendees
FOR DELETE TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_email)
);

ALTER TABLE group_members ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON group_members TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_group_members" ON group_members;
CREATE POLICY "public_select_group_members" ON group_members
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "public_insert_group_members" ON group_members;
CREATE POLICY "public_insert_group_members" ON group_members
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "public_delete_group_members" ON group_members;
CREATE POLICY "public_delete_group_members" ON group_members
FOR DELETE TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_event_attendees_event ON event_attendees (event_id);
CREATE INDEX IF NOT EXISTS idx_group_members_group ON group_members (group_id);

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE event_attendees;
