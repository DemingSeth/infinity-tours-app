-- Re-seed tours, members, post_trip, agenda days + items
-- Run this in the Supabase SQL Editor
-- Linda's user ID: efbf888c-5348-4071-b720-961e2795698c

-- ─── Safety: clear any partial data ──────────────────────────────────────────
DELETE FROM agenda_items  WHERE tour_id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
DELETE FROM agenda_days   WHERE tour_id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
DELETE FROM tour_members  WHERE tour_id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
DELETE FROM post_trip     WHERE tour_id IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');
DELETE FROM tours         WHERE id      IN ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','33333333-3333-3333-3333-333333333333');

-- ─── Tours ────────────────────────────────────────────────────────────────────

INSERT INTO tours (id, tour_host_id, name, school, contact_name, contact_email, contact_phone, destination, dates, date_flexible, status, transport_type, bus_capacity, company_pct, room_config, activities, notes, access_codes)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'efbf888c-5348-4071-b720-961e2795698c',
  'NYC Spring Musical Tour',
  'Westridge High School',
  'Mrs. Patricia Osgood',
  'posgood@westridge.edu',
  '(801) 555-0142',
  'New York, NY',
  'Apr 14-18, 2026',
  false,
  'in-progress',
  'flight',
  55, 12,
  '{"boysPerRoom":4,"girlsPerRoom":4}',
  '{Broadway show (Wicked),Museum of Natural History,Central Park walking tour,9/11 Memorial}',
  'School prefers Marriott properties. No red-eye flights.',
  '{"coordinator":"COORD1","teacher":"TEACH1","driver":"DRIVE1","student":"NYC26"}'
);

INSERT INTO tours (id, tour_host_id, name, school, contact_name, contact_email, contact_phone, destination, alt_destination, dates, date_flexible, status, transport_type, bus_capacity, company_pct, room_config, activities, notes, access_codes)
VALUES (
  '22222222-2222-2222-2222-222222222222',
  'efbf888c-5348-4071-b720-961e2795698c',
  'DC History & Government',
  'Cedar Valley Jr High',
  'Mr. James Whitfield',
  'jwhitfield@cedarvalley.edu',
  '(801) 555-0289',
  'Washington, DC',
  'Philadelphia, PA',
  'May 5-9, 2026',
  true,
  'committed',
  'flight',
  55, 12,
  '{"boysPerRoom":4,"girlsPerRoom":4}',
  '{Capitol Building tour,Smithsonian Air & Space,Lincoln Memorial,Holocaust Museum}',
  'Jr High - extra chaperone ratio needed. 1 per 8 students.',
  '{"coordinator":"COORD2","teacher":"TEACH2","driver":"DRIVE2","student":"DC26"}'
);

INSERT INTO tours (id, tour_host_id, name, school, contact_name, contact_email, planning_tour_host, traveling_tour_host, destination, dates, date_flexible, status, transport_type, bus_capacity, company_pct, room_config, activities, notes, access_codes)
VALUES (
  '33333333-3333-3333-3333-333333333333',
  'efbf888c-5348-4071-b720-961e2795698c',
  'Rigby HS Wind Ensemble - New York City',
  'Rigby High School',
  'Aaron Marshall',
  'amarshall@sd251.org',
  'Linda Deming',
  'Linda Deming',
  'New York, NY',
  'Mar 16-21, 2027',
  false,
  'committed',
  'flight',
  55, 12,
  '{"boysPerRoom":4,"girlsPerRoom":4}',
  '{Lehman College clinic,Celia Cruz HS Band exchange,High Line & Chelsea Market,Dizzys Jazz Club,Times Square free time,Ellens Stardust Diner,Wicked at Gershwin Theatre,Summit One Vanderbilt,Apollo Theater,National Jazz Museum in Harlem,Central Park walking tour,NY Philharmonic,St. Bartholemews Church performance,Statue of Liberty & Ellis Island,9/11 Museum,Brooklyn Bridge & DUMBO}',
  '61 total participants. Hotel: Holiday Inn Express NYC Chelsea, 232 West 29th Street (15 doubles, 6 kings).',
  '{"coordinator":"RIGBY27","teacher":"TEACH27","driver":"DRIVE27","student":"WIND27"}'
);

