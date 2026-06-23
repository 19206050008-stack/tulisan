-- TTS voice preference per user - 2026-06-23
-- Adds per-user narrator voice (one of the 10 SupertonicTTS voices:
-- sari, dewi, ayu, rina, maya, budi, agus, bayu, dimas, andi).
--
-- Also ensures the older tts_gender / tts_speed columns exist (used as cache).
--
-- NOTE: schema-qualified with "public." to avoid "relation does not exist"
-- in the Supabase SQL editor.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tts_gender TEXT DEFAULT 'wanita';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tts_speed  REAL DEFAULT 1.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tts_voice  TEXT DEFAULT 'sari';
