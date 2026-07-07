-- ════════════════════════════════════════════════════════════════════════════
-- SEED: The School of Dance SLC, New York City (Jul 13 to 18, 2026)
-- Tour host: Mike Crockett (bd366afb-41af-4ac2-8080-b5dec1e49dea)
--
-- DATA ONLY. Not a migration, not a schema change. Run once by hand in the
-- Supabase SQL Editor. Idempotent: the tour insert is guarded with
-- on conflict (id) do nothing; the roster and the days/items only insert when
-- they do not already exist for this tour, so re-running never duplicates and
-- never overwrites later edits made in the app.
--
-- Real values verified against the live schema:
--   status in (bid, committed, in-progress, closed)  -> committed
--   transport_type in (bus, flight)  -> flight (no "air" value; flights in notes/items)
--   agenda_items.persona_visibility keys: student/teacher/chaperone/tour_host/bus_driver
--   agenda_items.travel_methods/activity_subtypes: text[];  meal_money: jsonb
--   tour_members.type in (student, chaperone, teacher, tour-host, driver); gender male/female
--   No rooming table exists -> rooming is held in tours.notes
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Tour record ──────────────────────────────────────────────────────────
insert into tours (
  id, tour_host_id, name, school, contact_name, destination, dates,
  start_date, end_date, status, transport_type, student_count, access_codes, notes
) values (
  '5cd0a17e-0000-4000-8000-5c4001da0c17',
  'bd366afb-41af-4ac2-8080-b5dec1e49dea',
  'The School of Dance SLC - New York City',
  'The School of Dance SLC',
  'Kylie Mimitz',
  'New York, NY',
  'Jul 13-18, 2026',
  '2026-07-13',
  '2026-07-18',
  'committed',
  'flight',
  11,
  '{"coordinator":"DANCE26","teacher":"TEACH26","student":"STAGE26","chaperone":"CHAP26","driver":"DRIVE26"}'::jsonb,
  'Participants: 21 total. 5 teachers, 4 chaperones, 11 students, 1 tour host.

Hotel: Holiday Inn Express Times Square, 343 West 29th Street, New York, NY 10018.

Flight out: Mon Jul 13, Delta DL 671, departs SLC 2:35 PM, arrives JFK 9:25 PM. Conf HNHBLA / HNBT7R / F8WM3V.
Flight home: Sat Jul 18, Delta DL 1333, departs EWR (Newark) 4:29 PM, arrives SLC 7:41 PM. Same confirmations.

Pending and still moving:
- 36 Chambaz intensive Tue and Wed: requested and pending.
- BDC Broadway workshop Thu: confirmed, payment in progress.
- BDC Ballet Fri and Ailey Horton Sat: requested and pending.
- Hard Rock Cafe group dinner: under consideration for Tue around 5 PM or Thu evening, placement TBD.
- Edge observation deck: group tickets pending.
- Return flight changes pending for Louisa Wachter-Kulakowski (staying East Coast, grandmother pickup Sat) and Ora Barnitz (change requested).
- Kestrel Kious ticketing pending (replaces M. Barth).
- Emi Crockett flight pending.

Rooming (9 rooms):
Room 1, Triple, Adults (F): Kylie Mimitz, Claire Michaelson, Kaitlyn Miller.
Room 2, Double (F): Chelsea Zussman (mom of Quinn), Quinn Khalighi.
Room 3, Double (F): Emily Spivak (mom of Cora), Cora Spivak.
Room 4, Double, Adults (M): Christopher Valdez, Bryson Kerr.
Room 5, Double, Students (M): Henry Brigdon, Trent Mercado.
Room 6, Double, Adults (F): Daysha Moore, Alison Harris.
Room 7, Quad, Students (F): Juniper Andrews, Elle Moore, Kestrel Kious (pending).
Room 8, Quad, Students (F): Ora Barnitz, Louisa Wachter-Kulakowski, Jeanie Fleishman.
Room 9, Double, Tour Host: Mike Crockett, Emi Crockett (daughter of tour host).'
)
on conflict (id) do nothing;

