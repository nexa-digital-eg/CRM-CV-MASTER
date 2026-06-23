-- CV Master CRM - Initial Schema

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- n8n automation user (system user for WhatsApp bot)
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at,
  role, aud, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'n8n-automation@crm.internal', '', now(),
  'authenticated', 'authenticated', now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"n8n Automation","role":"automation"}'
) ON CONFLICT (id) DO NOTHING;

-- Contacts
CREATE TABLE IF NOT EXISTS public.contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  company TEXT,
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead','prospect','client','inactive')),
  avatar_url TEXT,
  notes TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT contacts_user_id_phone_key UNIQUE (user_id, phone)
);

-- Deals
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'new',
  description TEXT,
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Invoices
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  number TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  subtotal NUMERIC DEFAULT 0,
  tax NUMERIC DEFAULT 0,
  total NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'SAR',
  status TEXT DEFAULT 'draft',
  due_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activities
CREATE TABLE IF NOT EXISTS public.activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  deal_id UUID REFERENCES public.deals(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- WhatsApp Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  direction TEXT DEFAULT 'inbound',
  body TEXT NOT NULL,
  status TEXT DEFAULT 'received',
  is_ai BOOLEAN DEFAULT false,
  n8n_msg_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Settings
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  app_name TEXT DEFAULT 'CV Master CRM',
  logo_url TEXT,
  primary_color TEXT DEFAULT '#6366f1',
  locale TEXT DEFAULT 'ar',
  currency TEXT DEFAULT 'SAR',
  whatsapp_number TEXT,
  n8n_webhook_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── RLS ──────────────────────────────────────────────────

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Contacts: own rows + automation rows
CREATE POLICY "contacts_select" ON public.contacts FOR SELECT
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "contacts_insert" ON public.contacts FOR INSERT
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "contacts_update" ON public.contacts FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "contacts_delete" ON public.contacts FOR DELETE
  USING (auth.uid() = user_id);

-- Deals
CREATE POLICY "deals_all" ON public.deals FOR ALL USING (auth.uid() = user_id);

-- Tasks
CREATE POLICY "tasks_all" ON public.tasks FOR ALL USING (auth.uid() = user_id);

-- Invoices
CREATE POLICY "invoices_all" ON public.invoices FOR ALL USING (auth.uid() = user_id);

-- Activities
CREATE POLICY "activities_all" ON public.activities FOR ALL USING (auth.uid() = user_id);

-- WhatsApp Messages: own + automation
CREATE POLICY "wa_select" ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id OR user_id = '00000000-0000-0000-0000-000000000001');
CREATE POLICY "wa_insert" ON public.whatsapp_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Settings
CREATE POLICY "settings_all" ON public.settings FOR ALL USING (auth.uid() = user_id);

-- ── n8n RPC function ─────────────────────────────────────

CREATE OR REPLACE FUNCTION public.upsert_whatsapp_interaction(
  p_phone TEXT,
  p_name TEXT,
  p_message_in TEXT,
  p_message_out TEXT,
  p_n8n_msg_id TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_contact_id UUID;
  v_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.contacts (user_id, name, phone, whatsapp, status, created_at, updated_at)
  VALUES (v_user_id, p_name, p_phone, p_phone, 'lead', now(), now())
  ON CONFLICT (user_id, phone)
  DO UPDATE SET
    name = CASE WHEN p_name != 'عزيزي العميل' THEN EXCLUDED.name ELSE contacts.name END,
    whatsapp = EXCLUDED.whatsapp,
    updated_at = now()
  RETURNING id INTO v_contact_id;

  INSERT INTO public.whatsapp_messages (user_id, contact_id, phone, direction, body, status, is_ai, n8n_msg_id, created_at)
  VALUES (v_user_id, v_contact_id, p_phone, 'inbound', p_message_in, 'received', false, p_n8n_msg_id, now());

  INSERT INTO public.whatsapp_messages (user_id, contact_id, phone, direction, body, status, is_ai, created_at)
  VALUES (v_user_id, v_contact_id, p_phone, 'outbound', p_message_out, 'sent', true, now());

  RETURN jsonb_build_object('success', true, 'contact_id', v_contact_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_whatsapp_interaction TO anon;
