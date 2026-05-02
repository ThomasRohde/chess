create extension if not exists pgcrypto with schema extensions;

create table if not exists public.branches (
  id uuid primary key default extensions.gen_random_uuid(),
  payload text not null,
  parent_payload text,
  parent_fen text not null,
  fen text not null,
  published_by text not null,
  last_move_uci text not null,
  last_move_san text not null,
  status_kind text not null,
  status_label text not null,
  side_to_move text not null,
  is_final boolean not null,
  state_created_at timestamptz not null,
  recorded_at timestamptz not null default now(),

  constraint branches_payload_key unique (payload),
  constraint branches_payload_length check (char_length(payload) between 1 and 512),
  constraint branches_parent_payload_length check (
    parent_payload is null or char_length(parent_payload) between 1 and 512
  ),
  constraint branches_published_by_length check (char_length(published_by) between 1 and 24),
  constraint branches_last_move_uci_length check (char_length(last_move_uci) between 4 and 5),
  constraint branches_status_kind_check check (
    status_kind in ('active', 'check', 'checkmate', 'stalemate', 'draw')
  ),
  constraint branches_side_to_move_check check (side_to_move in ('white', 'black'))
);

alter table public.branches enable row level security;

drop policy if exists "Branches are readable by everyone." on public.branches;
create policy "Branches are readable by everyone."
  on public.branches
  for select
  to anon, authenticated
  using (true);

grant select on public.branches to anon, authenticated;

create index if not exists branches_parent_payload_idx
  on public.branches (parent_payload);

create index if not exists branches_open_recent_idx
  on public.branches (recorded_at desc)
  where is_final = false;

create index if not exists branches_finished_recent_idx
  on public.branches (recorded_at desc)
  where is_final = true;

create index if not exists branches_status_recent_idx
  on public.branches (status_kind, recorded_at desc);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'branches'
  ) then
    alter publication supabase_realtime add table public.branches;
  end if;
end
$$;
