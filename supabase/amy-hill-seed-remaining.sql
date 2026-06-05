-- ════════════════════════════════════════════════════════════════════════════
-- Seed Amy Hill's remaining tour statuses (bid / in-progress / closed)
-- Project: abqiaxmnasjyqxmgzbqn   |   Run in the Supabase SQL Editor
--
-- Amy Hill   auth uid: 83203c33-c767-4366-96fa-6b428b7fb168  (amy@infinitytours.us)
--
-- The first Amy seed (supabase/amy-hill-seed.sql) only copied Linda's COMMITTED
-- demo tours. This adds copies of Linda's tours in the other statuses so Amy has
-- a full pipeline like Mike & Greta. The three sources, one per remaining status:
--   • bid          cb26ab1f-5318-43a5-a731-fbb9b0c2601b  Rigby HS Wind Ensemble - New York City - 2026
--   • in-progress  11111111-1111-1111-1111-111111111111  NYC Spring Musical Tour   (= Mike/Greta's "past"/underway tour)
--   • closed       0538bc32-bfdc-48ba-ace6-93b1eba210b6  Infinity Tours + Events - Spring Retreat (copy)
--
-- Same deep-copy method as before: tours → agenda_days → agenda_items →
-- tour_members → post_trip. (None of the sources have agenda_feedback rows.)
-- Fresh gen_random_uuid() ids; day→item links preserved by mapping on day_number.
-- Re-runnable: each tour is skipped if Amy already has one with the same name.
-- ════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_amy  uuid := '83203c33-c767-4366-96fa-6b428b7fb168';
  v_srcs uuid[] := ARRAY[
    'cb26ab1f-5318-43a5-a731-fbb9b0c2601b',  -- bid:         Rigby HS Wind Ensemble - New York City - 2026
    '11111111-1111-1111-1111-111111111111',  -- in-progress: NYC Spring Musical Tour
    '0538bc32-bfdc-48ba-ace6-93b1eba210b6'   -- closed:      Infinity Tours + Events - Spring Retreat (copy)
  ];
  v_src  uuid;
  v_new  uuid;
  v_name text;
BEGIN
  FOREACH v_src IN ARRAY v_srcs LOOP
    SELECT name INTO v_name FROM tours WHERE id = v_src;

    -- Skip if Amy already has this tour (idempotent re-run guard).
    IF EXISTS (SELECT 1 FROM tours WHERE tour_host_id = v_amy AND name = v_name) THEN
      RAISE NOTICE 'Skipping "%" — Amy already has it.', v_name;
      CONTINUE;
    END IF;

    v_new := gen_random_uuid();

    -- Tour row (new id + Amy as host; status and every other column copied verbatim).
    INSERT INTO tours (
      id, tour_host_id, name, school, contact_name, contact_email, contact_phone,
      planning_tour_host, traveling_tour_host, destination, alt_destination, dates,
      start_date, end_date, date_flexible, status, transport_type, bus_capacity,
      company_pct, room_config, student_count, boys_count, girls_count, activities,
      notes, access_codes
    )
    SELECT
      v_new, v_amy, name, school, contact_name, contact_email, contact_phone,
      planning_tour_host, traveling_tour_host, destination, alt_destination, dates,
      start_date, end_date, date_flexible, status, transport_type, bus_capacity,
      company_pct, room_config, student_count, boys_count, girls_count, activities,
      notes, access_codes
    FROM tours WHERE id = v_src;

    -- Agenda days (new ids) + agenda items, linked via day_number mapping.
    WITH src_days AS (
      SELECT id AS old_id, day_number, date, collapsed, sort_order
      FROM agenda_days WHERE tour_id = v_src
    ),
    ins_days AS (
      INSERT INTO agenda_days (id, tour_id, day_number, date, collapsed, sort_order)
      SELECT gen_random_uuid(), v_new, day_number, date, collapsed, sort_order
      FROM src_days
      RETURNING id AS new_id, day_number
    ),
    day_map AS (
      SELECT s.old_id, n.new_id
      FROM src_days s JOIN ins_days n ON n.day_number = s.day_number
    )
    INSERT INTO agenda_items (
      id, day_id, tour_id, sort_order, time, type, title, detail, public_note,
      address, map_link, website, travel_method, contact_name, contact_phone,
      contact_email, cost, cost_paid, driver_note, internal_note, meal_pay_type,
      stipend_amount, item_visibility, image_urls
    )
    SELECT
      gen_random_uuid(), dm.new_id, v_new, i.sort_order, i.time, i.type, i.title,
      i.detail, i.public_note, i.address, i.map_link, i.website, i.travel_method,
      i.contact_name, i.contact_phone, i.contact_email, i.cost, i.cost_paid,
      i.driver_note, i.internal_note, i.meal_pay_type, i.stipend_amount,
      i.item_visibility, i.image_urls
    FROM agenda_items i
    JOIN day_map dm ON dm.old_id = i.day_id
    WHERE i.tour_id = v_src;

    -- Tour members (new ids).
    INSERT INTO tour_members (id, tour_id, name, type, gender, waiver, notes, sort_order)
    SELECT gen_random_uuid(), v_new, name, type, gender, waiver, notes, sort_order
    FROM tour_members WHERE tour_id = v_src;

    -- Post-trip record (new id).
    INSERT INTO post_trip (
      id, tour_id, notes, school_feedback, what_worked, what_to_improve,
      do_next_time, do_not_repeat, completed
    )
    SELECT
      gen_random_uuid(), v_new, notes, school_feedback, what_worked, what_to_improve,
      do_next_time, do_not_repeat, completed
    FROM post_trip WHERE tour_id = v_src;

    RAISE NOTICE 'Copied "%" (% -> %) for Amy Hill.', v_name, v_src, v_new;
  END LOOP;
END $$;

-- ── Verify: Amy's full pipeline across all statuses ───────────────────────────
SELECT t.status, t.name,
       (SELECT count(*) FROM agenda_days  d WHERE d.tour_id = t.id) AS days,
       (SELECT count(*) FROM agenda_items i WHERE i.tour_id = t.id) AS items,
       (SELECT count(*) FROM tour_members m WHERE m.tour_id = t.id) AS members,
       (SELECT count(*) FROM post_trip    p WHERE p.tour_id = t.id) AS post_trip
FROM tours t
WHERE t.tour_host_id = '83203c33-c767-4366-96fa-6b428b7fb168'
ORDER BY t.status, t.name;
