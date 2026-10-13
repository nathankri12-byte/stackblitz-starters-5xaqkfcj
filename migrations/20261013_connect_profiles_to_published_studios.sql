-- Connect user profiles to admin-configured, published fitness studios.
-- Applied to Supabase project qnouktkkbrwcdzgaqthi on 2026-10-13.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS selected_studio_id uuid NULL
  REFERENCES public.fitness_studios(id) ON DELETE SET NULL;

ALTER TABLE public.fitness_studios
  ADD COLUMN IF NOT EXISTS equipment text;

CREATE INDEX IF NOT EXISTS idx_profiles_selected_studio_id
  ON public.profiles(selected_studio_id);
