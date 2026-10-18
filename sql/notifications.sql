-- Additive schema. No personal data, credentials, or deployment-specific secrets.
create schema if not exists cockpit_private;
revoke all on schema cockpit_private from public,anon,authenticated;
grant usage on schema cockpit_private to service_role;
create table if not exists cockpit_private.settings(key text primary key,value jsonb not null);
alter table cockpit_private.settings enable row level security;
grant all on cockpit_private.settings to service_role;
insert into cockpit_private.settings values ('scheduler',jsonb_build_object('token',encode(extensions.gen_random_bytes(32),'hex'))) on conflict do nothing;

create table if not exists public.cockpit_subscriptions(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique,subscription jsonb not null,created_at timestamptz not null default now()
);
create index if not exists cockpit_subscriptions_owner on public.cockpit_subscriptions(user_id);
create table if not exists public.cockpit_jobs(
 id uuid primary key default gen_random_uuid(),user_id uuid not null references auth.users(id) on delete cascade,
 entry_id text not null,title text not null check(length(title) between 1 and 180),body text not null default '' check(length(body)<=900),
 next_run timestamptz not null,repeat_days int not null default 0 check(repeat_days in (0,1,7)),timezone text not null default 'Europe/Berlin',
 channel text not null default 'push' check(channel in ('push','email')),
 state text not null default 'active' check(state in ('active','paused','completed','failed')),
 last_error text,last_sent_at timestamptz,lease_until timestamptz,attempts int not null default 0,
 created_at timestamptz not null default now(),unique(user_id,entry_id)
);
create index if not exists cockpit_jobs_due on public.cockpit_jobs(next_run) where state='active';
create table if not exists public.cockpit_deliveries(
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.cockpit_jobs(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,scheduled_for timestamptz not null,target text not null,
 channel text not null,state text not null check(state in ('accepted','failed')),detail text,created_at timestamptz not null default now(),
 unique(job_id,scheduled_for,target)
);
create index if not exists cockpit_deliveries_owner_date on public.cockpit_deliveries(user_id,created_at desc);
-- Clients can read their own statuses. All scheduling/subscription writes pass validated server routes.
alter table public.cockpit_subscriptions enable row level security;
alter table public.cockpit_jobs enable row level security;
alter table public.cockpit_deliveries enable row level security;
revoke all on public.cockpit_subscriptions,public.cockpit_jobs,public.cockpit_deliveries from public,anon,authenticated;
grant select on public.cockpit_jobs,public.cockpit_deliveries to authenticated;
grant all on public.cockpit_subscriptions,public.cockpit_jobs,public.cockpit_deliveries to service_role;
create policy jobs_owner on public.cockpit_jobs for select to authenticated using((select auth.uid())=user_id);
create policy deliveries_owner on public.cockpit_deliveries for select to authenticated using((select auth.uid())=user_id);
-- Non-exposed config, accessed through a service-only invoker function.
create or replace function public.cockpit_worker_settings() returns jsonb language sql security invoker set search_path='' as $$
 select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) from cockpit_private.settings;
$$;
create or replace function public.cockpit_worker_setting(setting_key text,setting_value jsonb) returns void language sql security invoker set search_path='' as $$
 insert into cockpit_private.settings(key,value) values(setting_key,setting_value) on conflict(key) do update set value=excluded.value;
$$;
create or replace function public.cockpit_claim_jobs() returns setof public.cockpit_jobs language sql security invoker set search_path='' as $$
 update public.cockpit_jobs j set lease_until=now()+interval '2 minutes',attempts=attempts+1
 where j.id in (select id from public.cockpit_jobs where state='active' and next_run<=now() and (lease_until is null or lease_until<now()) order by next_run for update skip locked limit 30) returning j.*;
$$;
create or replace function public.cockpit_finish_job(job_uuid uuid,scheduled_at timestamptz,error_message text) returns void language plpgsql security invoker set search_path='' as $$
 declare j public.cockpit_jobs;next_time timestamptz;
 begin
 select * into j from public.cockpit_jobs where id=job_uuid for update;
 if not found or j.state<>'active' or j.next_run<>scheduled_at then return;end if;
 if error_message is not null then
 update public.cockpit_jobs set last_error=left(error_message,200),lease_until=now()+interval '5 minutes',state=case when attempts>=6 then 'failed' else 'active' end where id=job_uuid;
 else
 if j.repeat_days>0 then
 next_time=((j.next_run at time zone j.timezone)+make_interval(days=>j.repeat_days)) at time zone j.timezone;
 while next_time<=now() loop next_time=((next_time at time zone j.timezone)+make_interval(days=>j.repeat_days)) at time zone j.timezone;end loop;
 end if;
 update public.cockpit_jobs set next_run=coalesce(next_time,next_run),state=case when repeat_days=0 then 'completed' else 'active' end,last_sent_at=now(),last_error=null,lease_until=null,attempts=0 where id=job_uuid;
 end if;
 end;$$;
revoke all on function public.cockpit_worker_settings(),public.cockpit_worker_setting(text,jsonb),public.cockpit_claim_jobs(),public.cockpit_finish_job(uuid,timestamptz,text) from public,anon,authenticated;
grant execute on function public.cockpit_worker_settings(),public.cockpit_worker_setting(text,jsonb),public.cockpit_claim_jobs(),public.cockpit_finish_job(uuid,timestamptz,text) to service_role;

create or replace function public.cockpit_worker_init(setting_key text,setting_value jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$declare result jsonb;begin insert into cockpit_private.settings(key,value) values(setting_key,setting_value) on conflict(key) do nothing;select value into result from cockpit_private.settings where key=setting_key;return result;end;$$;
revoke all on function public.cockpit_worker_init(text,jsonb) from public,anon,authenticated;
grant execute on function public.cockpit_worker_init(text,jsonb) to service_role;
