alter table public.quote_requests
  add column project_image_paths text[] not null default '{}';

alter table public.quote_requests
  drop constraint quote_requests_budget_range_check,
  add constraint quote_requests_budget_range_check
    check (budget_range in ('', 'Under ₹50,000', '₹50,000–₹2 lakh', '₹2–₹10 lakh', '₹10 lakh+')),
  add constraint quote_requests_image_count_check
    check (cardinality(project_image_paths) <= 3);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('quote-images', 'quote-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create function public.is_customer_account()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.customer_profiles cp where cp.user_id = (select auth.uid()));
$$;

create function public.can_access_quote_image(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.quote_requests q
    where p_path = any(q.project_image_paths)
      and (
        q.customer_id = (select auth.uid())
        or public.is_contractor_owner(q.contractor_id)
      )
  );
$$;

revoke all on function public.is_customer_account(), public.can_access_quote_image(text) from public, anon, authenticated;
grant execute on function public.is_customer_account(), public.can_access_quote_image(text) to authenticated;

create policy "Customers upload quote photos"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'quote-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_customer_account()
);

create policy "Quote participants view attached photos"
on storage.objects for select to authenticated
using (
  bucket_id = 'quote-images'
  and public.can_access_quote_image(name)
);

create policy "Customers clean up unsent quote photos"
on storage.objects for delete to authenticated
using (
  bucket_id = 'quote-images'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and public.is_customer_account()
);

drop function public.submit_quote_request(uuid, text, text, text, text, text, text, text, text, text);

