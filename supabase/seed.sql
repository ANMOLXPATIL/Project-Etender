insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'maya@northline.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Aarav Build & Restore","service_location":"Pune, Maharashtra"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'james@fieldwork.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Fieldwork Renovation India","service_location":"Mumbai, Maharashtra"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'aisha@stoneandtimber.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Stone & Timber Studio","service_location":"Bengaluru, Karnataka"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'leo@formandfinish.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Form & Finish Works","service_location":"Hyderabad, Telangana"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000005', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'priya@brightwire.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"BrightWire Electricals","service_location":"Chennai, Tamil Nadu"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000006', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'rohan@aquafix.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"AquaFix Plumbing & Pumps","service_location":"Delhi, Delhi"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000007', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'meera@rangrez.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Rangrez Paint & Finish","service_location":"Ahmedabad, Gujarat"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000008', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'arjun@roofright.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"RoofRight Waterproofing","service_location":"Jaipur, Rajasthan"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000009', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'kavya@surya.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Surya Solar & Electrical","service_location":"Bengaluru, Karnataka"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000010', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'vikram@tilecraft.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"TileCraft Flooring Studio","service_location":"Pune, Maharashtra"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000011', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'farah@coolbreeze.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"CoolBreeze AC & Home Services","service_location":"Hyderabad, Telangana"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000012', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'sana@mitrahome.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Mitra Home Renovations","service_location":"Kolkata, West Bengal"}', now(), now(), '', '', '', '')
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
values
  ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'maya@northline.example', '{"sub":"10000000-0000-4000-8000-000000000001","email":"maya@northline.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000002', 'james@fieldwork.example', '{"sub":"10000000-0000-4000-8000-000000000002","email":"james@fieldwork.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000003', 'aisha@stoneandtimber.example', '{"sub":"10000000-0000-4000-8000-000000000003","email":"aisha@stoneandtimber.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'leo@formandfinish.example', '{"sub":"10000000-0000-4000-8000-000000000004","email":"leo@formandfinish.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000005', '10000000-0000-4000-8000-000000000005', 'priya@brightwire.example', '{"sub":"10000000-0000-4000-8000-000000000005","email":"priya@brightwire.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000006', '10000000-0000-4000-8000-000000000006', 'rohan@aquafix.example', '{"sub":"10000000-0000-4000-8000-000000000006","email":"rohan@aquafix.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000007', '10000000-0000-4000-8000-000000000007', 'meera@rangrez.example', '{"sub":"10000000-0000-4000-8000-000000000007","email":"meera@rangrez.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000008', '10000000-0000-4000-8000-000000000008', 'arjun@roofright.example', '{"sub":"10000000-0000-4000-8000-000000000008","email":"arjun@roofright.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000009', '10000000-0000-4000-8000-000000000009', 'kavya@surya.example', '{"sub":"10000000-0000-4000-8000-000000000009","email":"kavya@surya.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000010', '10000000-0000-4000-8000-000000000010', 'vikram@tilecraft.example', '{"sub":"10000000-0000-4000-8000-000000000010","email":"vikram@tilecraft.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000011', '10000000-0000-4000-8000-000000000011', 'farah@coolbreeze.example', '{"sub":"10000000-0000-4000-8000-000000000011","email":"farah@coolbreeze.example"}', 'email', now(), now(), now()),
  ('20000000-0000-4000-8000-000000000012', '10000000-0000-4000-8000-000000000012', 'sana@mitrahome.example', '{"sub":"10000000-0000-4000-8000-000000000012","email":"sana@mitrahome.example"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

update public.contractors c set
  business_name = profile.business_name,
  description = profile.description,
  service_location = profile.location
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Aarav Build & Restore', 'Residential construction and careful restoration, from the first site visit through the final finish.', 'Pune, Maharashtra'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Fieldwork Renovation India', 'A hands-on renovation crew for kitchens, bathrooms, and practical upgrades to Indian homes.', 'Mumbai, Maharashtra'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Stone & Timber Studio', 'Custom woodwork, masonry, and thoughtful renovations using durable materials and skilled local craft.', 'Bengaluru, Karnataka'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Form & Finish Works', 'Reliable finish carpentry and residential upgrades for homeowners, designers, and local property managers.', 'Hyderabad, Telangana'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'BrightWire Electricals', 'Home and small-business electrical work, from safe rewiring and panel upgrades to lighting and inverter installation.', 'Chennai, Tamil Nadu'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'AquaFix Plumbing & Pumps', 'Dependable plumbing, bathroom fittings, leak repairs, and water-pump installation for homes and apartments.', 'Delhi, Delhi'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'Rangrez Paint & Finish', 'Interior and exterior painting with careful surface preparation, durable finishes, and clean handover.', 'Ahmedabad, Gujarat'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'RoofRight Waterproofing', 'Terrace waterproofing, rainwater seepage repairs, and heat-reflective roof treatments for Indian homes.', 'Jaipur, Rajasthan'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'Surya Solar & Electrical', 'Residential rooftop solar and electrical upgrades, including site assessment, installation, and commissioning.', 'Bengaluru, Karnataka'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'TileCraft Flooring Studio', 'Floor and wall tiling, stone installation, and careful bathroom and kitchen surface upgrades.', 'Pune, Maharashtra'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'CoolBreeze AC & Home Services', 'Air-conditioner installation, servicing, copper-pipe replacement, and seasonal home maintenance.', 'Hyderabad, Telangana'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Mitra Home Renovations', 'End-to-end home renovation for Kolkata flats and family homes, including layout updates, kitchen and bathroom upgrades, and complete interior finishing.', 'Kolkata, West Bengal')
) as profile(owner_id, business_name, description, location)
join public.contractor_owners co on co.owner_id = profile.owner_id
where c.id = co.contractor_id;

update public.contractor_contacts cc set
  email = auth_user.email,
  phone = profile.phone
from auth.users auth_user
join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, '+91 98765 40134'),
  ('10000000-0000-4000-8000-000000000002'::uuid, '+91 98765 40188'),
  ('10000000-0000-4000-8000-000000000003'::uuid, '+91 98765 40162'),
  ('10000000-0000-4000-8000-000000000004'::uuid, '+91 98765 40110'),
  ('10000000-0000-4000-8000-000000000005'::uuid, '+91 98765 40215'),
  ('10000000-0000-4000-8000-000000000006'::uuid, '+91 98765 40226'),
  ('10000000-0000-4000-8000-000000000007'::uuid, '+91 98765 40237'),
  ('10000000-0000-4000-8000-000000000008'::uuid, '+91 98765 40248'),
  ('10000000-0000-4000-8000-000000000009'::uuid, '+91 98765 40259'),
  ('10000000-0000-4000-8000-000000000010'::uuid, '+91 98765 40260'),
  ('10000000-0000-4000-8000-000000000011'::uuid, '+91 98765 40271'),
  ('10000000-0000-4000-8000-000000000012'::uuid, '+91 98765 40282')
) as profile(owner_id, phone) on profile.owner_id = auth_user.id
where cc.contractor_id = (select co.contractor_id from public.contractor_owners co where co.owner_id = auth_user.id);

update public.contractor_experience e set years_experience = profile.years, qualifications = profile.qualifications
from public.contractors c
join public.contractor_owners co on co.contractor_id = c.id
join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 14::smallint, 'Registered building contractor · Site safety trained · Residential restoration specialist'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 9::smallint, 'Residential renovation specialist · Waterproofing and tile installation'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 18::smallint, 'Certified finish carpenter · Traditional joinery and stone restoration'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 11::smallint, 'Site safety trained · Licensed and insured residential contractor'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 12::smallint, 'Residential wiring and electrical safety specialist · Inverter and lighting installation'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 10::smallint, 'Residential plumber · Pump installation and leak detection'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 8::smallint, 'Interior and exterior paint finishing · Surface preparation specialist'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 13::smallint, 'Terrace waterproofing and monsoon-readiness specialist'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 7::smallint, 'Rooftop solar and electrical installation · Site safety trained'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 9::smallint, 'Tile and stone installer · Bathroom and kitchen renovation'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 11::smallint, 'Air-conditioning installation and residential maintenance specialist'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 15::smallint, 'Residential renovation project management · Kitchen, bathroom, and interior finishing')
) as profile(owner_id, years, qualifications) on profile.owner_id = co.owner_id
where e.contractor_id = c.id;

