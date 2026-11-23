/*
# Uni verse - Seed Data

## Overview
Populates all tables with realistic Seville university contextual data for the MVP prototype.
Uses ON CONFLICT DO NOTHING to be idempotent.

## Tables seeded
1. posts — 8 feed posts from different faculties
2. groups — 8 student communities
3. events — 6 university events
4. chats — 5 chat conversations
5. messages — sample messages for each chat

## Important Notes
1. All seed data is contextualized in the real Seville university environment.
2. Safe to re-run (idempotent via ON CONFLICT DO NOTHING).
*/

-- Seed posts
INSERT INTO posts (author_name, author_faculty, content, likes) VALUES
  ('María García', 'FCom', '¿Alguien va a la charla de periodismo digital mañana en FCom? Dicen que viene el director de El País. ¡Sería brutal pasarse!', 24),
  ('Carlos Ruano', 'Reina Mercedes', 'Los exámenes de Cálculo en ETSII son el 23 de diciembre. ¿Quién más está hecho polvo? Quedamos en la biblioteca central a estudiar en grupo 📚', 47),
  ('Lucía Fernández', 'Ramón y Cajal', 'La cafetería de Filosofía ha subido el café a 1.50€. Esto es una crisis existencial. ¿Dónde se toma un café decente y barato por la zona?', 89),
  ('Javier Molina', 'Viapol', 'Busco compis para compartir piso por Nervión. Cerca de la Universidad Pablo de Olavide. 300€/mes gastos incluidos. DM si interesa!', 12),
  ('Carmen Rodríguez', 'Cartuja', 'El ISA (Inst. Univ. de Arquitectura) ha abierto un nuevo taller de modelismo los viernes. Lo recomiendo mil por ciento, los profesores son geniales.', 31),
  ('Alejandro Vega', 'FCom', 'Acabo de terminar mi TFM sobre la cobertura informativa de la cultura en Sevilla. Si alguien de Audiovisual le interesa el tema, lo comparto encantado.', 18),
  ('Paula Navarro', 'Reina Mercedes', 'El autobús C2 lleva 20 minutos de retraso otra vez. ¿Es que en Sevilla no se puede llegar puntual a clase? La UPO a esto le llama red de transporte eficiente 🚌', 156),
  ('Diego Salas', 'Viapol', 'Torneo de fútbol sala interfacultades el 15 de diciembre en el pabellón de la Universidad de Sevilla. Apuntad a vuestro equipo! Faltan dos plazas.', 42)
ON CONFLICT DO NOTHING;

-- Seed groups
INSERT INTO groups (name, description, category, faculty, member_count, is_joined) VALUES
  ('Club de Debate FCom', 'Asociación de debate y oratoria de la Facultad de Comunicación. Preparamos torneos interuniversitarios y talleres de argumentación.', 'Académico', 'FCom', 124, false),
  ('Asociación de Videojuegos US', 'Comunidad gamer de la Universidad de Sevilla. Quedadas, torneos de Smash y League, y game jams cada trimestre.', 'Aficiones', 'Interfacultativo', 342, true),
  ('Equipo de Fútbol Sala Viapol', 'Equipo universitario de fútbol sala. Entrenamientos los martes y jueves en el pabellón de Viapol. ¡Buscamos jugadores!', 'Deportes', 'Viapol', 28, false),
  ('Apuntes & Exámenes', 'Banco de apuntes compartido por facultades. Sube tus apuntes y accede a los de los demás. Todo gratis, todo compartido.', 'Académico', 'Interfacultativo', 1287, true),
  ('Taller de Fotografía Cartuja', 'Grupo de fotografía analógica y digital del campus de la Cartuja. Salidas fotográficas por Sevilla cada quince días.', 'Aficiones', 'Cartuja', 67, false),
  ('Asociación de Estudiantes de Filosofía', 'Lecturas, cinefórums y coloquios filosóficos en la Facultad de Filosofía (Ramón y Cajal). Todos los miércoles a las 18h.', 'Académico', 'Ramón y Cajal', 45, false),
  ('Equipo de Básquet Reina Mercedes', 'Baloncesto universitario en ETSII. Liga interna y participamos en el campeonato andaluz universitario.', 'Deportes', 'Reina Mercedes', 22, false),
  ('CineClub Universitario', 'Proyecciones semanales en el salón de actos de la Facultad de Geografía e Historia. Cine de autor, clásicos y debates.', 'Aficiones', 'Interfacultativo', 198, false)
ON CONFLICT DO NOTHING;

