/*
# Create user_academic_info table (enrollment & scholarship data)

## Purpose
Stores optional, user-editable enrollment and scholarship data used by the
"Information oficial" tab of the AI Assistant to personalize answers
(Beca MEC requirements, Junta de Andalucía bonus, SEVIUS guidance).

## Changes

### 1. New table: `user_academic_info`
- `email` (text, primary key) — matches `profiles.email`; one row per user.
- `enrollment_type` (text, nullable) — 'Curso completo' | 'Tiempo parcial'.
- `enrolled_credits` (integer, nullable) — ECTS enrolled this year.
- `mec_status` (text, nullable) — 'No solicitada' | 'En trámite' | 'Concedida' | 'Denegada'.
- `other_scholarships` (text, nullable) — e.g. Beca propia US, Erasmus, Junta de Andalucía.
- `updated_at` (timestamptz, default now()).

### 2. Security
- RLS enabled.
- Grants: SELECT, INSERT, UPDATE, DELETE to `anon, authenticated`
  (the app authenticates by email in application logic, consistent with
  the rest of the schema — policies are open because ownership is
  managed by the app using the user's email; matches existing tables).
- Four separate policies, one per CRUD verb.
*/

CREATE TABLE IF NOT EXISTS user_academic_info (
  email text PRIMARY KEY,
  enrollment_type text,
  enrolled_credits integer,
  mec_status text,
  other_scholarships text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_academic_info ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON user_academic_info TO anon, authenticated;

DROP POLICY IF EXISTS "select_user_academic_info" ON user_academic_info;
CREATE POLICY "select_user_academic_info"
ON user_academic_info FOR SELECT
TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "insert_user_academic_info" ON user_academic_info;
CREATE POLICY "insert_user_academic_info"
ON user_academic_info FOR INSERT
TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_user_academic_info" ON user_academic_info;
CREATE POLICY "update_user_academic_info"
ON user_academic_info FOR UPDATE
TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "delete_user_academic_info" ON user_academic_info;
CREATE POLICY "delete_user_academic_info"
ON user_academic_info FOR DELETE
TO anon, authenticated USING (true);