-- ─── Tour Members ─────────────────────────────────────────────────────────────

INSERT INTO tour_members (tour_id, name, type, gender, waiver, notes, sort_order) VALUES
('11111111-1111-1111-1111-111111111111', 'Ava Christensen', 'student',   'female', true,  'vegetarian',    1),
('11111111-1111-1111-1111-111111111111', 'Brody Larsen',    'student',   'male',   true,  NULL,            2),
('11111111-1111-1111-1111-111111111111', 'Cami Petersen',   'student',   'female', false, 'nut allergy',   3),
('11111111-1111-1111-1111-111111111111', 'Derek Halls',     'student',   'male',   true,  NULL,            4),
('11111111-1111-1111-1111-111111111111', 'Elena Marsh',     'student',   'female', true,  NULL,            5),
('11111111-1111-1111-1111-111111111111', 'Ms. Tanner',      'chaperone', 'female', true,  'room alone',    6),
('11111111-1111-1111-1111-111111111111', 'Mr. Beckstead',   'tour-host', 'male',   true,  'trip lead',     7),
('11111111-1111-1111-1111-111111111111', 'Dave',            'driver',    'male',   true,  'Meadow Bus Co.', 8);

INSERT INTO tour_members (tour_id, name, type, gender, waiver, notes, sort_order) VALUES
('22222222-2222-2222-2222-222222222222', 'Finn Murdoch',  'student',   'male',   true,  NULL,            1),
('22222222-2222-2222-2222-222222222222', 'Grace Holt',    'student',   'female', false, 'allergy: nuts', 2),
('22222222-2222-2222-2222-222222222222', 'Mr. Edwards',   'chaperone', 'male',   true,  NULL,            3),
('22222222-2222-2222-2222-222222222222', 'Dr. Lisa Park', 'tour-host', 'female', true,  'principal',     4);

INSERT INTO tour_members (tour_id, name, type, gender, waiver, notes, sort_order) VALUES
('33333333-3333-3333-3333-333333333333', 'Aaron Marshall',     'teacher',   'male',   true, 'Teacher/Director - amarshall@sd251.org', 1),
('33333333-3333-3333-3333-333333333333', 'Linda Deming',       'tour-host', 'female', true, 'Tour Host - 208-313-7230',               2),
('33333333-3333-3333-3333-333333333333', 'Student 1',          'student',   'female', true,  NULL,                                    3),
('33333333-3333-3333-3333-333333333333', 'Student 2',          'student',   'male',   true,  NULL,                                    4),
('33333333-3333-3333-3333-333333333333', 'Student 3',          'student',   'female', false, NULL,                                    5),
('33333333-3333-3333-3333-333333333333', 'Chaperone 1',        'chaperone', 'female', true,  NULL,                                    6),
('33333333-3333-3333-3333-333333333333', 'Teton Stage Driver', 'driver',    'male',   true, 'Teton Stage Line - airport transfer',    7);

-- ─── Post-Trip Records ────────────────────────────────────────────────────────

INSERT INTO post_trip (tour_id, completed) VALUES
('11111111-1111-1111-1111-111111111111', false),
('22222222-2222-2222-2222-222222222222', false),
('33333333-3333-3333-3333-333333333333', false);

-- ─── Agenda Days ─────────────────────────────────────────────────────────────

