create table public.authority_ids (
  id uuid primary key default gen_random_uuid(),
  govt_id text not null unique,
  full_name text,
  used boolean not null default false,
  used_by uuid,
  created_at timestamptz not null default now()
);
grant all on public.authority_ids to service_role;
alter table public.authority_ids enable row level security;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare gid text;
begin
  gid := new.raw_user_meta_data->>'govt_id';
  if gid is not null and exists (select 1 from public.authority_ids where govt_id = gid and not used) then
    insert into public.user_roles(user_id, role) values (new.id, 'authority');
    update public.authority_ids set used = true, used_by = new.id where govt_id = gid;
  else
    insert into public.user_roles(user_id, role) values (new.id, 'citizen');
  end if;
  return new;
end
$function$;

insert into public.authority_ids (govt_id, full_name) values ('UP-GOV-2026-001', 'Akash Yadav');