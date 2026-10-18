-- Transaction-only integration test. Synthetic identities are rolled back.
begin;
insert into auth.users(id,email) values('00000000-0000-4000-8000-000000000001','cockpit-test-a@example.invalid'),('00000000-0000-4000-8000-000000000002','cockpit-test-b@example.invalid');
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000001","role":"authenticated"}',true);
do $$declare v bigint;begin
 v:=public.save_cockpit_vault(null,'testcipher','123456789012','1234567890123456');if v<>1 then raise exception 'initial_version_failed';end if;
 v:=public.save_cockpit_vault(1,'changed','123456789012','1234567890123456');if v<>2 then raise exception 'update_version_failed';end if;
 begin perform public.save_cockpit_vault(1,'stale','123456789012','1234567890123456');raise exception 'stale_write_was_accepted';exception when serialization_failure then null;end;
 if (select count(*) from public.cockpit_vault)<>1 then raise exception 'owner_read_failed';end if;
end$$;
select set_config('request.jwt.claims','{"sub":"00000000-0000-4000-8000-000000000002","role":"authenticated"}',true);
do $$begin
 if exists(select 1 from public.cockpit_vault) then raise exception 'cross_user_read_allowed';end if;
 begin insert into public.cockpit_vault(user_id,ciphertext,iv,salt) values('00000000-0000-4000-8000-000000000001','attack','123456789012','1234567890123456');raise exception 'cross_user_insert_allowed';exception when insufficient_privilege then null;end;
 begin perform public.cockpit_worker_settings();raise exception 'worker_secrets_exposed';exception when insufficient_privilege then null;end;
end$$;
set local role anon;
do $$begin
 begin perform * from public.cockpit_vault;raise exception 'anonymous_read_allowed';exception when insufficient_privilege then null;end;
 begin perform public.cockpit_claim_jobs();raise exception 'anonymous_worker_allowed';exception when insufficient_privilege then null;end;
end$$;
rollback;
select 'PASS: initial write, CAS, stale write rejection, owner isolation, private worker settings, anonymous denial; test identities rolled back' as result;