INSERT INTO agenda_days (id, tour_id, day_number, date, collapsed, sort_order) VALUES
('cc000001-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 1, 'Apr 14', false, 1),
('cc000001-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 2, 'Apr 15', false, 2);

INSERT INTO agenda_days (id, tour_id, day_number, date, collapsed, sort_order) VALUES
('bb000001-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 1, 'Mar 16, 2027', false, 1),
('bb000001-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 2, 'Mar 17, 2027', false, 2),
('bb000001-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 3, 'Mar 18, 2027', false, 3),
('bb000001-0000-0000-0000-000000000004', '33333333-3333-3333-3333-333333333333', 4, 'Mar 19, 2027', false, 4),
('bb000001-0000-0000-0000-000000000005', '33333333-3333-3333-3333-333333333333', 5, 'Mar 20, 2027', false, 5),
('bb000001-0000-0000-0000-000000000006', '33333333-3333-3333-3333-333333333333', 6, 'Mar 21, 2027', false, 6);

-- ─── NYC Agenda Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, detail, address, map_link, travel_method, contact_name, contact_phone, contact_email, cost, cost_paid, driver_note, internal_note) VALUES
('cc000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',1,'6:00 AM','travel','Depart SLC Airport','Delta flight DL447. Arrive Terminal 2 by 5:30 AM.','Salt Lake City International Airport, UT','https://maps.app.goo.gl/SLCairport','flight','Delta Groups','1-800-532-4777','groups@delta.com',14200,true,'Drop at Terminal 2 departures.','Group booking ref: DL-GRP-447'),
('cc000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',2,'2:30 PM','travel','Arrive JFK - Transfer to Hotel','Collect bags at carousel 5. Coach transfer to Marriott.','JFK International Airport, Queens, NY','https://maps.app.goo.gl/JFK','bus',NULL,NULL,NULL,0,false,'Meet group at Arrivals Level 1, Door 4.',NULL),
('cc000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',3,'5:00 PM','hotel','Check In - Marriott Times Square','1535 Broadway. Room keys distributed in lobby.','1535 Broadway, New York, NY 10036','https://maps.app.goo.gl/MarriottTSQ',NULL,'Marriott Groups - Sarah','(212) 398-1900','groups.nyc@marriott.com',9800,true,'Unload bags at Broadway entrance.','Group rate: EDU2026. 12 rooms confirmed.'),
('cc000001-0000-0000-0000-000000000001','11111111-1111-1111-1111-111111111111',4,'7:00 PM','food','Welcome Dinner - Johns Pizzeria','Classic NY pizza, family style. 30-min walk from hotel.','260 W 44th St, New York, NY 10036','https://maps.app.goo.gl/JohnsPizza','walking','Johns Groups','(212) 391-7560',NULL,420,false,NULL,'Pre-ordered 10 pies. Vegetarian options confirmed.'),
('cc000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',1,'9:00 AM','activity','American Museum of Natural History','Guided tour booked. Meet guide at Rose Center entrance.','200 Central Park West, New York, NY 10024','https://maps.app.goo.gl/AMNH','subway','AMNH Groups - Tom Park','(212) 769-5200','groupvisits@amnh.org',1200,true,NULL,'Confirmation #AMNH-4421. Tickets pre-paid.'),
('cc000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',2,'1:00 PM','food','Lunch - Museum Cafe','On your own. Budget $15-20 per person.','200 Central Park West, New York, NY 10024','https://maps.app.goo.gl/AMNHcafe',NULL,NULL,NULL,NULL,0,false,NULL,NULL),
('cc000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',3,'3:00 PM','activity','Central Park Walking Tour','Self-guided. Start at Bethesda Fountain, follow map provided.','Bethesda Fountain, Central Park, New York, NY','https://maps.app.goo.gl/BethesdaFountain','walking',NULL,NULL,NULL,0,false,NULL,NULL),
('cc000001-0000-0000-0000-000000000002','11111111-1111-1111-1111-111111111111',4,'7:30 PM','activity','Wicked - Gershwin Theatre','Front orchestra seats. Arrive by 7:15 PM.','222 W 51st St, New York, NY 10019','https://maps.app.goo.gl/Gershwin','walking','Broadway Direct - Kelli','(212) 586-6510','groups@broadwaydirect.com',5100,true,NULL,'Seats: Orchestra D1-D30. Conf #BW-9921.');

-- ─── Rigby Day 1 Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, public_note, address, map_link, travel_method, cost, cost_paid, driver_note, internal_note) VALUES
('bb000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',1,'6:00 PM','meeting','Meet at Rigby High School','Meet in the main parking lot. Load bags on bus.','3833 E Rigby High Ln, Rigby, ID','https://maps.app.goo.gl/rigbyhs',NULL,0,false,'Arrive by 5:45 PM to load bags.',NULL),
('bb000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',2,'6:30 PM','travel','Depart for Utah','Approx 2.5 hour drive to Tremonton rest stop.',NULL,NULL,'bus',0,false,'Head south on I-15.','Teton Stage Line - airport transfer bus, size 56.'),
('bb000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',3,'8:45 PM','free','Bathroom Break - Maverick','Quick stop. Back on bus by 9:05 PM.','5245 W 9600 N, Tremonton, UT','https://maps.app.goo.gl/maverick',NULL,0,false,'Pull into Maverick on the right.',NULL),
('bb000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',4,'9:10 PM','travel','Depart for Salt Lake City Airport','Approx 1 hour drive.','3920 W Terminal Dr, Salt Lake City, UT','https://maps.app.goo.gl/slcairport','bus',0,false,'Drop at Terminal 2 departures.',NULL),
('bb000001-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333',5,'10:15 PM','travel','Arrive at SLC Airport','Check in and proceed through security. United Flight #2857 departs 12:51 AM.','Salt Lake City International Airport',NULL,NULL,0,false,NULL,'United Group ID: 60142. 61 seats.');

-- ─── Rigby Day 2 Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, public_note, address, map_link, website, travel_method, contact_name, contact_phone, cost, cost_paid, driver_note, internal_note, meal_pay_type) VALUES
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',1,'12:51 AM','travel','Depart SLC - United Flight #2857','United Flight #2857 SLC to EWR. Arrives Newark 7:10 AM.','Salt Lake City International Airport',NULL,'https://www.united.com','flight','United Group Desk',NULL,0,true,NULL,'United Group ID: 60142. 61 seats.',NULL),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',2,'7:10 AM','travel','Arrive Newark Airport - Collect Bags','Collect bags and proceed to bus meeting point.','Newark Liberty International Airport, NJ','https://maps.app.goo.gl/ewr',NULL,NULL,'Pamela (Bagels)','201-832-7802',0,false,'Meet group at Arrivals Level 1.','4 people not riding bus get Till stipend. Bagels delivered at 7:40 AM.','group'),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',3,'7:40 AM','food','Breakfast - Bagels Delivered','Bagels delivered at the airport. Eat before boarding bus.','Newark Liberty International Airport, NJ',NULL,NULL,NULL,'Pamela','201-832-7802',0,true,NULL,'59 box breakfast. Text Pamela - text preferred.','group'),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',4,'7:45 AM','travel','Board Bus - Depart for Lehman College','All luggage goes on bus. 60-90 minute drive to the Bronx.','Lehman College, CUNY, 250 Bedford Park Blvd W, Bronx, NY','https://maps.app.goo.gl/lehmancollege','https://www.lehman.cuny.edu','bus',NULL,NULL,0,true,'Luxury Vans and Shuttle Bus Conf 334305. Unload before Paul Ave light at Gate 8.','Luxury Vans and Shuttle Bus Conf: 334305.',NULL),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',5,'9:30 AM','activity','Clinic with Dr. Travis Cross - UCLA Director of Bands','90-minute clinic. Enter via Gate 8 at corner of Bedford Park Blvd W and Paul Ave.','Lehman College, CUNY, 250 Bedford Park Blvd W, Bronx, NY','https://maps.app.goo.gl/lehmancollege',NULL,NULL,'Dr. Travis Cross','847-809-7979',0,false,'Wait at Gate 8 area.','Linda give check to Dr. Cross upon arrival.',NULL),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',6,'11:15 AM','activity','High School Exchange - Celia Cruz HS Band','25 minutes each group. Q&A with students at 12:15 PM. Gifts for students and director Penny at 12:30 PM.','Lehman College, CUNY, 250 Bedford Park Blvd W, Bronx, NY','https://maps.app.goo.gl/lehmancollege',NULL,NULL,'Penny (Director)',NULL,0,false,NULL,'Gift for Students & Penny at 12:30 PM.',NULL),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',7,'12:45 PM','food','Lunch - Lehmans Cafeteria (Catered)','Catered lunch on campus before departing.','Lehman College Cafeteria, 250 Bedford Park Blvd W, Bronx, NY',NULL,NULL,NULL,NULL,NULL,0,true,NULL,'Pre-ordered catered lunch. Check order details.','group'),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',8,'1:00 PM','activity','The High Line - Starting at the Edge','About 45 minutes. Walk the High Line from the Edge to Chelsea Market.','Edge Observatory, 481 8th Ave, New York, NY','https://maps.app.goo.gl/highline','https://www.thehighline.org','bus',NULL,NULL,0,false,'Drop at Edge Observatory on 8th Ave.',NULL,NULL),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',9,'2:15 PM','food','Chelsea Market - Gelato at LArte Del Gelato','$10 for gelato on your Till card. Shopping at Chelsea Market or explore Little Island.','75 9th Ave, New York, NY 10011','https://maps.app.goo.gl/chelseamarket','https://www.chelseamarket.com','walking',NULL,NULL,0,false,'Pick up group at 10th Ave and W 15th St at 3:15 PM.','$10 gelato stipend on Till.','stipend'),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',10,'3:20 PM','hotel','Check In - Holiday Inn Express NYC Chelsea','Time to rest and get ready. Nice dress required for evening. Meet in lobby at 5:30 PM.','232 West 29th Street, New York, NY 10001','https://maps.app.goo.gl/holidayinnchelsea','https://www.ihg.com','bus','Hotel Front Desk',NULL,0,true,'Unload at main entrance on 29th St.','15 doubles, 6 kings. Linda confirm Chipotle order.',NULL),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',11,'5:40 PM','activity','Dizzys Jazz Club - Jazz at Lincoln Center','Nice dress required. Take subway: off at 59th St-Columbus Circle. Entrance at 60th St and Broadway.','Frederick P. Rose Hall, Broadway at 60th St, New York, NY 10019','https://maps.app.goo.gl/lincolncenter','https://www.jazz.org/dizzys','subway',NULL,NULL,0,true,NULL,'Order #2682674. Menu: Grilled Angus Beef Burger, Roasted Branzino. Doors open 6:00 PM. Show: Juilliard Jazz Ensembles at 7:00 PM.','group'),
('bb000001-0000-0000-0000-000000000002','33333333-3333-3333-3333-333333333333',12,'8:15 PM','hotel','Return to Hotel','Take subway back: off at 28th St. Lights out 10:00 PM.','232 West 29th Street, New York, NY 10001','https://maps.app.goo.gl/holidayinnchelsea',NULL,'subway',NULL,NULL,0,false,NULL,NULL,NULL);

-- ─── Rigby Day 3 Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, public_note, address, map_link, website, travel_method, contact_name, contact_phone, contact_email, cost, cost_paid, internal_note, meal_pay_type, stipend_amount) VALUES
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',1,'8:15 AM','food','Breakfast - Hotel','Breakfast served 6:30-10:00 AM daily in the hotel.','232 West 29th Street, New York, NY 10001',NULL,NULL,NULL,NULL,NULL,NULL,0,true,NULL,'group',NULL),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',2,'8:45 AM','activity','Times Square - Free Time','Walk up to Times Square. Pass Empire State Building, NY Public Library, and Bryant Park.','Times Square, New York, NY','https://maps.app.goo.gl/timessquare',NULL,'walking',NULL,NULL,NULL,0,false,'Google Walking Map provided to group.',NULL,NULL),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',3,'11:10 AM','activity','Meet at Red Stairs - Walk to Ellens','Meet at the Red Stairs in Times Square, then walk together to Ellens Stardust Diner.','Red Stairs, Times Square, New York, NY','https://maps.app.goo.gl/redstairs',NULL,'walking',NULL,NULL,NULL,0,false,NULL,NULL,NULL),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',4,'11:30 AM','food','Lunch - Ellens Stardust Diner','Singing waitstaff - a NYC classic. Group lunch reservation.','1650 Broadway, New York, NY 10019','https://maps.app.goo.gl/ellens','https://www.ellensstardustdiner.com','walking','Ellens Groups',NULL,NULL,0,true,'Pre-ordered - check order details.','group',NULL),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',5,'2:00 PM','activity','Wicked - Gershwin Theatre','61 tickets. Run time: 2 hours 45 minutes including 15-minute intermission.','222 W 51st St, New York, NY 10019','https://maps.app.goo.gl/gershwin','https://wickedthemusical.com','walking','Broadway Direct - Kelli','(212) 586-6510','groups@broadwaydirect.com',0,true,'61 tickets confirmed.',NULL,NULL),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',6,'5:10 PM','activity','Summit One Vanderbilt','61 tickets reserved. Take subway from Grand Central.','45 E 42nd St, New York, NY 10017','https://maps.app.goo.gl/summitvanderbilt','https://www.summitov.com','subway',NULL,NULL,NULL,0,true,'61 tickets reserved.',NULL,NULL),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',7,'8:00 PM','food','Dinner - Vanderbilt Market','$25 Till stipend for dinner. Various meal options available.','Vanderbilt Market, New York, NY','https://maps.app.goo.gl/vanderbiltmarket',NULL,'walking',NULL,NULL,NULL,0,false,'$25 Till stipend. Check meal options list.','stipend',25),
('bb000001-0000-0000-0000-000000000003','33333333-3333-3333-3333-333333333333',8,'10:00 PM','hotel','Return to Hotel - Lights Out','Take subway back. Lights out 10:00 PM.','232 West 29th Street, New York, NY 10001','https://maps.app.goo.gl/holidayinnchelsea',NULL,'subway',NULL,NULL,NULL,0,false,NULL,NULL,NULL);

