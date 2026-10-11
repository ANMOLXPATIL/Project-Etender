create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors (id) on delete cascade,
  customer_name text not null check (char_length(btrim(customer_name)) between 2 and 120),
  customer_email text not null check (char_length(customer_email) between 3 and 254 and position('@' in customer_email) > 1),
  customer_phone text not null default '' check (char_length(customer_phone) <= 40),
  project_type text not null check (char_length(btrim(project_type)) between 2 and 100),
  project_location text not null default '' check (char_length(project_location) <= 160),
  project_description text not null check (char_length(btrim(project_description)) between 20 and 2000),
  budget_range text not null default '' check (budget_range in ('', 'Under $5,000', '$5,000–$15,000', '$15,000–$50,000', '$50,000+')),
  timeline text not null default '' check (timeline in ('', 'As soon as possible', 'Within 1–3 months', 'Within 3–6 months', 'Just planning')),
  status text not null default 'new' check (status in ('new', 'quoted', 'declined')),
  quote_amount numeric(12, 2) check (quote_amount is null or quote_amount >= 0),
  check ((status = 'quoted') = (quote_amount is not null)),
  quote_message text not null default '' check (char_length(quote_message) <= 2000),
  access_token_hash text not null unique check (char_length(access_token_hash) = 64),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index quote_requests_contractor_created_idx
  on public.quote_requests (contractor_id, created_at desc);

create trigger quote_requests_set_updated_at before update on public.quote_requests
for each row execute function public.set_updated_at();

alter table public.quote_requests enable row level security;
revoke all on public.quote_requests from anon, authenticated;

create or replace view public.contractor_listings with (security_invoker = true) as
select c.id, c.business_name, c.description, c.service_location, c.version,
  c.business_name_version, c.description_version, c.service_location_version,
  c.created_at, c.updated_at,
  (select p.image_path from public.portfolio_projects p
   where p.contractor_id = c.id and p.image_path is not null
   order by p.created_at desc limit 1) as featured_image_path
from public.contractors c;

create function public.submit_quote_request(
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
begin
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
    contractor_id, customer_name, customer_email, customer_phone, project_type,
    project_location, project_description, budget_range, timeline, access_token_hash
  ) values (
    p_contractor_id, btrim(p_customer_name), lower(btrim(p_customer_email)), coalesce(btrim(p_customer_phone), ''),
    btrim(p_project_type), coalesce(btrim(p_project_location), ''), btrim(p_project_description),
    coalesce(p_budget_range, ''), coalesce(p_timeline, ''),
    encode(extensions.digest(convert_to(p_access_token, 'UTF8'), 'sha256'), 'hex')
  ) returning id into request_id;
  return request_id;
end;
$$;

create function public.get_customer_quote(p_access_token text)
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
  where p_access_token is not null
    and char_length(p_access_token) between 30 and 80
    and q.access_token_hash = encode(extensions.digest(convert_to(p_access_token, 'UTF8'), 'sha256'), 'hex');
$$;

create function public.list_contractor_quotes(p_contractor_id uuid)
returns table (
  id uuid, contractor_id uuid, customer_name text, customer_email text, customer_phone text,
  project_type text, project_location text, project_description text, budget_range text,
  timeline text, status text, quote_amount numeric, quote_message text, created_at timestamptz, updated_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select q.id, q.contractor_id, q.customer_name, q.customer_email, q.customer_phone,
    q.project_type, q.project_location, q.project_description, q.budget_range,
    q.timeline, q.status, q.quote_amount, q.quote_message, q.created_at, q.updated_at
  from public.quote_requests q
  where q.contractor_id = p_contractor_id and public.is_contractor_owner(p_contractor_id)
  order by q.created_at desc;
$$;

create function public.respond_to_quote_request(
  p_request_id uuid,
  p_status text,
  p_quote_amount numeric,
  p_quote_message text
)
returns table (status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status is null or p_status not in ('quoted', 'declined')
     or (p_status = 'quoted' and (p_quote_amount is null or p_quote_amount < 0))
     or (p_status = 'declined' and p_quote_amount is not null)
     or char_length(coalesce(p_quote_message, '')) > 2000 then
    return query select 'invalid'::text;
    return;
  end if;
  update public.quote_requests q
  set status = p_status, quote_amount = p_quote_amount, quote_message = coalesce(p_quote_message, '')
  where q.id = p_request_id and public.is_contractor_owner(q.contractor_id);
  if not found then
    return query select 'forbidden'::text;
    return;
  end if;
  return query select 'ok'::text;
end;
$$;

revoke all on function public.submit_quote_request(uuid, text, text, text, text, text, text, text, text, text),
  public.get_customer_quote(text), public.list_contractor_quotes(uuid),
  public.respond_to_quote_request(uuid, text, numeric, text) from public, anon, authenticated;
grant execute on function public.submit_quote_request(uuid, text, text, text, text, text, text, text, text, text),
  public.get_customer_quote(text) to anon, authenticated;
grant execute on function public.list_contractor_quotes(uuid),
  public.respond_to_quote_request(uuid, text, numeric, text) to authenticated;
