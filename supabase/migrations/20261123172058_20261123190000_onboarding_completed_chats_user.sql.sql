ALTER TABLE profiles ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS user_email text;
CREATE INDEX IF NOT EXISTS idx_chats_user_email ON chats (user_email);
ALTER TABLE chats ADD COLUMN IF NOT EXISTS peer_email text;
CREATE INDEX IF NOT EXISTS idx_chats_peer_email ON chats (peer_email);