-- ─── Rigby Day 4 Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, public_note, address, map_link, website, travel_method, contact_name, cost, cost_paid, internal_note, meal_pay_type, stipend_amount) VALUES
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',1,'8:00 AM','food','Breakfast - Hotel','Breakfast served 6:30-10:00 AM daily.','232 West 29th Street, New York, NY 10001',NULL,NULL,NULL,NULL,0,true,NULL,'group',NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',2,'8:40 AM','activity','Depart for Harlem - Apollo Theater','About 40-minute subway ride. Take train to 125th St.','233 W 125th St, New York, NY 10027','https://maps.app.goo.gl/apollotheater','https://www.apollotheater.org','subway',NULL,0,true,'Order Number: 75805792.',NULL,NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',3,'9:40 AM','activity','National Jazz Museum in Harlem - Workshop','Workshop and Music Boost session. Walk from Apollo Theater (about 5 min).','58 W 129th St, New York, NY','https://maps.app.goo.gl/jazzmuseum','https://jazzmuseuminharlem.org','walking',NULL,0,true,NULL,NULL,NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',4,'12:15 PM','food','Lunch - Rays Pizza','Group lunch reservation confirmed with Eliana. About 35-minute subway ride from Harlem.','Rays Pizza, New York, NY','https://maps.app.goo.gl/rayspizza',NULL,'subway','Eliana',0,true,'Confirmed with Eliana. Check order details.','group',NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',5,'1:30 PM','activity','American Museum of Natural History - Free Time','2 hours free time. Meet outside at 3:30 PM sharp.','200 Central Park West, New York, NY 10024','https://maps.app.goo.gl/amnh','https://www.amnh.org','walking',NULL,0,true,'Order Number: 75805792.',NULL,NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',6,'3:35 PM','activity','Central Park Walking Tour','One hour in Central Park. Route: Belvedere Castle, Bow Bridge, Bethesda Terrace, Cherry Hills, Strawberry Fields.','Bethesda Fountain, Central Park, New York, NY','https://maps.app.goo.gl/centralparkwalk',NULL,'walking',NULL,0,false,NULL,NULL,NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',7,'5:00 PM','food','Chipotle Delivered to Hotel','Chipotle delivered to hotel lobby. Change into nicer clothes after - meet in lobby at 6:20 PM.','232 West 29th Street, New York, NY 10001',NULL,NULL,NULL,NULL,0,true,'Order ID: CCQA8788Z. Tip included.','group',NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',8,'7:30 PM','activity','NY Philharmonic - Dudamel conducting David Lang world premiere','Nicer clothes required. Take subway to Lincoln Center. World premiere performance.','Lincoln Center, New York, NY 10023','https://maps.app.goo.gl/lincolncenter','https://www.nyphil.org','subway',NULL,0,true,'Gustavo Dudamel conducting world premiere. Show ends approx 8:45 PM.',NULL,NULL),
('bb000001-0000-0000-0000-000000000004','33333333-3333-3333-3333-333333333333',9,'10:00 PM','hotel','Return to Hotel - Lights Out','Take subway back. Lights out 10:00 PM.','232 West 29th Street, New York, NY 10001','https://maps.app.goo.gl/holidayinnchelsea',NULL,'subway',NULL,0,false,NULL,NULL,NULL);

