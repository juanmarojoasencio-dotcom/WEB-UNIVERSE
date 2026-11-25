/*
# Add author_email to posts and create post_likes table

## Purpose
Enable tracking of real user statistics in the "Tú" (profile) section:
- **Publicaciones**: count posts by the current user → needs `author_email` on `posts`.
- **Me gusta dados**: count likes given by the current user → needs a `post_likes` junction table.

The existing `group_members` and `event_attendees` tables already track
membership/attendance by `user_email`, so "Grupos activos" and "Eventos
confirmados" already have the data they need.

## Changes

### 1. Modified table: `posts`
- Added column `author_email` (text, nullable) — stores the email of the
  user who created the post so we can count "Publicaciones" per user.
  Nullable because existing rows don't have it.

### 2. New table: `post_likes`
- `id` (uuid, primary key, default gen_random_uuid())
- `post_id` (uuid, foreign key → posts.id ON DELETE CASCADE)
- `user_email` (text, not null) — the user who gave the like
- `created_at` (timestamptz, default now())
- UNIQUE constraint on (post_id, user_email) so each user can like a post
  at most once.

### 3. Security
- RLS enabled on `post_likes`.
- CRUD granted to `anon, authenticated` (the app uses email-based auth
  without Supabase auth sessions on every request, matching the existing
  pattern on `posts`, `group_members`, and `event_attendees`).
- Four separate policies (SELECT / INSERT / UPDATE / DELETE), all open
  to `anon, authenticated` since the app manages ownership via
  `user_email` in application logic, consistent with the rest of the
  schema.

### 4. Index
- Index on `post_likes(user_email)` for fast "likes given" count queries.
- Index on `posts(author_email)` for fast "posts by user" count queries.
*/

-- 1. Add author_email to posts (nullable for backwards compat)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'posts' AND column_name = 'author_email'
  ) THEN
    ALTER TABLE posts ADD COLUMN author_email text;
  END IF;
END $$;

-- Index for counting posts by author
CREATE INDEX IF NOT EXISTS idx_posts_author_email ON posts(author_email);

-- 2. Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_email text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_email)
);

ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON post_likes TO anon, authenticated;

DROP POLICY IF EXISTS "select_post_likes" ON post_likes;
CREATE POLICY "select_post_likes"
ON post_likes FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_post_likes" ON post_likes;
CREATE POLICY "insert_post_likes"
ON post_likes FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_post_likes" ON post_likes;
CREATE POLICY "update_post_likes"
ON post_likes FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_post_likes" ON post_likes;
CREATE POLICY "delete_post_likes"
ON post_likes FOR DELETE
TO anon, authenticated USING (true);

-- Index for counting likes by user
CREATE INDEX IF NOT EXISTS idx_post_likes_user_email ON post_likes(user_email);