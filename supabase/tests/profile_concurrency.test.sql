create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;

begin;
select plan(16);

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '30000000-0000-4000-8000-000000000001', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'concurrency-test@example.test',
  extensions.crypt('temporary-test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"business_name":"Concurrent Works"}', now(), now()
);
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '30000000-0000-4000-8000-000000000002', '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'other-test@example.test',
  extensions.crypt('temporary-test-password', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', '{"business_name":"Other Works"}', now(), now()
);

select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select set_config('test.contractor_id', public.get_my_contractor_id()::text, true);
set local role authenticated;

select is(
  (select status from public.save_contractor_basics(
    public.get_my_contractor_id(), 1, 1, 1, 1, 1,
    true, false, false, false, false,
    'Concurrent Works Updated', '', '', '', ''
  )),
  'ok',
  'owner can atomically save basics at the expected version'
);

select is(
  (select status from public.save_contractor_basics(
    public.get_my_contractor_id(), 1, 1, 1, 1, 1,
    true, false, false, false, false,
    'Stale Name', '', '', '', ''
  )),
  'conflict',
  'stale edit to the same profile section reports a conflict'
);

select is(
  (select status from public.save_contractor_basics(
    public.get_my_contractor_id(), 1, 1, 1, 1, 1,
    false, true, false, false, false,
    '', 'A valid independent description.', '', '', ''
  )),
  'ok',
  'a concurrent edit to a different basic field is merged'
);

select is(
  (select status from public.save_contractor_experience(
    public.get_my_contractor_id(), 1, 12, 'OSHA 30'
  )),
  'ok',
  'a concurrent independent section update still succeeds'
);

select is(
  (select status from public.add_contractor_skill(
    public.get_my_contractor_id(), 'Finish carpentry'
  )),
  'ok',
  'owner can create a skill'
);

select is(
  (select status from public.add_contractor_skill(
    public.get_my_contractor_id(), '  finish carpentry '
  )),
  'duplicate',
  'case-insensitive normalized skills cannot be duplicated'
);

select is(
  (select status from public.create_portfolio_project(
    public.get_my_contractor_id(),
    'Independent project save', 'Renovation', 'A project written independently from skills.',
    'completed', '2026-01-10', 'New York, NY', null, 12500
  )),
  'ok',
  'portfolio can be saved independently'
);

select is(
  (select status from public.create_portfolio_project(
    public.get_my_contractor_id(),
    '  independent PROJECT save ', 'Renovation', 'Duplicate title.',
    'completed', '2026-01-10', 'New York, NY', null, 12500
  )),
  'duplicate',
  'normalized project titles cannot be duplicated for one contractor'
);

select is(
  (select status from public.update_portfolio_project(
    (select id from public.portfolio_projects where title = 'Independent project save'), 1,
    'Updated project title', 'Renovation', 'Validated change.', 'completed', '2026-01-10',
    'New York, NY', null, 12500
  )),
  'ok',
  'project owner can update the project with its current version'
);

select is(
  (select status from public.update_portfolio_project(
    (select id from public.portfolio_projects where title = 'Updated project title'), 1,
    'Stale project title', 'Renovation', 'stale', 'completed', '2026-01-10',
    'New York, NY', null, 12500
  )),
  'conflict',
  'stale project update is rejected'
);

select is(
  (select status from public.create_portfolio_project(
    public.get_my_contractor_id(),
    'X', 'R', '', 'completed', null, '', null, -1
  )),
  'invalid',
  'invalid project data is rejected before write'
);

select is(
  (select count(*)::integer from public.portfolio_projects where title = 'Stale project title'),
  0,
  'rejected stale update leaves committed project intact'
);

select is(
  (select count(*)::integer from public.contractor_listings where business_name = 'Concurrent Works Updated'),
  1,
  'public listing view returns the committed contractor profile'
);

select set_config('request.jwt.claims', '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}', true);

select is(
  public.is_contractor_owner(current_setting('test.contractor_id')::uuid),
  false,
  'a different authenticated account does not own the contractor'
);

select is(
  (select count(*)::integer from public.contractor_contacts where contractor_id = current_setting('test.contractor_id')::uuid),
  0,
  'RLS hides private contact details from other accounts'
);

select is(
  (select status from public.save_contractor_basics(
    current_setting('test.contractor_id')::uuid, 2, 2, 1, 1, 1,
    true, true, true, true, true,
    'Unauthorized change', 'not allowed', 'New York, NY', 'intruder@example.test', '555-0102'
  )),
  'forbidden',
  'unauthorized profile mutation is rejected'
);

select * from finish();
rollback;