-- ─── Rigby Day 5 Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, public_note, address, map_link, website, travel_method, cost, cost_paid, driver_note, internal_note, meal_pay_type, stipend_amount) VALUES
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',1,'7:45 AM','food','Breakfast - Hotel','Breakfast served 6:30-10:00 AM daily. Meet in lobby at 8:15 AM with instrument.','232 West 29th Street, New York, NY 10001',NULL,NULL,NULL,0,true,NULL,NULL,'group',NULL),
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',2,'9:15 AM','activity','Performance at St. Bartholomews Church','Walk through Rockefeller Center and St. Patricks Cathedral on the way. Instruments must be packed down before 10:30 AM.','325 Park Ave, New York, NY 10022','https://maps.app.goo.gl/stbarts','https://www.stbarts.org','subway',0,false,NULL,'Add Instrument Rental Confirmation.',NULL,NULL),
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',3,'12:00 PM','activity','Statue of Liberty - Battery Park','Go through security (like airport). Ferry departs 12:50 PM. Free time on Liberty Island after group photo. $20 Till stipend for lunch.','Battery Park, New York, NY 10004','https://maps.app.goo.gl/batterypark','https://www.statueoflibertytickets.com','bus',0,true,'Drop at Battery Park entrance.','50 tickets QR code + 8 tickets QR code + 3 tickets. Linda get quarters for lockers.','stipend',20),
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',4,'3:00 PM','activity','Ellis Island - Ferry from Liberty Island','Those wanting to do the 9/11 Museum instead: skip Ellis Island and go directly. Free time 3:10-4:15 PM.','Ellis Island, New York, NY','https://maps.app.goo.gl/ellisisland','https://www.libertyellisfoundation.org','ferry',0,true,NULL,NULL,NULL,NULL),
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',5,'5:30 PM','activity','Groups Split - 9/11 Museum OR RiseNY','Group splits here. 23 people depart for RiseNY. Remaining group visits 9/11 Museum (closes 7 PM).','9/11 Memorial & Museum, 180 Greenwich St, New York, NY 10007','https://maps.app.goo.gl/911museum','https://www.911memorial.org','walking',0,true,NULL,'9/11 Museum reservation #6336899. RiseNY confirmation DYZ8G1R206241229.',NULL,NULL),
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',6,'7:10 PM','food','Dinner - Hudson Eats or Times Square','$25 Till stipend. Hudson Eats at Brookfield Place or Times Square.','Brookfield Place, 230 Vesey St, New York, NY 10281','https://maps.app.goo.gl/hudsoneats',NULL,NULL,0,false,NULL,'$25 Till stipend.','stipend',25),
('bb000001-0000-0000-0000-000000000005','33333333-3333-3333-3333-333333333333',7,'8:45 PM','free','Free Time Near Hotel','Option: Ice cream at Anitas (4 min from hotel). Pack suitcase by 9:30 PM. Lights out 10:30 PM.','1141 Broadway, New York, NY 10001','https://maps.app.goo.gl/anitas',NULL,NULL,0,false,NULL,NULL,NULL,NULL);

