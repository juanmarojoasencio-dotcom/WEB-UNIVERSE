/*
# Limpieza y reparación del sistema de mensajería

1. Limpieza total
- TRUNCATE de `messages` y `chats` para eliminar chats y mensajes de prueba.
- Se eliminan todos los registros residuales de conversaciones anteriores.

2. Cambios de schema
- `messages`: añade `sender_email` (text) para identificar al remitente real.
  El campo `is_me` pasa a no usarse (se calcula en cliente comparando sender_email).
- `chats`: `user_email` y `peer_email` ya existen; se añaden índices.
- Índices en `messages(chat_id)` y `chats(user_email, peer_email)` para rendimiento.

3. Modelo de chat privado bidireccional
- Cada chat privado genera DOS filas en `chats`: una por participante.
- Ambas comparten el mismo `chat_id` (canónico: pm_<emailA>_<emailB> ordenado).
- Cada fila muestra como `contact_name`/`contact_avatar`/`contact_faculty`
  los datos del OTRO usuario, de modo que cada participante ve al otro.
- `user_email` = el participante que ve esa fila; `peer_email` = el otro.

4. Realtime
- Añade `messages` y `chats` a la publicación `supabase_realtime`
  para que los cambios se propaguen en tiempo real a los clientes.

5. Seguridad (RLS)
- Las políticas existentes (TO anon, authenticated, USING true) se mantienen
  porque la app identifica a los usuarios por email (no por auth.uid()) y
  filtra por `user_email` en el cliente. El acceso ya está abierto a
  usuarios autenticados y anónimos con OTP.
*/

TRUNCATE TABLE messages;
TRUNCATE TABLE chats;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS sender_email text;

CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages (chat_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_email ON chats (user_email);
CREATE INDEX IF NOT EXISTS idx_chats_peer_email ON chats (peer_email);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE messages;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE chats;
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;
