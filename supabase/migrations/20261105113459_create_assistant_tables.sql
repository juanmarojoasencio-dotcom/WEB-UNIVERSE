/*
# Create assistant history and support ticket tables

1. New Tables
- `assistant_messages`: every question and answer exchanged with the AI assistant.
  - id (uuid, PK), session_id (text, anonymous browser session), mode (text: academic | official | support),
    role (text: user | assistant), content (text), created_at (timestamptz)
- `support_tickets`: problems with the app reported through the assistant's support mode.
  - id (uuid, PK), session_id (text), description (text), status (text, default 'abierto'), created_at (timestamptz)

2. Security
- RLS enabled on both tables with no client policies.
- No grants to anon or authenticated: the browser cannot read or write these tables directly.
- Only the server function (service_role) reads and writes them, so one student cannot see another student's history.

3. Important Notes
- Idempotent: safe to re-run.
- Sessions are anonymous; the browser keeps a random session id so a student sees their own history on return.
*/

CREATE TABLE IF NOT EXISTS assistant_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  mode text NOT NULL CHECK (mode IN ('academic', 'official', 'support')),
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_messages_session ON assistant_messages (session_id, created_at);

ALTER TABLE assistant_messages ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, DELETE ON assistant_messages TO service_role;

CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'abierto',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON support_tickets TO service_role;
