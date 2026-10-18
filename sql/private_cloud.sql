-- Mein Cockpit: private, per-user, ciphertext-only storage.
-- Run in the SQL Editor of YOUR OWN Supabase project.
-- Only authenticated users can read or modify their OWN encrypted row.
create table if not exists public.cockpit_vault (
  user_id uuid primary key references auth.users(id) on delete cascade,
  version bigint not null default 1 check (version > 0),
  ciphertext text not null check (length(ciphertext) between 1 and 1600000),
  iv text not null check (length(iv) between 12 and 64),
  salt text not null check (length(salt) between 16 and 128),
  updated_at timestamptz not null default now()
);

alter table public.cockpit_vault enable row level security;
revoke all on public.cockpit_vault from anon, public;
grant select, insert, update on public.cockpit_vault to authenticated;

-- Drop before recreate so rerunning is idempotent.
drop policy if exists "cockpit_vault_owner_select" on public.cockpit_vault;
drop policy if exists "cockpit_vault_owner_insert" on public.cockpit_vault;
drop policy if exists "cockpit_vault_owner_update" on public.cockpit_vault;
create policy "cockpit_vault_owner_select" on public.cockpit_vault
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "cockpit_vault_owner_insert" on public.cockpit_vault
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "cockpit_vault_owner_update" on public.cockpit_vault
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Compare-and-swap prevents a second device from silently overwriting a first device.
create or replace function public.save_cockpit_vault(
  expected_version bigint,
  new_ciphertext text,
  new_iv text,
  new_salt text
) returns bigint
language plpgsql
security invoker
set search_path = ''
as $$
declare saved_version bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'authentication_required' using errcode = '28000';
  end if;
  if length(new_ciphertext) not between 1 and 1600000
    or length(new_iv) not between 12 and 64
    or length(new_salt) not between 16 and 128 then
    raise exception 'invalid_ciphertext' using errcode = '22023';
  end if;

  if expected_version is null then
    insert into public.cockpit_vault(user_id, ciphertext, iv, salt)
    values ((select auth.uid()), new_ciphertext, new_iv, new_salt)
    on conflict (user_id) do nothing
    returning version into saved_version;
  else
    update public.cockpit_vault
      set ciphertext = new_ciphertext, iv = new_iv, salt = new_salt,
          version = version + 1, updated_at = now()
      where user_id = (select auth.uid()) and version = expected_version
      returning version into saved_version;
  end if;
  if saved_version is null then
    raise exception 'version_conflict' using errcode = '40001';
  end if;
  return saved_version;
end;
$$;
revoke all on function public.save_cockpit_vault(bigint,text,text,text) from public, anon;
grant execute on function public.save_cockpit_vault(bigint,text,text,text) to authenticated;
