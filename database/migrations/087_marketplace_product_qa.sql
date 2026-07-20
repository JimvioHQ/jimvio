-- Marketplace v2: Product Q&A (additive)
CREATE TABLE IF NOT EXISTS public.product_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  asker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 3 AND 2000),
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id UUID NOT NULL REFERENCES public.product_questions(id) ON DELETE CASCADE,
  answerer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 4000),
  is_seller BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_questions_product
  ON public.product_questions(product_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_product_answers_question
  ON public.product_answers(question_id, created_at ASC);

ALTER TABLE public.product_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_questions_select ON public.product_questions;
CREATE POLICY product_questions_select ON public.product_questions
  FOR SELECT USING (is_public = true OR asker_id = auth.uid());

DROP POLICY IF EXISTS product_questions_insert ON public.product_questions;
CREATE POLICY product_questions_insert ON public.product_questions
  FOR INSERT WITH CHECK (asker_id = auth.uid());

DROP POLICY IF EXISTS product_answers_select ON public.product_answers;
CREATE POLICY product_answers_select ON public.product_answers
  FOR SELECT USING (true);

DROP POLICY IF EXISTS product_answers_insert ON public.product_answers;
CREATE POLICY product_answers_insert ON public.product_answers
  FOR INSERT WITH CHECK (answerer_id = auth.uid());
