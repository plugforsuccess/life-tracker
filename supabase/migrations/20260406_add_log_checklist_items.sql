ALTER TABLE public.tasks
ADD COLUMN IF NOT EXISTS log_checklist_items boolean NOT NULL DEFAULT false;
