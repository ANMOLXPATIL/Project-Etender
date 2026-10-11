delete from public.portfolio_projects p
using public.contractors c
where p.contractor_id = c.id
  and lower(btrim(p.title)) = 'abc'
  and lower(btrim(p.category)) = 'construction'
  and lower(btrim(p.description)) = 'did this awesome work in just 24 days'
  and lower(btrim(p.location)) = 'mumbai'
  and p.completed_on = date '2026-10-07'
  and p.project_value = 67000;

delete from auth.users u
using public.contractor_owners co, public.contractors c
where co.owner_id = u.id
  and c.id = co.contractor_id
  and lower(btrim(c.business_name)) in ('neptune', 'neptune india')
  and c.service_location ilike 'pune%';

delete from public.contractors c
where lower(btrim(c.business_name)) in ('neptune', 'neptune india')
  and c.service_location ilike 'pune%';
