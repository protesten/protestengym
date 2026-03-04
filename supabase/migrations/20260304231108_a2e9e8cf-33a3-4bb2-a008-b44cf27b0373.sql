
-- Add columns to muscles table
ALTER TABLE public.muscles 
  ADD COLUMN IF NOT EXISTS recovery_category text NOT NULL DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS body_region text,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Update existing muscles with recovery categories from fatigue-config.ts
-- FAST recovery
UPDATE public.muscles SET recovery_category = 'fast', body_region = 'Gemelos' WHERE id IN (35, 36, 37);
UPDATE public.muscles SET recovery_category = 'fast', body_region = 'Piernas (otros)' WHERE id = 44;
UPDATE public.muscles SET recovery_category = 'fast', body_region = 'Core' WHERE id IN (45, 46, 47, 48);
UPDATE public.muscles SET recovery_category = 'fast', body_region = 'Antebrazos' WHERE id IN (23, 24);
UPDATE public.muscles SET recovery_category = 'fast', body_region = 'Hombros' WHERE id IN (14, 15);

-- MEDIUM recovery
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Pecho' WHERE id IN (1, 2);
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Espalda' WHERE id IN (3, 4, 5, 6, 7, 8, 9, 10, 11);
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Hombros' WHERE id = 13;
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Bíceps' WHERE id IN (16, 17, 18);
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Tríceps' WHERE id IN (19, 20, 21);
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Antebrazos' WHERE id = 22;
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Glúteos' WHERE id IN (30, 31);
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Piernas (otros)' WHERE id = 43;
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Core' WHERE id = 49;
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Core' WHERE id = 50;
UPDATE public.muscles SET recovery_category = 'medium', body_region = 'Hombros' WHERE id = 51;

-- SLOW recovery
UPDATE public.muscles SET recovery_category = 'slow', body_region = 'Glúteos' WHERE id = 29;
UPDATE public.muscles SET recovery_category = 'slow', body_region = 'Cuádriceps' WHERE id IN (25, 26, 27, 28);
UPDATE public.muscles SET recovery_category = 'slow', body_region = 'Isquiotibiales' WHERE id IN (32, 33, 34);
UPDATE public.muscles SET recovery_category = 'slow', body_region = 'Espalda' WHERE id = 12;
UPDATE public.muscles SET recovery_category = 'slow', body_region = 'Aductores' WHERE id IN (38, 39, 40, 41, 42);

-- Insert additional inactive muscles (common muscles not yet in the system)
INSERT INTO public.muscles (name, recovery_category, body_region, is_active) VALUES
  ('Supraespinoso', 'medium', 'Hombros', false),
  ('Subescapular', 'medium', 'Hombros', false),
  ('Piriforme', 'medium', 'Glúteos', false),
  ('Cuadrado lumbar', 'slow', 'Core', false),
  ('Diafragma', 'fast', 'Core', false),
  ('Elevador de la escápula', 'medium', 'Espalda', false),
  ('Esternocleidomastoideo', 'fast', 'Cuello', false),
  ('Escalenos', 'fast', 'Cuello', false),
  ('Pronador redondo', 'fast', 'Antebrazos', false),
  ('Supinador', 'fast', 'Antebrazos', false),
  ('Poplíteo', 'fast', 'Piernas (otros)', false),
  ('Plantar delgado', 'fast', 'Gemelos', false),
  ('Peroneos', 'fast', 'Piernas (otros)', false),
  ('Glúteo menor profundo', 'medium', 'Glúteos', false),
  ('Iliopsoas', 'medium', 'Core', false),
  ('Obturador interno', 'medium', 'Glúteos', false),
  ('Obturador externo', 'medium', 'Glúteos', false)
ON CONFLICT DO NOTHING;

-- RLS: Allow authenticated users to UPDATE muscles (for toggling is_active)
CREATE POLICY "Authenticated users can update muscles"
  ON public.muscles
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);