-- Seed events
INSERT INTO events (title, description, event_date, event_time, location, category, attendee_count, is_attending) VALUES
  ('Fiesta de Fin de Exámenes FCom', 'Celebración del final del cuatrimestre en la Facultad de Comunicación. Música, comida y buena compañía. Entrada libre con carnet universitario.', '2026-12-20', '21:00', 'Facultad de Comunicación, Av. de la Ciudad Jardín', 'Fiesta', 234, false),
  ('Charla: El periodismo digital en 2026', 'Conferencia sobre el futuro del periodismo digital con directivos de medios nacionales. Organiza el Club de Debate FCom.', '2026-11-12', '18:30', 'Salón de Actos FCom, Sevilla', 'Charla', 87, true),
  ('Torneo de Fútbol Sala Interfacultades', 'Torneo eliminatorio entre facultades de la Universidad de Sevilla. Inscripción de equipos hasta el 10 de diciembre.', '2026-12-15', '16:00', 'Pabellón Deportivo Viapol', 'Deportes', 145, false),
  ('Quedada de Estudio: Cálculo II', 'Sesión de estudio grupal para el examen de Cálculo II de ETSII. Traed apuntes y dudas. Reservamos sala en la biblioteca.', '2026-12-08', '10:00', 'Biblioteca Central, Reina Mercedes', 'Estudio', 52, false),
  ('CineClub: Cinema Paradiso', 'Proyección de Cinema Paradiso seguida de coloquio. Una oda al cine que no te puedes perder. Entrada gratuita hasta completar aforo.', '2026-11-15', '20:00', 'Salón de Actos Geografía e Historia', 'Cultura', 73, false),
  ('Festival Universitario de Música', 'Festival con bandas de estudiantes de todas las facultades. Rock, indie y hip-hop en directo. Food trucks y zona de descanso.', '2026-11-30', '17:00', 'Espacio Exploraterra, Plaza de América', 'Fiesta', 412, true)
ON CONFLICT DO NOTHING;

-- Seed chats
INSERT INTO chats (chat_id, contact_name, contact_avatar, contact_faculty, last_message, last_time, unread) VALUES
  ('chat_maria', 'María García', 'MG', 'FCom', '¿Viste el correo sobre la charla de mañana?', '12:42', 2),
  ('chat_carlos', 'Carlos Ruano', 'CR', 'Reina Mercedes', 'Apúntate al grupo de estudio, falta gente', '11:15', 0),
  ('chat_equipo_futbol', 'Equipo Fútbol Viapol', 'EF', 'Viapol', 'Recordad: entrenamiento mañana 18h', '10:30', 5),
  ('chat_paula', 'Paula Navarro', 'PN', 'Reina Mercedes', 'El C2 es una tragedy jajaja', '09:58', 0),
  ('chat_carmen', 'Carmen Rodríguez', 'CR', 'Cartuja', 'Te paso los apuntes del taller de modelismo', 'Ayer', 1)
ON CONFLICT DO NOTHING;

-- Seed messages for each chat
INSERT INTO messages (chat_id, sender_name, sender_avatar, content, is_me) VALUES
  ('chat_maria', 'María García', 'MG', '¿Viste el correo sobre la charla de mañana?', false),
  ('chat_maria', 'María García', 'MG', 'Dicen que viene el director de El País', false),
  ('chat_maria', 'Tú', 'TÚ', '¡Sí! Ya me he apuntado. ¿Vamos juntos?', true),
  ('chat_maria', 'María García', 'MG', 'Perfecto, quedamos en la entrada a las 18:15', false),
  ('chat_maria', 'María García', 'MG', '¿Viste el correo sobre la charla de mañana?', false),

  ('chat_carlos', 'Tú', 'TÚ', '¿Cómo va el estudio de Cálculo?', true),
  ('chat_carlos', 'Carlos Ruano', 'CR', 'Duro pero vamos avanzando. ¿Te apuntas al grupo?', false),
  ('chat_carlos', 'Carlos Ruano', 'CR', 'Apúntate al grupo de estudio, falta gente', false),
  ('chat_carlos', 'Tú', 'TÚ', 'Dale, mándame el link del grupo', true),

  ('chat_equipo_futbol', 'Equipo Fútbol Viapol', 'EF', 'Recordad: entrenamiento mañana 18h', false),
  ('chat_equipo_futbol', 'Equipo Fútbol Viapol', 'EF', 'Traed las botas y las espinilleras', false),
  ('chat_equipo_futbol', 'Equipo Fútbol Viapol', 'EF', 'Si alguien no puede venir que avise por aquí', false),
  ('chat_equipo_futbol', 'Equipo Fútbol Viapol', 'EF', 'El partido del sábado es a las 11:00 en Viapol', false),
  ('chat_equipo_futbol', 'Equipo Fútbol Viapol', 'EF', '¿Quién puede ir el sábado?', false),

  ('chat_paula', 'Paula Navarro', 'PN', 'El C2 es una tragedy jajaja', false),
  ('chat_paula', 'Tú', 'TÚ', 'Ya tarda 20 minutos, es vergonzoso', true),
  ('chat_paula', 'Paula Navarro', 'PN', 'Llego tarde a Cálculo otra vez', false),

  ('chat_carmen', 'Carmen Rodríguez', 'CR', 'Oye, ¿te interesa el taller de modelismo?', false),
  ('chat_carmen', 'Tú', 'TÚ', '¡Mucho! ¿Cuándo es?', true),
  ('chat_carmen', 'Carmen Rodríguez', 'CR', 'Los viernes de 16h a 18h en la Cartuja', false),
  ('chat_carmen', 'Carmen Rodríguez', 'CR', 'Te paso los apuntes del taller de modelismo', false)
ON CONFLICT DO NOTHING;
