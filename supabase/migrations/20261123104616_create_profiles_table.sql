/*
# Create profiles table for real user directory

## Overview
Creates a `profiles` table that stores the onboarding data of each registered
user so the Explore page and the Virtual Assistant can query real students
instead of hardcoded mock data.

## New Tables
- `profiles`
  - `id` (uuid, primary key, defaults to auth.uid())
  - `email` (text, unique, not null) — the institutional email (@alum.us.es / @us.es)
  - `full_name` (text, not null)
  - `faculty` (text) — derived campus/faculty label
  - `degree` (text, not null)
  - `course` (text, not null)
  - `class_group` (text, not null)
  - `plan_tag` (text)
  - `group_tag` (text)
  - `goal_tag` (text)
  - `created_at` (timestamptz, defaults to now())

## Security
- RLS enabled on `profiles`.
- Grants: SELECT to anon + authenticated (the explore page reads via anon key);
  INSERT/UPDATE to authenticated (users create/update their own profile).
- Policies:
  - SELECT: anyone can browse the directory (anon + authenticated).
  - INSERT: a user can only insert their own profile (auth.uid() = id).
  - UPDATE: a user can only update their own profile.

## Important Notes
1. The `id` column defaults to `auth.uid()` so frontend inserts that omit `id`
   are automatically filled with the authenticated user's ID.
2. This is a public directory — all registered students are visible to all
   users, which is the intended behaviour for a university social app.
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT auth.uid(),
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  faculty text DEFAULT 'General',
  degree text NOT NULL,
  course text NOT NULL,
  class_group text NOT NULL,
  plan_tag text DEFAULT '',
  group_tag text DEFAULT '',
  goal_tag text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles"
ON profiles FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_profile" ON profiles;
CREATE POLICY "insert_own_profile"
ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile"
ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
