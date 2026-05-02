revoke insert, update, delete, truncate, references, trigger
on table public.branches
from anon, authenticated;

grant select
on table public.branches
to anon, authenticated;