-- ── 2. Roster (tour_members) ────────────────────────────────────────────────
-- Guarded so re-running never duplicates the roster.
insert into tour_members (tour_id, name, type, gender, sort_order, notes)
select '5cd0a17e-0000-4000-8000-5c4001da0c17'::uuid, m.name, m.type, m.gender, m.so, m.notes
from (values
  ('Kylie Mimitz',                  'teacher',   'female',  1, 'Teacher (comped). Conf HNHBLA / HNBT7R.'),
  ('Christopher Travis Valdez',     'teacher',   'male',    2, 'Teacher (comped). Conf HNHBLA.'),
  ('Claire Michaelson',             'teacher',   'female',  3, 'Teacher (comped). Conf F8WM3V.'),
  ('Bryson Kerr',                   'teacher',   'male',    4, 'Teacher (comped). Conf F8WM3V.'),
  ('Kaitlyn Miller',                'teacher',   'female',  5, 'Teacher ground package. Ground only.'),
  ('Emily Spivak',                  'chaperone', 'female',  6, 'Ground plus double. Ground only. Mom of Cora.'),
  ('Chelsea Zussman',               'chaperone', 'female',  7, 'Ground plus double. Ground only, arriving early. Mom of Quinn.'),
  ('Daysha Moore',                  'chaperone', 'female',  8, 'Ground plus double. Ground only.'),
  ('Alison Harris',                 'chaperone', 'female',  9, 'Ground plus double. Ground only.'),
  ('Juniper Eve Kurzhals Andrews',  'student',   'female', 10, 'Full package. Conf HNHBLA / HNBT7R.'),
  ('Ora Marie Barnitz',             'student',   'female', 11, 'Full package. Conf HNHBLA / HNBT7R. Change requested.'),
  ('Kestrel Kious',                 'student',   'female', 12, 'Full package pending. Ticketing pending, replaces M. Barth.'),
  ('Henry Kye Brigdon',             'student',   'male',   13, 'Full package. Conf HNHBLA / HNBT7R.'),
  ('Jean Luelle Fleishman',         'student',   'female', 14, 'Full package. Conf HNHBLA / HNBT7R.'),
  ('Quinn Khalighi',                'student',   'female', 15, 'Ground package. Ground only.'),
  ('Trent Mercado',                 'student',   'male',   16, 'Full package. Conf HNHBLA / HNBT7R.'),
  ('Elle Moore',                    'student',   'female', 17, 'Full package. Conf HNHBLA / HNBT7R.'),
  ('Cora Spivak',                   'student',   'female', 18, 'Ground plus double. Ground only.'),
  ('Louisa Wachter-Kulakowski',     'student',   'female', 19, 'Full package. Conf HNHBLA / HNBT7R. Staying East Coast, grandmother pickup Sat.'),
  ('Emi Crockett',                  'student',   'female', 20, 'Full package. Flight pending. Daughter of tour host.'),
  ('Mike Crockett',                 'tour-host', 'male',   21, 'Tour host, comped. Conf HNHBLA.')
) as m(name, type, gender, so, notes)
where not exists (
  select 1 from tour_members tm where tm.tour_id = '5cd0a17e-0000-4000-8000-5c4001da0c17'::uuid
);

-- ── 3. Itinerary days + items ───────────────────────────────────────────────
-- Days are created only if this tour has none yet; items join to the days by
-- day_number. If days already exist, the CTE inserts zero days and the items
-- insert becomes a no-op, so later in-app edits are never clobbered.
with d as (
  insert into agenda_days (tour_id, day_number, date, sort_order)
  select '5cd0a17e-0000-4000-8000-5c4001da0c17'::uuid, v.n, v.dt, v.n
  from (values
    (1, 'Jul 13, 2026'),
    (2, 'Jul 14, 2026'),
    (3, 'Jul 15, 2026'),
    (4, 'Jul 16, 2026'),
    (5, 'Jul 17, 2026'),
    (6, 'Jul 18, 2026')
  ) as v(n, dt)
  where not exists (
    select 1 from agenda_days ad where ad.tour_id = '5cd0a17e-0000-4000-8000-5c4001da0c17'::uuid
  )
  returning id, day_number
)
insert into agenda_items (
  day_id, tour_id, sort_order, time, type, title, public_note, internal_note,
  address, travel_method, travel_methods, activity_subtype, activity_subtypes,
  meal_money, persona_visibility
)
select
  d.id,
  '5cd0a17e-0000-4000-8000-5c4001da0c17'::uuid,
  i.so, i.tm, i.ty, i.title, i.pub, i.intn, i.addr,
  i.tmeth, i.tmarr::text[], i.subv, i.subarr::text[], i.meal::jsonb,
  '{"student":true,"teacher":true,"chaperone":true,"tour_host":true,"bus_driver":false}'::jsonb