create function public.submit_quote_request(
  p_contractor_id uuid,
  p_access_token text,
  p_customer_id uuid,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_project_type text,
  p_project_location text,
  p_project_description text,
  p_budget_range text,
  p_timeline text,
  p_project_image_paths text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_id uuid;
  customer_user_id uuid := (select auth.uid());
begin
  if customer_user_id is null or p_customer_id is distinct from customer_user_id
     or not exists (select 1 from public.customer_profiles cp where cp.user_id = customer_user_id) then
    raise exception 'Sign in with a customer account to send a quote request.' using errcode = '42501';
  end if;
  if p_access_token is null or char_length(p_access_token) not between 30 and 80
     or p_contractor_id is null
     or p_customer_name is null or char_length(btrim(p_customer_name)) not between 2 and 120
     or p_customer_email is null or char_length(btrim(p_customer_email)) not between 3 and 254
     or position('@' in btrim(p_customer_email)) <= 1
     or char_length(coalesce(p_customer_phone, '')) > 40
     or p_project_type is null or char_length(btrim(p_project_type)) not between 2 and 100
     or char_length(coalesce(p_project_location, '')) > 160
     or p_project_description is null or char_length(btrim(p_project_description)) not between 20 and 2000
     or coalesce(p_budget_range, '') not in ('', 'Under ₹50,000', '₹50,000–₹2 lakh', '₹2–₹10 lakh', '₹10 lakh+')
     or coalesce(p_timeline, '') not in ('', 'As soon as possible', 'Within 1–3 months', 'Within 3–6 months', 'Just planning')
     or coalesce(cardinality(p_project_image_paths), 0) > 3
     or exists (
       select 1 from unnest(coalesce(p_project_image_paths, '{}')) image_path
       where image_path not like customer_user_id::text || '/%'
     ) then
    raise exception 'Please check the enquiry details and try again.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.contractors c where c.id = p_contractor_id) then
    raise exception 'This contractor profile could not be found.' using errcode = '22023';
  end if;
  insert into public.quote_requests (
    contractor_id, customer_id, customer_name, customer_email, customer_phone, project_type,
    project_location, project_description, budget_range, timeline, access_token_hash, project_image_paths
  ) values (
    p_contractor_id, customer_user_id, btrim(p_customer_name), lower(btrim(p_customer_email)), coalesce(btrim(p_customer_phone), ''),
    btrim(p_project_type), coalesce(btrim(p_project_location), ''), btrim(p_project_description),
    coalesce(p_budget_range, ''), coalesce(p_timeline, ''),
    encode(extensions.digest(convert_to(p_access_token, 'UTF8'), 'sha256'), 'hex'),
    coalesce(p_project_image_paths, '{}')
  ) returning id into request_id;
  return request_id;
end;
$$;

drop function public.get_customer_quote(text);
create function public.get_customer_quote(p_access_token text)
returns table (
  id uuid, contractor_id uuid, contractor_name text, project_type text, project_location text,
  project_description text, budget_range text, timeline text, status text, quote_amount numeric,
  quote_message text, project_image_paths text[], created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.contractor_id, c.business_name, q.project_type, q.project_location,
    q.project_description, q.budget_range, q.timeline, q.status, q.quote_amount,
    q.quote_message, q.project_image_paths, q.created_at, q.updated_at
  from public.quote_requests q
  join public.contractors c on c.id = q.contractor_id
  where p_access_token is not null
    and char_length(p_access_token) between 30 and 80
    and q.access_token_hash = encode(extensions.digest(convert_to(p_access_token, 'UTF8'), 'sha256'), 'hex')
    and q.customer_id = (select auth.uid());
$$;

drop function public.list_contractor_quotes(uuid);
create function public.list_contractor_quotes(p_contractor_id uuid)
returns table (
  id uuid, contractor_id uuid, customer_name text, customer_email text, customer_phone text,
  project_type text, project_location text, project_description text, budget_range text,
  timeline text, status text, quote_amount numeric, quote_message text, project_image_paths text[],
  created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.contractor_id, q.customer_name, q.customer_email, q.customer_phone,
    q.project_type, q.project_location, q.project_description, q.budget_range,
    q.timeline, q.status, q.quote_amount, q.quote_message, q.project_image_paths, q.created_at, q.updated_at
  from public.quote_requests q
  where q.contractor_id = p_contractor_id and public.is_contractor_owner(p_contractor_id)
  order by q.created_at desc;
$$;

drop function public.list_my_quote_requests();
create function public.list_my_quote_requests()
returns table (
  id uuid, contractor_id uuid, contractor_name text, project_type text, project_location text,
  project_description text, budget_range text, timeline text, status text, quote_amount numeric,
  quote_message text, project_image_paths text[], created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.contractor_id, c.business_name, q.project_type, q.project_location,
    q.project_description, q.budget_range, q.timeline, q.status, q.quote_amount,
    q.quote_message, q.project_image_paths, q.created_at, q.updated_at
  from public.quote_requests q
  join public.contractors c on c.id = q.contractor_id
  where q.customer_id = (select auth.uid())
    and exists (select 1 from public.customer_profiles cp where cp.user_id = (select auth.uid()))
  order by q.created_at desc;
$$;

revoke all on function public.submit_quote_request(uuid, text, uuid, text, text, text, text, text, text, text, text, text[]),
  public.get_customer_quote(text), public.list_contractor_quotes(uuid),
  public.list_my_quote_requests() from public, anon, authenticated;
grant execute on function public.submit_quote_request(uuid, text, uuid, text, text, text, text, text, text, text, text, text[]),
  public.get_customer_quote(text), public.list_my_quote_requests() to authenticated;
grant execute on function public.list_contractor_quotes(uuid) to authenticated;

update public.contractors c set
  business_name = sample.business_name,
  description = sample.description,
  service_location = sample.location
from (values
  ('maya@northline.example', 'Aarav Build & Restore', 'Residential construction and careful restoration, from the first site visit through the final finish.', 'Pune, Maharashtra'),
  ('james@fieldwork.example', 'Fieldwork Renovation India', 'A hands-on renovation crew for kitchens, bathrooms, and practical upgrades to Indian homes.', 'Mumbai, Maharashtra'),
  ('aisha@stoneandtimber.example', 'Stone & Timber Studio', 'Custom woodwork, masonry, and thoughtful renovations using durable materials and skilled local craft.', 'Bengaluru, Karnataka'),
  ('leo@formandfinish.example', 'Form & Finish Works', 'Reliable finish carpentry and residential upgrades for homeowners, designers, and local property managers.', 'Hyderabad, Telangana')
) as sample(email, business_name, description, location)
join auth.users u on u.email = sample.email
join public.contractor_owners co on co.owner_id = u.id
where c.id = co.contractor_id;

update public.contractor_contacts cc
set phone = sample.phone
from (values
  ('maya@northline.example', '+91 98765 40134'),
  ('james@fieldwork.example', '+91 98765 40188'),
  ('aisha@stoneandtimber.example', '+91 98765 40162'),
  ('leo@formandfinish.example', '+91 98765 40110')
) as sample(email, phone)
join auth.users u on u.email = sample.email
join public.contractor_owners co on co.owner_id = u.id
where cc.contractor_id = co.contractor_id;

update public.portfolio_projects p
set title = sample.new_title,
    category = sample.category,
    description = sample.description,
    location = c.service_location,
    project_value = sample.project_value
from public.contractors c, (values
  ('Clinton Hill brownstone renewal', 'Kothrud row-house restoration', 'Home restoration', 'Refreshed a Pune row house with repaired stonework, a shaded sit-out, and locally sourced finishes.', 1850000::numeric),
  ('Prospect Heights garden apartment', 'Baner family home renovation', 'Home renovation', 'Updated a family home with better cross-ventilation, durable flooring, and a brighter living space.', 2650000::numeric),
  ('Jackson Heights family kitchen', 'Andheri modular kitchen', 'Modular kitchen', 'A complete modular kitchen fit-out with smart storage, granite counters, and easy-clean tile.', 975000::numeric),
  ('Sunnyside bath renovation', 'Bandra bathroom upgrade', 'Bathroom renovation', 'Reworked plumbing and finishes with careful waterproofing and efficient fixtures.', 565000::numeric),
  ('Walnut library wall', 'Indiranagar teak storage wall', 'Custom woodwork', 'Designed and installed a made-to-measure teak storage wall with a compact work desk.', 390000::numeric),
  ('Carroll Gardens roof deck', 'Jubilee Hills terrace upgrade', 'Terrace carpentry', 'Built a weather-ready terrace deck and privacy screen for a Hyderabad home.', 685000::numeric)
) as sample(old_title, new_title, category, description, project_value)
where p.contractor_id = c.id and p.title = sample.old_title;
