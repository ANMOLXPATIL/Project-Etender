create extension if not exists pgcrypto with schema extensions;

create table public.contractors (
  id uuid primary key default gen_random_uuid(),
  business_name text not null check (char_length(btrim(business_name)) between 2 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  service_location text not null default '' check (char_length(service_location) <= 160),
  version integer not null default 1 check (version > 0),
  business_name_version integer not null default 1 check (business_name_version > 0),
  description_version integer not null default 1 check (description_version > 0),
  service_location_version integer not null default 1 check (service_location_version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.contractor_owners (
  contractor_id uuid primary key references public.contractors (id) on delete cascade,
  owner_id uuid not null unique references auth.users (id) on delete cascade
);

create table public.contractor_contacts (
  contractor_id uuid primary key references public.contractors (id) on delete cascade,
  email text not null default '' check (char_length(email) <= 254 and (email = '' or position('@' in email) > 1)),
  email_version integer not null default 1 check (email_version > 0),
  phone text not null default '' check (char_length(phone) <= 40),
  phone_version integer not null default 1 check (phone_version > 0),
  updated_at timestamptz not null default now()
);

create table public.contractor_experience (
  contractor_id uuid primary key references public.contractors (id) on delete cascade,
  years_experience smallint not null default 0 check (years_experience between 0 and 80),
  qualifications text not null default '' check (char_length(qualifications) <= 2000),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

create table public.contractor_availability (
  contractor_id uuid primary key references public.contractors (id) on delete cascade,
  status text not null default 'available' check (status in ('available', 'limited', 'unavailable')),
  note text not null default '' check (char_length(note) <= 500),
  version integer not null default 1 check (version > 0),
  updated_at timestamptz not null default now()
);

create table public.contractor_skills (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors (id) on delete cascade,
  skill text not null check (char_length(btrim(skill)) between 2 and 64),
  skill_key text generated always as (lower(btrim(skill))) stored,
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  unique (contractor_id, skill_key)
);

create table public.portfolio_projects (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.contractors (id) on delete cascade,
  title text not null check (char_length(btrim(title)) between 2 and 140),
  project_key text generated always as (lower(btrim(title))) stored,
  category text not null check (char_length(btrim(category)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 2000),
  status text not null default 'completed' check (status in ('completed', 'in_progress', 'planned')),
  completed_on date,
  location text not null default '' check (char_length(location) <= 160),
  image_path text check (image_path is null or char_length(image_path) <= 500),
  project_value numeric(12, 2) check (project_value is null or project_value >= 0),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contractor_id, project_key)
);

create index contractors_name_idx on public.contractors using btree (business_name);
create index contractors_location_idx on public.contractors using btree (service_location);
create index contractor_skills_search_idx on public.contractor_skills using btree (skill_key);
create index portfolio_projects_contractor_idx on public.portfolio_projects (contractor_id, created_at desc);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger contractors_set_updated_at before update on public.contractors
for each row execute function public.set_updated_at();
create trigger contacts_set_updated_at before update on public.contractor_contacts
for each row execute function public.set_updated_at();
create trigger experience_set_updated_at before update on public.contractor_experience
for each row execute function public.set_updated_at();
create trigger availability_set_updated_at before update on public.contractor_availability
for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.portfolio_projects
for each row execute function public.set_updated_at();

create function public.touch_contractor_updated_at()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  parent_id uuid;
begin
  if tg_op = 'DELETE' then parent_id := old.contractor_id;
  else parent_id := new.contractor_id;
  end if;
  update public.contractors set updated_at = now() where id = parent_id;
  if tg_op = 'DELETE' then return old;
  else return new;
  end if;
end;
$$;

create trigger experience_touch_contractor after insert or update or delete on public.contractor_experience
for each row execute function public.touch_contractor_updated_at();
create trigger availability_touch_contractor after insert or update or delete on public.contractor_availability
for each row execute function public.touch_contractor_updated_at();
create trigger contacts_touch_contractor after update on public.contractor_contacts
for each row execute function public.touch_contractor_updated_at();
create trigger skills_touch_contractor after insert or update or delete on public.contractor_skills
for each row execute function public.touch_contractor_updated_at();
create trigger projects_touch_contractor after insert or update or delete on public.portfolio_projects
for each row execute function public.touch_contractor_updated_at();

create function public.initialize_contractor_sections()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.contractor_contacts (contractor_id)
  values (new.id) on conflict (contractor_id) do nothing;
  insert into public.contractor_experience (contractor_id) values (new.id)
  on conflict (contractor_id) do nothing;
  insert into public.contractor_availability (contractor_id) values (new.id)
  on conflict (contractor_id) do nothing;
  return new;
end;
$$;

create trigger contractors_initialize_sections after insert on public.contractors
for each row execute function public.initialize_contractor_sections();

create view public.contractor_listings with (security_invoker = true) as
select id, business_name, description, service_location, version, business_name_version,
  description_version, service_location_version, created_at, updated_at
from public.contractors;

create function public.is_contractor_owner(p_contractor_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contractors c
      join public.contractor_owners co on co.contractor_id = c.id
      where c.id = p_contractor_id and co.owner_id = (select auth.uid())
  );
$$;

create function public.owns_contractor_folder(p_folder text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.contractors c
      join public.contractor_owners co on co.contractor_id = c.id
      where c.id::text = p_folder and co.owner_id = (select auth.uid())
  );
$$;

create function public.get_my_contractor_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select co.contractor_id from public.contractor_owners co where co.owner_id = (select auth.uid()) limit 1;
$$;

revoke all on function public.is_contractor_owner(uuid), public.owns_contractor_folder(text),
  public.get_my_contractor_id() from public, anon, authenticated;
grant execute on function public.is_contractor_owner(uuid), public.get_my_contractor_id() to authenticated;
grant execute on function public.owns_contractor_folder(text) to authenticated;

create function public.create_contractor_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_contractor_id uuid;
begin
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

create trigger auth_user_create_contractor after insert on auth.users
for each row execute function public.create_contractor_for_new_user();

alter table public.contractors enable row level security;
alter table public.contractor_owners enable row level security;
alter table public.contractor_contacts enable row level security;
alter table public.contractor_experience enable row level security;
alter table public.contractor_availability enable row level security;
alter table public.contractor_skills enable row level security;
alter table public.portfolio_projects enable row level security;

create policy "Public can read contractor listings" on public.contractors
for select to anon, authenticated using (true);
create policy "Owners can read contact details" on public.contractor_contacts
for select to authenticated using (public.is_contractor_owner(contractor_id));
create policy "Public can read contractor experience" on public.contractor_experience
for select to anon, authenticated using (true);
create policy "Public can read contractor availability" on public.contractor_availability
for select to anon, authenticated using (true);
create policy "Public can read contractor skills" on public.contractor_skills
for select to anon, authenticated using (true);
create policy "Public can read portfolio projects" on public.portfolio_projects
for select to anon, authenticated using (true);

revoke all on public.contractors, public.contractor_owners, public.contractor_listings, public.contractor_contacts, public.contractor_experience,
  public.contractor_availability, public.contractor_skills, public.portfolio_projects from anon, authenticated;
grant select on public.contractors, public.contractor_listings, public.contractor_experience, public.contractor_availability,
  public.contractor_skills, public.portfolio_projects to anon, authenticated;
grant select on public.contractor_contacts to authenticated;

create function public.save_contractor_basics(
  p_contractor_id uuid,
  p_expected_business_name_version integer,
  p_expected_description_version integer,
  p_expected_service_location_version integer,
  p_expected_email_version integer,
  p_expected_phone_version integer,
  p_update_business_name boolean,
  p_update_description boolean,
  p_update_service_location boolean,
  p_update_email boolean,
  p_update_phone boolean,
  p_business_name text,
  p_description text,
  p_service_location text,
  p_email text,
  p_phone text
)
returns table (
  status text, version integer, updated_at timestamptz, business_name_version integer,
  description_version integer, service_location_version integer, email_version integer, phone_version integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.contractors%rowtype;
  current_contact public.contractor_contacts%rowtype;
begin
  if p_update_business_name is null or p_update_description is null or p_update_service_location is null
     or p_update_email is null or p_update_phone is null then
    return query select 'invalid'::text, null::integer, null::timestamptz, null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;
  if (p_update_business_name and (p_business_name is null or char_length(btrim(p_business_name)) not between 2 and 120))
     or (p_update_description and char_length(coalesce(p_description, '')) > 2000)
     or (p_update_service_location and char_length(coalesce(p_service_location, '')) > 160)
     or (p_update_email and (char_length(coalesce(p_email, '')) > 254 or (coalesce(p_email, '') <> '' and position('@' in p_email) <= 1)))
     or (p_update_phone and char_length(coalesce(p_phone, '')) > 40) then
    return query select 'invalid'::text, null::integer, null::timestamptz, null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;
  if not exists (
    select 1 from public.contractor_owners co
    where co.contractor_id = p_contractor_id and co.owner_id = (select auth.uid())
  ) then
    return query select 'forbidden'::text, null::integer, null::timestamptz, null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;
  select c.* into current_profile from public.contractors c
  where c.id = p_contractor_id for update;
  if not found then
    return query select 'forbidden'::text, null::integer, null::timestamptz, null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;
  select cc.* into current_contact from public.contractor_contacts cc
  where cc.contractor_id = p_contractor_id for update;
  if not found then
    return query select 'invalid'::text, null::integer, null::timestamptz, null::integer, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;
  if (p_update_business_name and current_profile.business_name_version <> p_expected_business_name_version)
     or (p_update_description and current_profile.description_version <> p_expected_description_version)
     or (p_update_service_location and current_profile.service_location_version <> p_expected_service_location_version)
     or (p_update_email and current_contact.email_version <> p_expected_email_version)
     or (p_update_phone and current_contact.phone_version <> p_expected_phone_version) then
    return query select 'conflict'::text, current_profile.version, current_profile.updated_at,
      current_profile.business_name_version, current_profile.description_version, current_profile.service_location_version,
      current_contact.email_version, current_contact.phone_version;
    return;
  end if;
  if p_update_business_name or p_update_description or p_update_service_location then
    update public.contractors c set
      business_name = case when p_update_business_name then btrim(p_business_name) else c.business_name end,
      description = case when p_update_description then coalesce(p_description, '') else c.description end,
      service_location = case when p_update_service_location then coalesce(p_service_location, '') else c.service_location end,
      business_name_version = c.business_name_version + case when p_update_business_name then 1 else 0 end,
      description_version = c.description_version + case when p_update_description then 1 else 0 end,
      service_location_version = c.service_location_version + case when p_update_service_location then 1 else 0 end,
      version = c.version + 1
    where c.id = p_contractor_id;
  end if;
  if p_update_email or p_update_phone then
    update public.contractor_contacts cc set
      email = case when p_update_email then coalesce(p_email, '') else cc.email end,
      phone = case when p_update_phone then coalesce(p_phone, '') else cc.phone end,
      email_version = cc.email_version + case when p_update_email then 1 else 0 end,
      phone_version = cc.phone_version + case when p_update_phone then 1 else 0 end
    where cc.contractor_id = p_contractor_id;
  end if;
  select c.* into current_profile from public.contractors c where c.id = p_contractor_id;
  select cc.* into current_contact from public.contractor_contacts cc where cc.contractor_id = p_contractor_id;
  return query select 'ok'::text, current_profile.version, current_profile.updated_at,
    current_profile.business_name_version, current_profile.description_version, current_profile.service_location_version,
    current_contact.email_version, current_contact.phone_version;
end;
$$;

create function public.save_contractor_experience(
  p_contractor_id uuid,
  p_expected_version integer,
  p_years_experience smallint,
  p_qualifications text
)
returns table (status text, version integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_version integer;
  saved_at timestamptz;
begin
  if p_years_experience is null or p_years_experience not between 0 and 80 or char_length(coalesce(p_qualifications, '')) > 2000 then
    return query select 'invalid'::text, null::integer, null::timestamptz;
    return;
  end if;
  if not public.is_contractor_owner(p_contractor_id) then
    return query select 'forbidden'::text, null::integer, null::timestamptz;
    return;
  end if;
  update public.contractor_experience e
  set years_experience = p_years_experience, qualifications = coalesce(p_qualifications, ''), version = e.version + 1
  where e.contractor_id = p_contractor_id and e.version = p_expected_version
  returning e.version, e.updated_at into saved_version, saved_at;
  if saved_version is null then
    return query select 'conflict'::text, null::integer, null::timestamptz;
    return;
  end if;
  return query select 'ok'::text, saved_version, saved_at;
end;
$$;

create function public.save_contractor_availability(
  p_contractor_id uuid,
  p_expected_version integer,
  p_status text,
  p_note text
)
returns table (status text, version integer, updated_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_version integer;
  saved_at timestamptz;
begin
  if p_status is null or p_status not in ('available', 'limited', 'unavailable') or char_length(coalesce(p_note, '')) > 500 then
    return query select 'invalid'::text, null::integer, null::timestamptz;
    return;
  end if;
  if not public.is_contractor_owner(p_contractor_id) then
    return query select 'forbidden'::text, null::integer, null::timestamptz;
    return;
  end if;
  update public.contractor_availability a
  set status = p_status, note = coalesce(p_note, ''), version = a.version + 1
  where a.contractor_id = p_contractor_id and a.version = p_expected_version
  returning a.version, a.updated_at into saved_version, saved_at;
  if saved_version is null then
    return query select 'conflict'::text, null::integer, null::timestamptz;
    return;
  end if;
  return query select 'ok'::text, saved_version, saved_at;
end;
$$;

create function public.add_contractor_skill(p_contractor_id uuid, p_skill text)
returns table (status text, skill_id uuid, skill text, version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_skill text;
  saved_version integer;
begin
  if p_skill is null or char_length(btrim(p_skill)) not between 2 and 64 then
    return query select 'invalid'::text, null::uuid, null::text, null::integer;
    return;
  end if;
  if not public.is_contractor_owner(p_contractor_id) then
    return query select 'forbidden'::text, null::uuid, null::text, null::integer;
    return;
  end if;
  insert into public.contractor_skills (contractor_id, skill)
  values (p_contractor_id, btrim(p_skill))
  on conflict (contractor_id, skill_key) do nothing
  returning id, contractor_skills.skill, contractor_skills.version into saved_id, saved_skill, saved_version;
  if saved_id is null then
    return query select 'duplicate'::text, null::uuid, null::text, null::integer;
  else
    return query select 'ok'::text, saved_id, saved_skill, saved_version;
  end if;
end;
$$;

create function public.rename_contractor_skill(p_skill_id uuid, p_expected_version integer, p_skill text)
returns table (status text, skill_id uuid, skill text, version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_skill text;
  saved_version integer;
begin
  if p_skill is null or char_length(btrim(p_skill)) not between 2 and 64 then
    return query select 'invalid'::text, p_skill_id, null::text, null::integer;
    return;
  end if;
  if not exists (
    select 1 from public.contractor_skills s
    where s.id = p_skill_id and public.is_contractor_owner(s.contractor_id)
  ) then
    return query select 'forbidden'::text, p_skill_id, null::text, null::integer;
    return;
  end if;
  update public.contractor_skills s set skill = btrim(p_skill), version = s.version + 1
  where s.id = p_skill_id and s.version = p_expected_version
  returning s.skill, s.version into saved_skill, saved_version;
  if saved_version is null then
    return query select 'conflict'::text, p_skill_id, null::text, null::integer;
  else
    return query select 'ok'::text, p_skill_id, saved_skill, saved_version;
  end if;
exception when unique_violation then
  return query select 'duplicate'::text, p_skill_id, null::text, null::integer;
end;
$$;

create function public.delete_contractor_skill(p_skill_id uuid, p_expected_version integer)
returns table (status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.contractor_skills s
    where s.id = p_skill_id and public.is_contractor_owner(s.contractor_id)
  ) then
    return query select 'forbidden'::text;
    return;
  end if;
  delete from public.contractor_skills s where s.id = p_skill_id and s.version = p_expected_version;
  if found then return query select 'ok'::text;
  else return query select 'conflict'::text;
  end if;
end;
$$;

create function public.create_portfolio_project(
  p_contractor_id uuid,
  p_title text,
  p_category text,
  p_description text,
  p_status text,
  p_completed_on date,
  p_location text,
  p_image_path text,
  p_project_value numeric
)
returns table (status text, project_id uuid, version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_version integer;
begin
  if p_title is null or char_length(btrim(p_title)) not between 2 and 140
     or p_category is null or char_length(btrim(p_category)) not between 2 and 80
     or char_length(coalesce(p_description, '')) > 2000
     or char_length(coalesce(p_location, '')) > 160
     or char_length(coalesce(p_image_path, '')) > 500
     or p_status is null or p_status not in ('completed', 'in_progress', 'planned')
     or (p_project_value is not null and p_project_value < 0) then
    return query select 'invalid'::text, null::uuid, null::integer;
    return;
  end if;
  if not public.is_contractor_owner(p_contractor_id) then
    return query select 'forbidden'::text, null::uuid, null::integer;
    return;
  end if;
  insert into public.portfolio_projects (
    contractor_id, title, category, description, status, completed_on, location, image_path, project_value
  ) values (
    p_contractor_id, btrim(p_title), btrim(p_category), coalesce(p_description, ''), p_status, p_completed_on,
    coalesce(p_location, ''), nullif(p_image_path, ''), p_project_value
  ) returning id, portfolio_projects.version into saved_id, saved_version;
  return query select 'ok'::text, saved_id, saved_version;
exception when unique_violation then
  return query select 'duplicate'::text, null::uuid, null::integer;
end;
$$;

create function public.update_portfolio_project(
  p_project_id uuid,
  p_expected_version integer,
  p_title text,
  p_category text,
  p_description text,
  p_status text,
  p_completed_on date,
  p_location text,
  p_image_path text,
  p_project_value numeric
)
returns table (status text, project_id uuid, version integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_id uuid;
  saved_version integer;
begin
  if p_title is null or char_length(btrim(p_title)) not between 2 and 140
     or p_category is null or char_length(btrim(p_category)) not between 2 and 80
     or char_length(coalesce(p_description, '')) > 2000
     or char_length(coalesce(p_location, '')) > 160
     or char_length(coalesce(p_image_path, '')) > 500
     or p_status is null or p_status not in ('completed', 'in_progress', 'planned')
     or (p_project_value is not null and p_project_value < 0) then
    return query select 'invalid'::text, p_project_id, null::integer;
    return;
  end if;
  if not exists (
    select 1 from public.portfolio_projects p
    where p.id = p_project_id and public.is_contractor_owner(p.contractor_id)
  ) then
    return query select 'forbidden'::text, p_project_id, null::integer;
    return;
  end if;
  update public.portfolio_projects p
  set title = btrim(p_title), category = btrim(p_category), description = coalesce(p_description, ''),
      status = p_status, completed_on = p_completed_on, location = coalesce(p_location, ''),
      image_path = nullif(p_image_path, ''), project_value = p_project_value, version = p.version + 1
  where p.id = p_project_id and p.version = p_expected_version
  returning p.id, p.version into saved_id, saved_version;
  if saved_version is null then
    return query select 'conflict'::text, p_project_id, null::integer;
  else
    return query select 'ok'::text, saved_id, saved_version;
  end if;
exception when unique_violation then
  return query select 'duplicate'::text, p_project_id, null::integer;
end;
$$;

create function public.delete_portfolio_project(p_project_id uuid, p_expected_version integer)
returns table (status text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.portfolio_projects p
    where p.id = p_project_id and public.is_contractor_owner(p.contractor_id)
  ) then
    return query select 'forbidden'::text;
    return;
  end if;
  delete from public.portfolio_projects p where p.id = p_project_id and p.version = p_expected_version;
  if found then return query select 'ok'::text;
  else return query select 'conflict'::text;
  end if;
end;
$$;

revoke all on function public.save_contractor_basics(uuid, integer, integer, integer, integer, integer, boolean, boolean, boolean, boolean, boolean, text, text, text, text, text),
  public.save_contractor_experience(uuid, integer, smallint, text),
  public.save_contractor_availability(uuid, integer, text, text),
  public.add_contractor_skill(uuid, text),
  public.rename_contractor_skill(uuid, integer, text),
  public.delete_contractor_skill(uuid, integer),
  public.create_portfolio_project(uuid, text, text, text, text, date, text, text, numeric),
  public.update_portfolio_project(uuid, integer, text, text, text, text, date, text, text, numeric),
  public.delete_portfolio_project(uuid, integer) from public, anon, authenticated;
grant execute on function public.save_contractor_basics(uuid, integer, integer, integer, integer, integer, boolean, boolean, boolean, boolean, boolean, text, text, text, text, text),
  public.save_contractor_experience(uuid, integer, smallint, text),
  public.save_contractor_availability(uuid, integer, text, text),
  public.add_contractor_skill(uuid, text),
  public.rename_contractor_skill(uuid, integer, text),
  public.delete_contractor_skill(uuid, integer),
  public.create_portfolio_project(uuid, text, text, text, text, date, text, text, numeric),
  public.update_portfolio_project(uuid, integer, text, text, text, text, date, text, text, numeric),
  public.delete_portfolio_project(uuid, integer) to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portfolio-images', 'portfolio-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "Public can read portfolio images" on storage.objects
for select to anon, authenticated using (bucket_id = 'portfolio-images');
create policy "Owners upload portfolio images" on storage.objects
for insert to authenticated with check (
  bucket_id = 'portfolio-images'
  and public.owns_contractor_folder((storage.foldername(name))[1])
);
create policy "Owners update portfolio images" on storage.objects
for update to authenticated using (
  bucket_id = 'portfolio-images'
  and public.owns_contractor_folder((storage.foldername(name))[1])
) with check (
  bucket_id = 'portfolio-images'
  and public.owns_contractor_folder((storage.foldername(name))[1])
);
create policy "Owners delete portfolio images" on storage.objects
for delete to authenticated using (
  bucket_id = 'portfolio-images'
  and public.owns_contractor_folder((storage.foldername(name))[1])
);

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contractors') then
      alter publication supabase_realtime add table public.contractors;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contractor_experience') then
      alter publication supabase_realtime add table public.contractor_experience;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contractor_availability') then
      alter publication supabase_realtime add table public.contractor_availability;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'contractor_skills') then
      alter publication supabase_realtime add table public.contractor_skills;
    end if;
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'portfolio_projects') then
      alter publication supabase_realtime add table public.portfolio_projects;
    end if;
  end if;
end;
$$;
