create or replace function public.prune_old_finished_branch_paths(
  max_branch_rows integer default 20000,
  target_branch_rows integer default 19000,
  max_finished_games integer default 50
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  branch_total integer;
  deleted_total integer := 0;
  deleted_path_count integer;
  final_branch record;
  current_parent_payload text;
  next_parent_payload text;
  path_payloads text[];
begin
  if max_branch_rows < 1 then
    raise exception 'max_branch_rows must be positive';
  end if;

  if target_branch_rows < 0 or target_branch_rows >= max_branch_rows then
    raise exception 'target_branch_rows must be lower than max_branch_rows';
  end if;

  if max_finished_games < 1 then
    return 0;
  end if;

  select count(*)
    into branch_total
  from public.branches;

  if branch_total <= max_branch_rows then
    return 0;
  end if;

  for final_branch in
    select b.payload, b.parent_payload
    from public.branches as b
    where b.is_final = true
    order by b.recorded_at asc
    limit max_finished_games
  loop
    exit when branch_total - deleted_total <= target_branch_rows;

    if exists (
      select 1
      from public.branches as child
      where child.parent_payload = final_branch.payload
    ) then
      continue;
    end if;

    path_payloads := array[final_branch.payload];
    current_parent_payload := final_branch.parent_payload;

    while current_parent_payload is not null loop
      select b.parent_payload
        into next_parent_payload
      from public.branches as b
      where b.payload = current_parent_payload;

      if not found then
        exit;
      end if;

      if exists (
        select 1
        from public.branches as child
        where child.parent_payload = current_parent_payload
          and child.payload <> all(path_payloads)
      ) then
        exit;
      end if;

      path_payloads := array_append(path_payloads, current_parent_payload);
      current_parent_payload := next_parent_payload;
    end loop;

    delete from public.branches as b
    where b.payload = any(path_payloads);

    get diagnostics deleted_path_count = row_count;
    deleted_total := deleted_total + deleted_path_count;
  end loop;

  return deleted_total;
end;
$$;

revoke execute
on function public.prune_old_finished_branch_paths(integer, integer, integer)
from public, anon, authenticated;

grant execute
on function public.prune_old_finished_branch_paths(integer, integer, integer)
to service_role;
