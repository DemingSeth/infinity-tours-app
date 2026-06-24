-- Backfill per-persona access codes for the shareable per-persona links.
--
-- tours.access_codes is ALREADY a per-persona map keyed by codeKey
-- (coordinator | teacher | student | chaperone | driver), so there is no schema
-- change here and get_shared_tour is untouched. This migration only fills in a
-- code for any ACTIVE persona that is currently missing one, so every active
-- persona has a working /tour/:id/view?c=<code> link immediately.
--
-- Codes are unguessable and non-sequential: 10 chars sourced from gen_random_uuid()
-- (122 bits of randomness), uppercased. gen_random_uuid() is built in on the
-- Postgres versions Supabase runs; no extension is required.
--
-- Persona key -> codeKey mapping (matches lib/helpers.ts PERSONAS):
--   tour_host  -> coordinator
--   teacher    -> teacher
--   student    -> student
--   chaperone  -> chaperone
--   bus_driver -> driver
--
-- Idempotent: a persona whose code is already a non-empty string is left as-is,
-- so re-running this never rotates an existing code or invalidates a live link.

do $$
declare
  t            record;
  persona_key  text;
  code_key     text;
  codes        jsonb;
  new_code     text;
begin
  for t in select id, access_codes, active_personas from tours loop
    codes := coalesce(t.access_codes, '{}'::jsonb);

    foreach persona_key in array coalesce(t.active_personas, array[]::text[]) loop
      code_key := case persona_key
        when 'tour_host'  then 'coordinator'
        when 'teacher'    then 'teacher'
        when 'student'    then 'student'
        when 'chaperone'  then 'chaperone'
        when 'bus_driver' then 'driver'
        else null
      end;

      if code_key is null then
        continue;
      end if;

      -- Only generate when the persona has no non-empty code yet.
      if coalesce(nullif(trim(codes ->> code_key), ''), '') = '' then
        new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
        codes := jsonb_set(codes, array[code_key], to_jsonb(new_code), true);
      end if;
    end loop;

    if codes is distinct from coalesce(t.access_codes, '{}'::jsonb) then
      update tours set access_codes = codes where id = t.id;
    end if;
  end loop;
end $$;
