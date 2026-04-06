ALTER TABLE public.tasks
DROP CONSTRAINT IF EXISTS tasks_status_check;

ALTER TABLE public.tasks
ADD CONSTRAINT tasks_status_check CHECK (status IN (
  'broke','fixed',
  'open','closed',
  'lost','found',
  'dirty','cleaned',
  'pending','complete',
  'draft','sent',
  'idea','launched',
  'due','paid'
));
