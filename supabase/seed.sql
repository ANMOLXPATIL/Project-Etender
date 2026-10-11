insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'maya@northline.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Northline Build Co.","service_location":"Brooklyn, NY"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'james@fieldwork.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Fieldwork Renovation","service_location":"Queens, NY"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000003', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'aisha@stoneandtimber.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Stone & Timber Studio","service_location":"Jersey City, NJ"}', now(), now(), '', '', '', ''),
  ('10000000-0000-4000-8000-000000000004', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
   'leo@formandfinish.example', extensions.crypt('groundwork-demo', extensions.gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"business_name":"Form & Finish Works","service_location":"Brooklyn, NY"}', now(), now(), '', '', '', '')
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
  ('20000000-0000-4000-8000-000000000004', '10000000-0000-4000-8000-000000000004', 'leo@formandfinish.example', '{"sub":"10000000-0000-4000-8000-000000000004","email":"leo@formandfinish.example"}', 'email', now(), now(), now())
on conflict (provider_id, provider) do nothing;

update public.contractors c set
  business_name = profile.business_name,
  description = profile.description,
  service_location = profile.location
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Northline Build Co.', 'Thoughtful residential construction and careful brownstone restorations, from first drawings through final inspection.', 'Brooklyn, NY'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Fieldwork Renovation', 'A hands-on renovation crew specializing in kitchens, bathrooms, and the details that make older homes work better.', 'Queens, NY'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Stone & Timber Studio', 'Small-scale architectural woodwork and masonry delivered with an emphasis on durable, honest materials.', 'Jersey City, NJ'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Form & Finish Works', 'Reliable finish carpentry and residential upgrades for homeowners, designers, and local property managers.', 'Brooklyn, NY')
) as profile(owner_id, business_name, description, location)
join public.contractor_owners co on co.owner_id = profile.owner_id
where c.id = co.contractor_id;

update public.contractor_contacts cc set
  email = auth_user.email,
  phone = profile.phone
from auth.users auth_user
join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, '+1 718 555 0134'),
  ('10000000-0000-4000-8000-000000000002'::uuid, '+1 718 555 0188'),
  ('10000000-0000-4000-8000-000000000003'::uuid, '+1 201 555 0162'),
  ('10000000-0000-4000-8000-000000000004'::uuid, '+1 347 555 0110')
) as profile(owner_id, phone) on profile.owner_id = auth_user.id
where cc.contractor_id = (select co.contractor_id from public.contractor_owners co where co.owner_id = auth_user.id);

update public.contractor_experience e set years_experience = profile.years, qualifications = profile.qualifications
from public.contractors c
join public.contractor_owners co on co.contractor_id = c.id
join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 14::smallint, 'NYC Home Improvement Contractor · OSHA 30 · Passive House fundamentals'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 9::smallint, 'EPA Lead-Safe Certified · NYC Home Improvement Contractor'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 18::smallint, 'Certified finish carpenter · Historic masonry restoration workshop'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 11::smallint, 'OSHA 10 · EPA Lead-Safe Certified · Licensed and insured')
) as profile(owner_id, years, qualifications) on profile.owner_id = co.owner_id
where e.contractor_id = c.id;

update public.contractor_availability a set status = profile.status, note = profile.note
from public.contractors c
join public.contractor_owners co on co.contractor_id = c.id
join (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'limited', 'Booking projects for late summer.'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'available', 'Taking on one additional kitchen or bath project.'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'available', 'Open for custom millwork and restoration consultations.'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'unavailable', 'Fully booked through the end of the season.')
) as profile(owner_id, status, note) on profile.owner_id = co.owner_id
where a.contractor_id = c.id;

insert into public.contractor_skills (contractor_id, skill)
select c.id, profile.skill
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Brownstone restoration'),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'General contracting'),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Structural repair'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Kitchen renovation'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Bathroom remodeling'),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Tile installation'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Custom millwork'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Finish carpentry'),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Masonry'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Finish carpentry'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Deck construction'),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Interior repairs')
) as profile(owner_id, skill)
join public.contractor_owners co on co.owner_id = profile.owner_id
join public.contractors c on c.id = co.contractor_id
on conflict (contractor_id, skill_key) do nothing;

insert into public.portfolio_projects (
  contractor_id, title, category, description, status, completed_on, location, project_value
)
select c.id, project.title, project.category, project.description, project.status, project.completed_on::date,
  c.service_location, project.project_value
from (values
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Clinton Hill brownstone renewal', 'Restoration', 'Restored original stoop masonry and rebuilt the rear deck while keeping the home occupied.', 'completed', '2025-10-18', 86500::numeric),
  ('10000000-0000-4000-8000-000000000001'::uuid, 'Prospect Heights garden apartment', 'Renovation', 'Reworked a compact garden apartment with resilient finishes and improved daylight.', 'completed', '2024-06-12', 124000::numeric),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Jackson Heights family kitchen', 'Kitchen', 'A full kitchen refit with custom storage, durable tile, and an improved work triangle.', 'completed', '2025-03-29', 48200::numeric),
  ('10000000-0000-4000-8000-000000000002'::uuid, 'Sunnyside bath renovation', 'Bathroom', 'Replaced plumbing and finishes in a pre-war apartment with careful waterproofing.', 'completed', '2024-11-07', 27800::numeric),
  ('10000000-0000-4000-8000-000000000003'::uuid, 'Walnut library wall', 'Millwork', 'Designed and installed a full-height walnut bookcase with integrated reading desk.', 'completed', '2025-08-15', 19300::numeric),
  ('10000000-0000-4000-8000-000000000004'::uuid, 'Carroll Gardens roof deck', 'Carpentry', 'Built a cedar rooftop deck and privacy screen sized for a narrow city lot.', 'completed', '2025-05-21', 34100::numeric)
) as project(owner_id, title, category, description, status, completed_on, project_value)
join public.contractor_owners co on co.owner_id = project.owner_id
join public.contractors c on c.id = co.contractor_id;
