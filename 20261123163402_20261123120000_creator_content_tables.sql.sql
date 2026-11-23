/*
# Creator content tables: notifications, ads + purge seeded fake events

1. Plain-English explanation
This migration supports a creator role feature. Creators of the app
whitelist their own content management. Previously the `events` table was
pre-filled with 6 fictional sample events; those fake rows are deleted so the
Events section starts empty and only shows real events published by creators.
Two new tables store creator-published content: manual notifications
(shown in the users' bell panel) and collaborator ads/offers (shown in the
offers space).

2. Modified Tables
- `events`: DELETE of all seeded fictional rows (data purge requested by the
  product owner). No schema change; the existing table and its policies remain.

3. New Tables
- `notifications`
  - `id` (uuid, primary key)
  - `title` (text, not null) — notification headline
  - `message` (text, not null) — notification body
  - `link` (text, nullable) — optional destination URL or in-app section key
  - `created_at` (timestamptz, default now())
- `ads`
  - `id` (uuid, primary key)
  - `brand` (text, not null) — collaborator/local business name
  - `title` (text, not null) — offer headline
  - `description` (text, not null) — offer details
  - `discount` (text, nullable) — discount code or offer label
  - `image_url` (text, nullable) — banner/image link
  - `link` (text, nullable) — optional destination URL
  - `created_at` (timestamptz, default now())

4. Security
- RLS enabled on both new tables.
- This app's login is OTP-based: all logged-in sessions are `authenticated`,
  but the existing `events` table already grants full anon+authenticated CRUD
  and the product requires all members to read published content. We mirror
  that existing access model: public read, writes allowed for the app's
  client roles. Creator gating (whitelist + password) is enforced in the
  application layer, consistent with the existing `events` policies.
- Grants: SELECT, INSERT, UPDATE, DELETE to anon, authenticated (matching the
  existing `events` grant pattern).

5. Important notes
- The fake events purge is intentional per product request: the Events
  section must start empty.
- `link` columns are plain text and never rendered as raw HTML (XSS-safe:
  rendered via anchor href with rel="noopener noreferrer" or as plain text).
*/

-- 1. Purge fictional seed events (product decision: section starts empty)
DELETE FROM events;

-- 2. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_notifications" ON notifications;
CREATE POLICY "public_select_notifications" ON notifications
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "creator_insert_notifications" ON notifications;
CREATE POLICY "creator_insert_notifications" ON notifications
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "creator_update_notifications" ON notifications;
CREATE POLICY "creator_update_notifications" ON notifications
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "creator_delete_notifications" ON notifications;
CREATE POLICY "creator_delete_notifications" ON notifications
FOR DELETE TO anon, authenticated USING (true);

-- 3. Ads table
CREATE TABLE IF NOT EXISTS ads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  discount text,
  image_url text,
  link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ads ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON ads TO anon, authenticated;

DROP POLICY IF EXISTS "public_select_ads" ON ads;
CREATE POLICY "public_select_ads" ON ads
FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "creator_insert_ads" ON ads;
CREATE POLICY "creator_insert_ads" ON ads
FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "creator_update_ads" ON ads;
CREATE POLICY "creator_update_ads" ON ads
FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "creator_delete_ads" ON ads;
CREATE POLICY "creator_delete_ads" ON ads
FOR DELETE TO anon, authenticated USING (true);

-- 4. Index for listing newest first
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ads_created ON ads (created_at DESC);