-- ─── Rigby Day 6 Items ────────────────────────────────────────────────────────

INSERT INTO agenda_items (day_id, tour_id, sort_order, time, type, title, public_note, address, map_link, website, travel_method, cost, cost_paid, driver_note, internal_note, meal_pay_type, stipend_amount) VALUES
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',1,'7:00 AM','free','Wake Up, Pack & Check Out','Check-out time is 11:00 AM. Pack your suitcase and load bags on bus by 8:15 AM.','232 West 29th Street, New York, NY 10001',NULL,NULL,NULL,0,false,NULL,'Luxury Vans and Shuttle Bus Confirmation 334313.',NULL,NULL),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',2,'7:45 AM','food','Breakfast - Hotel','Last hotel breakfast. Served 6:30-10:00 AM.','232 West 29th Street, New York, NY 10001',NULL,NULL,NULL,0,true,NULL,NULL,'group',NULL),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',3,'9:00 AM','activity','Brooklyn Bridge & DUMBO','Take subway: off on High St. Walk Brooklyn Bridge. Free time in Chinatown/Little Italy at 10:00 AM.','Brooklyn Bridge, New York, NY','https://maps.app.goo.gl/brooklynbridge',NULL,'subway',0,false,NULL,NULL,NULL,NULL),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',4,'11:00 AM','food','Lunch - Puglias','Final group meal in NYC. Walk from Little Italy area.','189 Hester St, New York, NY 10013','https://maps.app.goo.gl/puglias',NULL,'walking',0,true,NULL,NULL,'group',NULL),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',5,'12:00 PM','travel','Depart for Newark Airport','About 30-40 minutes to EWR. Flight departs 3:15 PM.','Newark Liberty International Airport, NJ','https://maps.app.goo.gl/ewr',NULL,'bus',0,true,'Head to EWR departures for United.','Luxury Vans and Shuttle Bus Conf: 334313.',NULL,NULL),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',6,'3:15 PM','travel','Flight Home - United #708 EWR to SLC','United Flight #708. Arrives SLC 6:38 PM.','Newark Liberty International Airport, NJ',NULL,'https://www.united.com','flight',0,true,NULL,'United Group ID: 60142. 61 seats.',NULL,NULL),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',7,'7:30 PM','food','Dinner Stop - Fast Food in Centerville','$15 Till stipend for dinner. Stop in Centerville, UT.','475 N 700 W, Centerville, UT 84014','https://maps.app.goo.gl/centerville',NULL,'bus',0,false,'Pull into Centerville stop.','$15 Till stipend.','stipend',15),
('bb000001-0000-0000-0000-000000000006','33333333-3333-3333-3333-333333333333',8,'8:30 PM','travel','Depart for Rigby High School','About 3 hours. Estimated arrival 11:30 PM. Parents please be at Rigby HS by 11:15 PM.','3833 E Rigby High Ln, Rigby, ID','https://maps.app.goo.gl/rigbyhs',NULL,'bus',0,false,'Head north to Rigby. Estimated arrival 11:30 PM.',NULL,NULL,NULL);

