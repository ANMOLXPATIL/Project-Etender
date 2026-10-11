create table public.customer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 120),
  created_at timestamptz not null default now()
);

alter table public.customer_profiles enable row level security;
revoke all on public.customer_profiles from public, anon, authenticated;

create or replace function public.create_contractor_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_contractor_id uuid;
begin
  if new.raw_user_meta_data ->> 'account_type' = 'customer' then
    insert into public.customer_profiles (user_id, full_name)
    values (new.id, coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'New customer'));
    return new;
  end if;

  insert into public.contractors (business_name, service_location)
  values (
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'business_name'), ''), 'New contractor'),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'service_location'), ''), '')
  ) returning id into new_contractor_id;
  insert into public.contractor_owners (contractor_id, owner_id) values (new_contractor_id, new.id);
  update public.contractor_contacts set email = coalesce(new.email, '')
  where contractor_contacts.contractor_id = new_contractor_id;
  return new;
end;
$$;

create or replace function public.get_my_account_type()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (select 1 from public.customer_profiles cp where cp.user_id = (select auth.uid())) then 'customer'
    when exists (select 1 from public.contractor_owners co where co.owner_id = (select auth.uid())) then 'contractor'
    else null
  end;
$$;

revoke all on function public.get_my_account_type() from public, anon, authenticated;
grant execute on function public.get_my_account_type() to authenticated;

alter table public.quote_requests
  add column customer_id uuid references public.customer_profiles (user_id) on delete set null;
create index quote_requests_customer_created_idx
  on public.quote_requests (customer_id, created_at desc);

create or replace function public.submit_quote_request(
  p_contractor_id uuid,
  p_access_token text,
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_project_type text,
  p_project_location text,
  p_project_description text,
  p_budget_range text,
  p_timeline text
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
  if customer_user_id is null or not exists (
    select 1 from public.customer_profiles cp where cp.user_id = customer_user_id
  ) then
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
     or coalesce(p_budget_range, '') not in ('', 'Under $5,000', '$5,000–$15,000', '$15,000–$50,000', '$50,000+')
     or coalesce(p_timeline, '') not in ('', 'As soon as possible', 'Within 1–3 months', 'Within 3–6 months', 'Just planning') then
    raise exception 'Please check the enquiry details and try again.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.contractors c where c.id = p_contractor_id) then
    raise exception 'This contractor profile could not be found.' using errcode = '22023';
  end if;
  insert into public.quote_requests (
    contractor_id, customer_id, customer_name, customer_email, customer_phone, project_type,
    project_location, project_description, budget_range, timeline, access_token_hash
  ) values (
    p_contractor_id, customer_user_id, btrim(p_customer_name), lower(btrim(p_customer_email)), coalesce(btrim(p_customer_phone), ''),
    btrim(p_project_type), coalesce(btrim(p_project_location), ''), btrim(p_project_description),
    coalesce(p_budget_range, ''), coalesce(p_timeline, ''),
    encode(extensions.digest(convert_to(p_access_token, 'UTF8'), 'sha256'), 'hex')
  ) returning id into request_id;
  return request_id;
end;
$$;

create function public.list_my_quote_requests()
returns table (
  id uuid, contractor_id uuid, contractor_name text, project_type text, project_location text,
  project_description text, budget_range text, timeline text, status text, quote_amount numeric,
  quote_message text, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.contractor_id, c.business_name, q.project_type, q.project_location,
    q.project_description, q.budget_range, q.timeline, q.status, q.quote_amount,
    q.quote_message, q.created_at, q.updated_at
  from public.quote_requests q
  join public.contractors c on c.id = q.contractor_id
  where q.customer_id = (select auth.uid())
    and exists (select 1 from public.customer_profiles cp where cp.user_id = (select auth.uid()))
  order by q.created_at desc;
$$;

revoke all on function public.list_my_quote_requests() from public, anon, authenticated;
grant execute on function public.list_my_quote_requests() to authenticated;

update public.portfolio_projects p
set image_path = sample.image_url
from (values
  ('Clinton Hill brownstone renewal', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'),
  ('Prospect Heights garden apartment', 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?auto=format&fit=crop&w=1200&q=80'),
  ('Jackson Heights family kitchen', 'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?auto=format&fit=crop&w=1200&q=80'),
  ('Sunnyside bath renovation', 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80'),
  ('Walnut library wall', 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=1200&q=80'),
  ('Carroll Gardens roof deck', 'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=80')
) as sample(project_title, image_url)
where p.title = sample.project_title and p.image_path is null;

delete from auth.users u
using public.contractor_owners co, public.contractors c
where co.owner_id = u.id
  and c.id = co.contractor_id
  and lower(btrim(c.business_name)) in ('neptune', 'neptune india')
  and c.service_location ilike 'pune%';

delete from public.contractors c
where lower(btrim(c.business_name)) in ('neptune', 'neptune india')
  and c.service_location ilike 'pune%';