update public.contractor_availability a set status = profile.status, note = profile.note
from public.contractors c
join public.contractor_owners co on co.contractor_id = c.id
join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'limited', 'Booking projects for late summer.'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'available', 'Taking on one additional kitchen or bath project.'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'available', 'Open for custom millwork and restoration consultations.'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'unavailable', 'Fully booked through the end of the season.'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'available', 'Available for home wiring, lighting, and safety inspections.'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'available', 'Taking plumbing and water-pump service calls this month.'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'limited', 'Booking interior painting projects for next month.'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'available', 'Open for terrace inspections before the monsoon.'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'limited', 'Scheduling rooftop solar assessments for next month.'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'available', 'Available for flooring and bathroom tiling projects.'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'available', 'Taking AC servicing and installation bookings.'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'available', 'Booking full-home renovations and room-by-room upgrades.')
) as profile(owner_id, status, note) on profile.owner_id = co.owner_id
where a.contractor_id = c.id;

insert into public.contractor_skills (contractor_id, skill)
select c.id, profile.skill
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Home construction'),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Residential restoration'),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Structural repairs'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Modular kitchen renovation'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Bathroom remodelling'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Tile and plumbing'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Custom furniture and joinery'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Finish carpentry'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Stone and masonry'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Interior finishing'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Balcony and terrace work'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Home repairs'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'Electrical wiring and repairs'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'Lighting and fan installation'),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'Inverter and electrical safety checks'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'Home plumbing and leak repair'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'Bathroom fittings'),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'Water pumps and tank connections'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'Interior and exterior painting'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'Wall preparation and putty'),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'Wood and metal finishes'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'Terrace waterproofing'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'Seepage and crack repair'),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'Heat-reflective roof coating'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'Rooftop solar installation'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'Solar system maintenance'),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'Electrical panel upgrades'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'Floor and wall tiling'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'Bathroom and kitchen tilework'),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'Stone flooring installation'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'Air-conditioner installation'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'AC servicing and repair'),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'Copper piping and home maintenance'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Full home renovation'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Kitchen and bathroom remodelling'),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Interior finishing and space planning')
) as profile(owner_id, skill)
join public.contractor_owners co on co.owner_id = profile.owner_id
join public.contractors c on c.id = co.contractor_id
on conflict (contractor_id, skill_key) do nothing;

