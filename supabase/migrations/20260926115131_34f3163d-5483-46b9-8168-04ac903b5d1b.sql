create type public.app_role as enum ('authority','citizen');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path = public as $$ select exists (select 1 from public.user_roles where user_id=_user_id and role=_role) $$;

create sequence public.report_ref_seq start 101;
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reference_id text not null unique default ('NG-' || lpad(nextval('public.report_ref_seq')::text, 6, '0')),
  category text not null,
  description text not null default '',
  latitude double precision not null,
  longitude double precision not null,
  ward text,
  image_path text,
  severity int not null default 2,
  status text not null default 'reported',
  ai_category text,
  ai_confidence numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant usage on sequence public.report_ref_seq to anon, authenticated;
grant select, insert on public.reports to anon, authenticated;
grant update on public.reports to authenticated;
grant all on public.reports to service_role;
alter table public.reports enable row level security;
create policy "public read" on public.reports for select to anon, authenticated using (true);
create policy "public submit" on public.reports for insert to anon, authenticated with check (status = 'reported');
create policy "authority update" on public.reports for update to authenticated using (public.has_role(auth.uid(),'authority')) with check (public.has_role(auth.uid(),'authority'));

create table public.resolution_records (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  status text not null,
  note text,
  evidence_image_path text,
  updated_by uuid,
  created_at timestamptz not null default now()
);
grant select on public.resolution_records to anon, authenticated;
grant insert on public.resolution_records to authenticated;
grant all on public.resolution_records to service_role;
alter table public.resolution_records enable row level security;
create policy "public read" on public.resolution_records for select to anon, authenticated using (true);
create policy "authority insert" on public.resolution_records for insert to authenticated with check (public.has_role(auth.uid(),'authority') and updated_by = auth.uid());

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role='authority') then
    insert into public.user_roles(user_id, role) values (new.id, 'authority');
  else
    insert into public.user_roles(user_id, role) values (new.id, 'citizen');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create policy "public upload report photos" on storage.objects for insert to anon, authenticated with check (bucket_id = 'report-photos');
create policy "public read report photos" on storage.objects for select to anon, authenticated using (bucket_id = 'report-photos');

insert into public.reports (category, description, latitude, longitude, ward, severity, status, ai_category, ai_confidence, created_at) values
('waterlogging','बारिश के बाद सड़क पर बहुत पानी भर गया है',26.8467,80.9462,'Hazratganj',3,'reported','waterlogging',0.92, now()-interval '2 hours'),
('waterlogging','घुटनों तक पानी, स्कूल बच्चे परेशान',26.8470,80.9466,'Hazratganj',3,'under_review','waterlogging',0.88, now()-interval '5 hours'),
('waterlogging','नाला ओवरफ्लो, पानी भरा',26.8464,80.9459,'Hazratganj',2,'reported','waterlogging',0.81, now()-interval '1 day'),
('waterlogging','Water standing near market since morning',26.8469,80.9460,'Hazratganj',2,'assigned','waterlogging',0.9, now()-interval '8 hours'),
('garbage','कूड़े का ढेर कई दिनों से पड़ा है',26.8720,80.9900,'Gomti Nagar',2,'in_progress','garbage',0.95, now()-interval '2 days'),
('garbage','Garbage dumped beside park gate',26.8723,80.9904,'Gomti Nagar',2,'reported','garbage',0.9, now()-interval '1 day'),
('road_damage','बड़ा गड्ढा, बाइक फिसल रही है',26.8390,80.9230,'Charbagh',3,'reported','road_damage',0.87, now()-interval '3 hours'),
('road_damage','Pothole near station exit',26.8393,80.9234,'Charbagh',3,'under_review','road_damage',0.84, now()-interval '20 hours'),
('streetlight','स्ट्रीट लाइट दो हफ्ते से बंद',26.8600,80.9150,'Aliganj',1,'resolved','streetlight',0.93, now()-interval '6 days'),
('open_drain','खुला नाला, बच्चों के लिए खतरा',26.8550,80.9700,'Indira Nagar',3,'assigned','open_drain',0.89, now()-interval '4 days'),
('drainage','सीवर का पानी सड़क पर',26.8250,80.9500,'Alambagh',2,'resolved','drainage',0.86, now()-interval '9 days'),
('garbage','कूड़ा गाड़ी नहीं आई',26.8726,80.9898,'Gomti Nagar',1,'reported','garbage',0.78, now()-interval '6 hours');