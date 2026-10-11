insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change
)
values (
  '10000000-0000-4000-8000-000000000012',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'sana@mitrahome.example',
  extensions.crypt('groundwork-demo', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"business_name":"Mitra Home Renovations","service_location":"Kolkata, West Bengal"}',
  now(),
  now(),
  '',
  '',
  '',
  ''
)
on conflict (id) do update set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  email_confirmed_at = excluded.email_confirmed_at,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
values (
  '20000000-0000-4000-8000-000000000012',
  '10000000-0000-4000-8000-000000000012',
  'sana@mitrahome.example',
  '{"sub":"10000000-0000-4000-8000-000000000012","email":"sana@mitrahome.example"}',
  'email',
  now(),
  now(),
  now()
)
on conflict (provider_id, provider) do nothing;

do $$
declare
  v_owner_id constant uuid := '10000000-0000-4000-8000-000000000012';
  v_contractor_id uuid;
begin
  select co.contractor_id into v_contractor_id
  from public.contractor_owners co
  where co.owner_id = v_owner_id;

  if v_contractor_id is null then
    insert into public.contractors (business_name, description, service_location)
    values (
      'Mitra Home Renovations',
      'End-to-end home renovation for Kolkata flats and family homes, including layout updates, kitchen and bathroom upgrades, and complete interior finishing.',
      'Kolkata, West Bengal'
    )
    returning id into v_contractor_id;
    insert into public.contractor_owners (contractor_id, owner_id)
    values (v_contractor_id, v_owner_id);
  end if;

  update public.contractors set
    business_name = 'Mitra Home Renovations',
    description = 'End-to-end home renovation for Kolkata flats and family homes, including layout updates, kitchen and bathroom upgrades, and complete interior finishing.',
    service_location = 'Kolkata, West Bengal'
  where id = v_contractor_id;

  update public.contractor_contacts set
    email = 'sana@mitrahome.example',
    phone = '+91 98765 40282'
  where contractor_contacts.contractor_id = v_contractor_id;

  update public.contractor_experience set
    years_experience = 15,
    qualifications = 'Residential renovation project management · Kitchen, bathroom, and interior finishing'
  where contractor_experience.contractor_id = v_contractor_id;

  update public.contractor_availability set
    status = 'available',
    note = 'Booking full-home renovations and room-by-room upgrades.'
  where contractor_availability.contractor_id = v_contractor_id;

  insert into public.contractor_skills (contractor_id, skill)
  values
    (v_contractor_id, 'Full home renovation'),
    (v_contractor_id, 'Kitchen and bathroom remodelling'),
    (v_contractor_id, 'Interior finishing and space planning')
  on conflict (contractor_id, skill_key) do nothing;

  insert into public.portfolio_projects (
    contractor_id, title, category, description, status, completed_on, location, image_path, project_value
  )
  values
    (
      v_contractor_id, 'Salt Lake family home renovation', 'Home renovation',
      'Refreshed a lived-in family flat with brighter rooms, durable flooring, updated storage, and coordinated interior finishes.',
      'completed', '2025-02-20', 'Kolkata, West Bengal',
      'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80',
      1850000
    ),
    (
      v_contractor_id, 'Ballygunge kitchen and bathroom upgrade', 'Home renovation',
      'Modernised the kitchen and bathroom with improved layouts, new fittings, water-resistant finishes, and practical storage.',
      'completed', '2024-09-12', 'Kolkata, West Bengal',
      'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80',
      1120000
    )
  on conflict (contractor_id, project_key) do update set
    category = excluded.category,
    description = excluded.description,
    status = excluded.status,
    completed_on = excluded.completed_on,
    location = excluded.location,
    image_path = excluded.image_path,
    project_value = excluded.project_value;
end
$$;
