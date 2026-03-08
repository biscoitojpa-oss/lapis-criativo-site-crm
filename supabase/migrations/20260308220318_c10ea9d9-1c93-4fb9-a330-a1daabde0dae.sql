ALTER TABLE public.whatsapp_config
  ADD COLUMN IF NOT EXISTS followup_dias_inatividade integer NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS followup_max_tentativas integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS followup_horario_inicio text NOT NULL DEFAULT '10:00',
  ADD COLUMN IF NOT EXISTS followup_horario_fim text NOT NULL DEFAULT '19:00',
  ADD COLUMN IF NOT EXISTS followup_ativo boolean NOT NULL DEFAULT true;