-- 013 Demo-account (rondleiding): kan inloggen en alle schermen zien, maar leest of wijzigt GEEN echte gegevens.
-- Werking:
--  * Een demo-gebruiker heeft in auth.users raw_app_meta_data {"demo": true} (alleen service role kan dat zetten)
--    en een profiel met rol 'demo'. flowsmid.is_demo() leest dat uit de JWT, zonder tabel-lookup.
--  * Op ELKE tabel met RLS in flowsmid, public en mtf_ob staat een RESTRICTIVE policy "demo_alleen_kijken":
--    voor een demo-JWT is het resultaat altijd leeg en elke schrijfactie wordt geweigerd.
--  * Een event trigger zet die policy automatisch op nieuwe tabellen (CREATE TABLE / ENABLE RLS) in die schema's.
--  * storage.objects krijgt dezelfde restrictive policy (geen bestanden lezen of uploaden).
--  * De nepgegevens die de demo-gebruiker in beeld ziet komen uit https://flowsmid.nl/demomodus.js (in de browser),
--    die het tabel-schema ophaalt via flowsmid.demo_schema() (alleen kolomnamen/typen, geen inhoud).

alter table flowsmid.profielen drop constraint if exists profielen_rol_check;
alter table flowsmid.profielen add constraint profielen_rol_check check (rol in ('beheerder','klant','demo'));
alter table flowsmid.profielen drop constraint if exists profielen_check;
alter table flowsmid.profielen add constraint profielen_check check (rol in ('beheerder','demo') or klant_id is not null);

create or replace function flowsmid.is_demo() returns boolean
language sql stable set search_path = '' as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'demo')::boolean, false)
$$;
grant execute on function flowsmid.is_demo() to authenticated, anon, service_role;

-- Zet de restrictive demo-policy op één tabel (idempotent)
create or replace function flowsmid.demo_beleid_zetten(p_tabel regclass) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from pg_policies p join pg_class c on c.relname = p.tablename join pg_namespace n on n.oid = c.relnamespace and n.nspname = p.schemaname
             where c.oid = p_tabel and p.policyname = 'demo_alleen_kijken') then return; end if;
  execute format('create policy demo_alleen_kijken on %s as restrictive for all to authenticated using ((select not flowsmid.is_demo())) with check ((select not flowsmid.is_demo()))', p_tabel);
exception when others then
  raise warning 'demo-policy niet gezet op %: %', p_tabel, sqlerrm;  -- nooit een andere migratie laten mislukken
end $$;
revoke all on function flowsmid.demo_beleid_zetten(regclass) from public, anon, authenticated;

do $$ declare r record; begin
  for r in select c.oid from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname in ('flowsmid','public','mtf_ob') and c.relkind in ('r','p') and c.relrowsecurity loop
    perform flowsmid.demo_beleid_zetten(r.oid::regclass);
  end loop;
end $$;

-- Opslag: demo leest of schrijft geen bestanden
drop policy if exists demo_alleen_kijken on storage.objects;
create policy demo_alleen_kijken on storage.objects as restrictive for all to authenticated
  using ((select not flowsmid.is_demo())) with check ((select not flowsmid.is_demo()));

-- Toekomstige tabellen: automatisch dezelfde policy
create or replace function flowsmid.demo_beleid_nieuwe_tabel() returns event_trigger
language plpgsql security definer set search_path = '' as $$
declare r record;
begin
  for r in select objid from pg_event_trigger_ddl_commands()
           where object_type = 'table' and schema_name in ('flowsmid','public','mtf_ob') loop
    if exists (select 1 from pg_class where oid = r.objid and relrowsecurity) then
      perform flowsmid.demo_beleid_zetten(r.objid::regclass);
    end if;
  end loop;
end $$;
drop event trigger if exists flowsmid_demo_beleid;
create event trigger flowsmid_demo_beleid on ddl_command_end
  when tag in ('CREATE TABLE', 'ALTER TABLE', 'CREATE TABLE AS', 'SELECT INTO')
  execute function flowsmid.demo_beleid_nieuwe_tabel();

-- Alleen de vorm van de database (kolommen, toegestane waarden, koppelingen, functies) voor de nepgegevens in demomodus.js
create or replace function flowsmid.demo_schema() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when flowsmid.is_demo() then jsonb_build_object(
    'tabellen', (
      select jsonb_object_agg(n.nspname || '.' || c.relname, jsonb_build_object(
        'k', (select jsonb_agg(jsonb_build_array(a.attname, format_type(a.atttypid, a.atttypmod),
                (select to_jsonb(array_agg(distinct w[1])) from pg_constraint k, regexp_matches(pg_get_constraintdef(k.oid), '''([^'']*)''::text', 'g') w
                  where k.conrelid = c.oid and k.contype = 'c' and array_length(k.conkey, 1) = 1 and k.conkey[1] = a.attnum)) order by a.attnum)
              from pg_attribute a where a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped),
        'fk', (select jsonb_object_agg(a.attname, fn.nspname || '.' || fc.relname)
               from pg_constraint k join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
               join pg_class fc on fc.oid = k.confrelid join pg_namespace fn on fn.oid = fc.relnamespace
               where k.conrelid = c.oid and k.contype = 'f' and array_length(k.conkey, 1) = 1),
        'u', (select jsonb_agg(distinct a.attname) from pg_index i join pg_attribute a on a.attrelid = i.indrelid and a.attnum = i.indkey[0]
              where i.indrelid = c.oid and i.indisunique and i.indnatts = 1)))
      from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname in ('flowsmid','public','mtf_ob') and c.relkind in ('r','v','p','m')),
    'functies', (
      select jsonb_object_agg(n.nspname || '.' || p.proname, jsonb_build_object(
        'r', format_type(p.prorettype, null), 'set', p.proretset,
        't', (select n2.nspname || '.' || c2.relname from pg_type t join pg_class c2 on c2.oid = t.typrelid join pg_namespace n2 on n2.oid = c2.relnamespace where t.oid = p.prorettype and c2.relkind in ('r','v','p')),
        'uit', (select jsonb_agg(jsonb_build_array(p.proargnames[i], format_type(p.proallargtypes[i], null)))
                from generate_subscripts(p.proallargtypes, 1) i where p.proargmodes[i] in ('o','t'))))
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('flowsmid','public','mtf_ob') and p.prokind = 'f')
  ) end
$$;
revoke all on function flowsmid.demo_schema() from public, anon;
grant execute on function flowsmid.demo_schema() to authenticated;
