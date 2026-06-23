-- Add ai_enabled to contacts
ALTER TABLE public.contacts ADD COLUMN IF NOT EXISTS ai_enabled BOOLEAN DEFAULT true;

-- Allow owner to update automation user's contacts (needed for AI toggle)
DROP POLICY IF EXISTS "contacts_update" ON public.contacts;
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001');