from (values
  -- DAY 1  Monday, July 13 (Travel Day)
  (1, 1, '8:45 AM',  'meeting', 'Meet at SLC Airport, Delta check-in area', 'Travel comfortably. Pack dance gear in your carry on.', null, 'Salt Lake City International Airport, Salt Lake City, UT', null, '{}', null, '{}', '[]'),
  (1, 2, '1:00 PM',  'travel',  'Check in and security, Delta DL 671', 'Seats assigned at gate.', 'Conf HNHBLA / HNBT7R / F8WM3V.', null, null, '{}', null, '{}', '[]'),
  (1, 3, '2:35 PM',  'travel',  'Flight departs SLC', 'Lunch on your own at the airport before boarding.', 'Delta DL 671. Departs SLC 2:35 PM, arrives JFK 9:25 PM.', null, 'flight', '{flight}', null, '{}', '[]'),
  (1, 4, '9:25 PM',  'travel',  'Arrive JFK', 'Gather luggage, around 10:00 PM.', null, 'John F. Kennedy International Airport, Queens, NY', null, '{}', null, '{}', '[]'),
  (1, 5, '10:15 PM', 'travel',  'AirTrain and transfer into Manhattan', null, null, null, 'subway', '{subway}', null, '{}', '[]'),
  (1, 6, '11:00 PM', 'hotel',   'Check in, Holiday Inn Express Times Square', 'Lights out, big week ahead.', null, '343 West 29th Street, New York, NY 10018', null, '{}', null, '{}', '[]'),

  -- DAY 2  Tuesday, July 14 (Intensive 1 and Downtown)
  (2, 1, '8:00 AM',  'food',     'Breakfast at hotel', null, null, null, null, '{}', null, '{}', '[{"type":"hotel_breakfast"}]'),
  (2, 2, '9:15 AM',  'travel',   'Subway to Union Square', null, null, null, 'subway', '{subway}', null, '{}', '[]'),
  (2, 3, '10:00 AM', 'activity', '36 Chambaz of Stylz, Intensive 1', '10:00 AM to 1:00 PM. Peri Dance Studio, 126 E 13th St.', 'Pending (requested).', '126 East 13th Street, New York, NY', null, '{}', null, '{}', '[]'),
  (2, 4, '1:00 PM',  'food',     'Lunch on your own', 'Union Square and Washington Square Park area.', null, null, null, '{}', null, '{}', '[]'),
  (2, 5, '2:30 PM',  'travel',   'Subway to Whitehall / South Ferry', null, null, null, 'subway', '{subway}', null, '{}', '[]'),
  (2, 6, '3:00 PM',  'activity', 'Staten Island Ferry, round trip', 'Free. Harbor views of the Statue of Liberty and skyline.', null, 'Staten Island Ferry, Whitehall Terminal, New York, NY', null, '{}', null, '{}', '[]'),
  (2, 7, '4:15 PM',  'activity', '9/11 Memorial', 'Reflecting pools, outdoor memorial.', null, '180 Greenwich Street, New York, NY', null, '{}', null, '{}', '[]'),
  (2, 8, '5:00 PM',  'activity', 'Downtown walking tour', 'Wall St, Charging Bull, Trinity Church, and Hamilton''s grave.', null, null, 'walking', '{walking}', null, '{}', '[]'),
  (2, 9, '6:00 PM',  'free',     'Return to hotel, get ready for dinner and show', 'Dinner TBD. Hard Rock Cafe option, Tue vs Thu.', 'Group dinner under consideration for Tue around 5 PM or Thu evening, placement TBD.', null, null, '{}', null, '{}', '[]'),
  (2, 10,'7:00 PM',  'activity', 'MJ The Musical', 'Neil Simon Theatre, 250 W 52nd St.', null, '250 West 52nd Street, New York, NY', null, '{}', 'broadway', '{broadway}', '[]'),
  (2, 11,'10:00 PM', 'free',     'Free time', 'Times Square, then hotel.', null, null, null, '{}', null, '{}', '[]'),

  -- DAY 3  Wednesday, July 15 (Intensive 2, Brooklyn Bridge and Little Italy)
  (3, 1, '8:00 AM',  'food',     'Breakfast at hotel', null, null, null, null, '{}', null, '{}', '[{"type":"hotel_breakfast"}]'),
  (3, 2, '9:15 AM',  'travel',   'Subway to Union Square', null, null, null, 'subway', '{subway}', null, '{}', '[]'),
  (3, 3, '10:00 AM', 'activity', '36 Chambaz of Stylz, Intensive 2', '10:00 AM to 1:00 PM. Peri Dance Studio, 126 E 13th St.', 'Pending (requested).', '126 East 13th Street, New York, NY', null, '{}', null, '{}', '[]'),
  (3, 4, '1:00 PM',  'food',     'Light lunch on your own', 'Keep it light, early group dinner at 4:30.', null, null, null, '{}', null, '{}', '[]'),
  (3, 5, '2:00 PM',  'activity', 'Walk the Brooklyn Bridge', 'A/C to High St, walk back toward Manhattan for the skyline view.', null, 'Brooklyn Bridge, New York, NY', 'walking', '{walking}', null, '{}', '[]'),
  (3, 6, '3:15 PM',  'activity', 'The Bowery, Chinatown, Little Italy', 'Walking and shopping.', null, null, null, '{}', null, '{}', '[]'),
  (3, 7, '4:30 PM',  'food',     'Group dinner, Puglia''s, Little Italy', '189 Hester St.', 'Reservation confirmed.', '189 Hester Street, New York, NY', null, '{}', null, '{}', '[{"type":"group"}]'),
  (3, 8, '6:15 PM',  'travel',   'Subway to Theater District', null, null, null, 'subway', '{subway}', null, '{}', '[]'),
  (3, 9, '7:00 PM',  'activity', '& Juliet', 'Stephen Sondheim Theatre, 124 W 43rd St.', null, '124 West 43rd Street, New York, NY', null, '{}', 'broadway', '{broadway}', '[]'),
  (3, 10,'10:00 PM', 'free',     'Return to hotel', null, null, null, null, '{}', null, '{}', '[]'),

  -- DAY 4  Thursday, July 16 (BDC, Central Park and the Met)
  (4, 1, '7:30 AM',  'food',     'Breakfast at hotel', null, null, null, null, '{}', null, '{}', '[{"type":"hotel_breakfast"}]'),
  (4, 2, '8:30 AM',  'travel',   'Walk to Broadway Dance Center', '322 W 45th St.', null, '322 West 45th Street, New York, NY', 'walking', '{walking}', null, '{}', '[]'),
  (4, 3, '9:00 AM',  'activity', 'BDC Broadway Rehearsal Workshop', '9:00 to 10:30 AM, private group class.', 'Confirmed, payment in progress.', '322 West 45th Street, New York, NY', null, '{}', null, '{}', '[]'),
  (4, 4, '11:00 AM', 'activity', 'Central Park', 'Bethesda Fountain, The Mall.', null, 'Central Park, New York, NY', null, '{}', null, '{}', '[]'),
  (4, 5, '12:30 PM', 'food',     'Lunch on your own', 'Near the Met or picnic in the park.', null, null, null, '{}', null, '{}', '[]'),
  (4, 6, '1:30 PM',  'activity', 'Metropolitan Museum of Art', '1000 Fifth Ave.', null, '1000 Fifth Avenue, New York, NY', null, '{}', null, '{}', '[]'),
  (4, 7, '5:30 PM',  'food',     'Dinner TBD', 'Hard Rock Cafe option, Tue vs Thu.', 'Placement TBD.', null, null, '{}', null, '{}', '[]'),
  (4, 8, '7:00 PM',  'activity', 'SIX', 'Lena Horne Theatre, 256 W 47th St.', null, '256 West 47th Street, New York, NY', null, '{}', 'broadway', '{broadway}', '[]'),
  (4, 9, '9:00 PM',  'free',     'Free time', 'Times Square, then hotel.', null, null, null, '{}', null, '{}', '[]'),

  -- DAY 5  Friday, July 17 (BDC, Hudson Yards and DIY Bronx Hip Hop Tour)
  (5, 1, '7:30 AM',  'food',     'Breakfast at hotel', null, null, null, null, '{}', null, '{}', '[{"type":"hotel_breakfast"}]'),
  (5, 2, '9:00 AM',  'activity', 'BDC Ballet, private class', '9:00 to 10:30 AM.', 'Pending (final confirmation).', '322 West 45th Street, New York, NY', null, '{}', null, '{}', '[]'),
  (5, 3, '11:30 AM', 'activity', 'Meet at the Vessel, Hudson Yards', 'Lunch on your own. Shops at Hudson Yards / Mercado Little Spain.', null, 'Vessel, Hudson Yards, New York, NY', null, '{}', null, '{}', '[]'),
  (5, 4, '1:30 PM',  'activity', 'Edge observation deck', '30 Hudson Yards.', 'Group tickets pending.', '30 Hudson Yards, New York, NY', null, '{}', null, '{}', '[]'),
  (5, 5, '2:45 PM',  'travel',   'D train uptown, DIY Bronx Hip Hop Tour begins', 'About 35 to 40 minutes.', null, null, 'subway', '{subway}', null, '{}', '[]'),
  (5, 6, '3:30 PM',  'activity', '1520 Sedgwick Ave, Birthplace of Hip Hop', 'Hip Hop Boulevard sign, DJ Kool Herc, Aug 11 1973.', null, '1520 Sedgwick Avenue, Bronx, NY', null, '{}', null, '{}', '[]'),
  (5, 7, '4:15 PM',  'activity', 'Cedar Playground', 'The park jam era, cypher where b-boying took root.', null, 'Cedar Playground, Bronx, NY', null, '{}', null, '{}', '[]'),
  (5, 8, '4:45 PM',  'activity', 'Grand Concourse, Bronx Walk of Fame', 'Optional walk by, Bronx Point and future Hip Hop Museum.', null, 'Grand Concourse, Bronx, NY', null, '{}', null, '{}', '[]'),
  (5, 9, '5:30 PM',  'travel',   'Train back to midtown', '4 or D from 161 St, Yankee Stadium.', null, null, 'subway', '{subway}', null, '{}', '[]'),
  (5, 10,'6:30 PM',  'food',     'Dinner TBD', null, null, null, null, '{}', null, '{}', '[]'),
  (5, 11,'8:00 PM',  'free',     'Optional evening', 'TKTS same day Broadway, ABT rush, free time.', null, null, null, '{}', null, '{}', '[]'),
  (5, 12,'10:00 PM', 'free',     'Return to hotel', null, null, null, null, '{}', null, '{}', '[]'),

  -- DAY 6  Saturday, July 18 (Ailey and Fly Home)
  (6, 1, '7:00 AM',  'food',     'Breakfast, pack and check luggage with front desk', 'Luggage must be packed and stored before class.', null, null, null, '{}', null, '{}', '[{"type":"hotel_breakfast"}]'),
  (6, 2, '9:15 AM',  'travel',   'Subway or walk to The Ailey Studios', '405 W 55th St.', null, '405 West 55th Street, New York, NY', 'subway', '{subway}', null, '{}', '[]'),
  (6, 3, '10:00 AM', 'activity', 'Ailey Extension, Horton class (private, beginner)', '10:00 to 11:30 AM.', 'Pending (final confirmation).', '405 West 55th Street, New York, NY', null, '{}', null, '{}', '[]'),
  (6, 4, '12:00 PM', 'free',     'Return to hotel, grab luggage, grab and go lunch', null, null, null, null, '{}', null, '{}', '[]'),
  (6, 5, '1:00 PM',  'travel',   'Depart hotel for Newark (EWR)', null, null, null, null, '{}', null, '{}', '[]'),
  (6, 6, '2:00 PM',  'travel',   'Arrive EWR, check in, Delta DL 1333', null, 'Conf HNHBLA / HNBT7R / F8WM3V.', 'Newark Liberty International Airport, Newark, NJ', null, '{}', null, '{}', '[]'),
  (6, 7, '4:29 PM',  'travel',   'Flight departs for SLC', null, 'Delta DL 1333. Departs EWR 4:29 PM, arrives SLC 7:41 PM.', null, 'flight', '{flight}', null, '{}', '[]'),
  (6, 8, '7:41 PM',  'travel',   'Arrive Salt Lake City', 'Welcome home.', null, 'Salt Lake City International Airport, Salt Lake City, UT', null, '{}', null, '{}', '[]')
) as i(daynum, so, tm, ty, title, pub, intn, addr, tmeth, tmarr, subv, subarr, meal)
join d on d.day_number = i.daynum;

-- Expected after a first successful run:
--   1 tour, 21 tour_members, 6 agenda_days, 56 agenda_items
--   Items per day: D1=6, D2=11, D3=10, D4=9, D5=12, D6=8
--   Pending flagged in internal_note: Intensive 1, Intensive 2, BDC Ballet,
--     Edge tickets, Ailey Horton (BDC Broadway = confirmed/payment in progress).
