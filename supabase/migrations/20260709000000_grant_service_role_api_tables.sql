grant usage on schema public to service_role;

grant all privileges on
  public.profiles,
  public.entries,
  public.generations,
  public.cards,
  public.review_events,
  public.usage_events
to service_role;

grant usage, select on all sequences in schema public to service_role;
