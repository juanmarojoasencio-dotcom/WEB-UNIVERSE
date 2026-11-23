# Project memory

## Product intent & audience

- App uses Supabase for authentication (email OTP-based login flow).
- User-facing auth UI is in Spanish; user communicates primarily in Spanish for support/clarification.

## Brand personality & voice

- Support responses are direct, step-by-step, and in Spanish.

## Visual design & UX direction

- Login screen now accepts **8-digit** OTP input (updated from 6 → 8 to match Supabase default).
- OTP input displays 8 individual boxes/casillas; verification button activates once all 8 digits are entered.
- UI text references "código de verificación de 8 dígitos".

## Decisions, constraints & rationale

- Auth provider: Supabase (email OTP, 8 digits by default).
- Supabase dashboard does not expose an accessible OTP length setting; "longitud mínima de la contraseña" is for passwords, not OTP.
- Decision: adapt frontend to accept 8-digit OTP rather than changing Supabase config — avoids dashboard dependency.
- `@/` path alias maps to `src/`; JSX + Tailwind + Lucide React are the default stack (no extra UI/icon packages).
- Vite + React framework.

## Open questions & assumptions

- Assumption: Supabase will always send 8-digit OTP by default (no further dashboard changes needed).
- No outstanding unresolved issues from this thread.