-- ─── Vendors (safe re-insert) ─────────────────────────────────────────────────

INSERT INTO vendors (name, category, rating, flag, notes, created_by)
SELECT name, category, rating, flag, notes, created_by FROM (VALUES
  ('Delta Airlines',                  'Airfare', 4, false, 'Reliable group fares. Contact: groups@delta.com. Ask for educational discount.',             'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Southwest Airlines',              'Airfare', 5, false, 'Best for short hops. Free bags = big group savings.',                                       'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('United Airlines',                 'Airfare', 4, false, 'Used for Rigby NYC tour. Group ID: 60142. Reliable group booking process.',                  'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Meadow Bus Co.',                  'Bus',     5, false, 'Excellent local Utah operator. Reliable, clean. Ask for Mark.',                              'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Teton Stage Line',                'Bus',     5, false, 'Airport transfer to SLC and Rigby. Bus size 56. Reliable.',                                  'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Rocky Mountain Charter',          'Bus',     1, true,  'DO NOT USE. Late on 2023 DC trip. Did not honor contracted price.',                          'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Marriott Hotels',                 'Hotel',   4, false, 'Schools often request by name. Group rate code: EDU2026.',                                   'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Holiday Inn Express NYC Chelsea', 'Hotel',   4, false, '232 West 29th St. Great Chelsea location. 15 doubles + 6 kings. Walkable to many venues.',   'efbf888c-5348-4071-b720-961e2795698c'::uuid),
  ('Broadway Direct',                 'Tickets', 5, false, 'Best group ticket source for Broadway. Book 3+ months out. Contact: Kelli (212) 586-6510.',  'efbf888c-5348-4071-b720-961e2795698c'::uuid)
) AS v(name, category, rating, flag, notes, created_by)
WHERE NOT EXISTS (SELECT 1 FROM vendors WHERE vendors.name = v.name);