insert into public.portfolio_projects (
  contractor_id, title, category, description, status, completed_on, location, image_path, project_value
)
select c.id, project.title, project.category, project.description, project.status, project.completed_on::date,
  c.service_location, project.image_path, project.project_value
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Kothrud row-house restoration', 'Restoration', 'Refreshed a Pune row house with repaired stonework, a shaded sit-out, and locally sourced finishes.', 'completed', '2025-10-18', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', 1850000::numeric),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Baner family home renovation', 'Renovation', 'Updated a family home with better cross-ventilation, durable flooring, and a brighter living space.', 'completed', '2024-06-12', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80', 2650000::numeric),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Andheri modular kitchen', 'Kitchen', 'A complete modular kitchen fit-out with smart storage, granite counters, and easy-clean tile.', 'completed', '2025-03-29', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80', 975000::numeric),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Bandra bathroom upgrade', 'Bathroom', 'Reworked plumbing and finishes with careful waterproofing and efficient fixtures.', 'completed', '2024-11-07', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', 565000::numeric),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Indiranagar teak storage wall', 'Millwork', 'Designed and installed a made-to-measure teak storage wall with a compact work desk.', 'completed', '2025-08-15', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', 390000::numeric),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Jubilee Hills terrace upgrade', 'Carpentry', 'Built a weather-ready terrace deck and privacy screen for a Hyderabad home.', 'completed', '2025-05-21', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80', 685000::numeric),
  ('10000000-0000-4000-8000-000000000005'::uuid, 'Adyar home lighting and rewiring', 'Electrical', 'Updated ageing wiring and installed energy-efficient task lighting in a family home.', 'completed', '2025-02-14', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80', 145000::numeric),
  ('10000000-0000-4000-8000-000000000006'::uuid, 'Dwarka bathroom plumbing refresh', 'Plumbing', 'Replaced old bathroom lines and fittings, tested water pressure, and resolved a persistent leak.', 'completed', '2025-04-09', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', 92000::numeric),
  ('10000000-0000-4000-8000-000000000007'::uuid, 'Satellite apartment repaint', 'Painting', 'Prepared walls and applied washable, low-odour finishes throughout a two-bedroom apartment.', 'completed', '2025-01-22', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80', 78000::numeric),
  ('10000000-0000-4000-8000-000000000008'::uuid, 'Vaishali Nagar terrace waterproofing', 'Waterproofing', 'Sealed terrace joints and renewed the protective coating to address monsoon seepage.', 'completed', '2025-06-03', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80', 128000::numeric),
  ('10000000-0000-4000-8000-000000000009'::uuid, 'Whitefield rooftop solar setup', 'Solar', 'Installed a rooftop solar array with updated electrical connections and commissioning checks.', 'completed', '2025-03-18', 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1200&q=80', 385000::numeric),
  ('10000000-0000-4000-8000-000000000010'::uuid, 'Aundh kitchen floor replacement', 'Flooring', 'Levelled the kitchen floor and installed durable anti-skid tiles with a clean edge finish.', 'completed', '2025-05-11', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80', 112000::numeric),
  ('10000000-0000-4000-8000-000000000011'::uuid, 'Gachibowli AC installation', 'Air conditioning', 'Installed two split AC units with tidy copper-pipe routing and condensate drainage.', 'completed', '2025-04-26', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80', 96000::numeric),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Salt Lake family home renovation', 'Home renovation', 'Refreshed a lived-in family flat with brighter rooms, durable flooring, updated storage, and coordinated interior finishes.', 'completed', '2025-02-20', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80', 1850000::numeric),
  ('10000000-0000-4000-8000-000000000012'::uuid, 'Ballygunge kitchen and bathroom upgrade', 'Home renovation', 'Modernised the kitchen and bathroom with improved layouts, new fittings, water-resistant finishes, and practical storage.', 'completed', '2024-09-12', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80', 1120000::numeric)
) as project(owner_id, title, category, description, status, completed_on, image_path, project_value)
join public.contractor_owners co on co.owner_id = project.owner_id
join public.contractors c on c.id = co.contractor_id
on conflict (contractor_id, project_key) do update set
  category = excluded.category,
  description = excluded.description,
  status = excluded.status,
  completed_on = excluded.completed_on,
  location = excluded.location,
  image_path = excluded.image_path,
  project_value = excluded.project_value;
