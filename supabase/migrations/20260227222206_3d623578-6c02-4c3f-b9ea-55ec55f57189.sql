
-- Create faq_labels join table (N:N between faqs and labels)
CREATE TABLE public.faq_labels (
  faq_id bigint NOT NULL REFERENCES public.faqs(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.labels(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (faq_id, label_id)
);

-- Enable RLS
ALTER TABLE public.faq_labels ENABLE ROW LEVEL SECURITY;

-- Policies matching the pattern from document_labels
CREATE POLICY "Admins manage all faq labels"
ON public.faq_labels FOR ALL
USING (EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Admins see all faq labels"
ON public.faq_labels FOR SELECT
USING (EXISTS (SELECT 1 FROM user_permissions WHERE user_id = auth.uid() AND is_admin = true));

CREATE POLICY "Users manage own company faq labels"
ON public.faq_labels FOR ALL
USING (faq_id IN (SELECT id FROM faqs WHERE id_empresa IN (SELECT empresa_id FROM user_empresa WHERE user_id = auth.uid())));

CREATE POLICY "Users see own company faq labels"
ON public.faq_labels FOR SELECT
USING (faq_id IN (SELECT id FROM faqs WHERE id_empresa IN (SELECT empresa_id FROM user_empresa WHERE user_id = auth.uid())));
