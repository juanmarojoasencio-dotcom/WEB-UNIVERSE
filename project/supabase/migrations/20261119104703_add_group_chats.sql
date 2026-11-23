/*
# Add group chat support to chats table

1. Modified Tables
- `chats`: add `chat_type` (text, 'private' | 'group', default 'private') and `member_count` (int, default 2).
  These columns distinguish 1-to-1 conversations from group/community chats.
- Also backfill existing rows so they remain private chats.

2. Security
- No RLS changes: existing policies already allow anon/authenticated CRUD.
- Grants: no changes needed (existing grants cover new columns).

3. Idempotent
- Uses DO $$ ... IF NOT EXISTS ... END $$ for conditional column additions.
*/

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'chat_type'
  ) THEN
    ALTER TABLE chats ADD COLUMN chat_type text NOT NULL DEFAULT 'private';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'chats' AND column_name = 'member_count'
  ) THEN
    ALTER TABLE chats ADD COLUMN member_count int NOT NULL DEFAULT 2;
  END IF;
END $$;

-- Seed group chats the user has joined
INSERT INTO chats (chat_id, contact_name, contact_avatar, contact_faculty, last_message, last_time, unread, chat_type, member_count)
VALUES
  ('group_periodismo_3', 'Periodismo 3º - Grupo 1', 'P3', 'FCom', 'Marta: ¿A qué hora quedamos para la práctica?', '13:20', 3, 'group', 28),
  ('group_cafe_biblioteca', 'Café y Biblioteca US', 'CB', 'Interfacultativo', 'Diego: mañana hay sitio en la planta 3', '11:45', 0, 'group', 56),
  ('group_futbol_reina', 'Fútbol 7 Campus Reina Mercedes', 'F7', 'Reina Mercedes', 'Pablo: apuntadme para el partido del sábado', '10:10', 5, 'group', 18),
  ('group_audiovisual_tf', 'Comunicación Audiovisual - TFG', 'AV', 'FCom', 'Alejandro: ¿alguien tiene plantilla de guion?', 'Ayer', 1, 'group', 12)
ON CONFLICT DO NOTHING;

-- Seed messages for group chats (is_me=false for group members, sender_name varies)
INSERT INTO messages (chat_id, sender_name, sender_avatar, content, is_me)
VALUES
  ('group_periodismo_3', 'Marta López', 'ML', '¿A qué hora quedamos para la práctica?', false),
  ('group_periodismo_3', 'Pablo Ortega', 'PO', 'Yo puedo a partir de las 17h', false),
  ('group_periodismo_3', 'Tú', 'TÚ', 'Perfecto, apuntadme a las 17h en la cafetería', true),
  ('group_periodismo_3', 'Marta López', 'ML', '¿A qué hora quedamos para la práctica?', false),
  ('group_cafe_biblioteca', 'Diego Salas', 'DS', 'Mañana hay sitio en la planta 3', false),
  ('group_cafe_biblioteca', 'Sara Jiménez', 'SJ', 'Genial, nos vemos allí', false),
  ('group_cafe_biblioteca', 'Tú', 'TÚ', 'Llevaré café para todos', true),
  ('group_futbol_reina', 'Pablo Ortega', 'PO', 'Apuntadme para el partido del sábado', false),
  ('group_futbol_reina', 'Diego Salas', 'DS', 'Yo voy, ¿qué hora es?', false),
  ('group_futbol_reina', 'Paula Navarro', 'PN', 'A las 11h en el pabellón', false),
  ('group_audiovisual_tf', 'Alejandro Vega', 'AV', '¿Alguien tiene plantilla de guion?', false),
  ('group_audiovisual_tf', 'María García', 'MG', 'Te paso una por aquí', false),
  ('group_audiovisual_tf', 'Tú', 'TÚ', 'Gracias María, me sirve perfecto', true)
ON CONFLICT DO NOTHING;
