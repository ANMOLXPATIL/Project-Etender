delete from public.portfolio_projects p
where lower(btrim(p.title)) = 'abc'
  and lower(btrim(p.category)) = 'construction'
  and lower(btrim(p.location)) = 'mumbai'
  and p.project_value = 67000;
