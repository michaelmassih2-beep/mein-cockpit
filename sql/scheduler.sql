-- project URL is a public routing address; authentication remains in a private table.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;
select cron.schedule('cockpit-notifications','* * * * *',
 $$select net.http_post(url:='https://zgobltdavlajupiinspo.supabase.co/functions/v1/cockpit/dispatch',headers:=jsonb_build_object('Content-Type','application/json','x-cockpit-scheduler',(select value->>'token' from cockpit_private.settings where key='scheduler')),body:='{}'::jsonb,timeout_milliseconds:=25000);$$);
