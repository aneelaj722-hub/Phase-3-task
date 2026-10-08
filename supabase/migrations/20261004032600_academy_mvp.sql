create table public.staff_profiles (
  user_id uuid primary key references auth.users(id) on delete restrict,
  email text not null unique,
  full_name text not null check (length(trim(full_name)) > 0),
  role text not null check (role in ('administrator', 'teacher', 'finance')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid references public.staff_profiles(user_id) on delete restrict
);

create table public.academy_settings (
  id smallint primary key default 1 check (id = 1),
  academy_name text not null check (length(trim(academy_name)) > 0),
  currency_code char(3) not null,
  time_zone text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.staff_profiles(user_id) on delete restrict
);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  student_number text not null unique check (length(trim(student_number)) > 0),
  full_name text not null check (length(trim(full_name)) > 0),
  email text,
  phone text not null default '',
  enrolled_on date not null,
  status text not null default 'active' check (status in ('active', 'inactive', 'withdrawn')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict
);

create table public.teachers (
  id uuid primary key default gen_random_uuid(),
  teacher_number text not null unique check (length(trim(teacher_number)) > 0),
  profile_user_id uuid unique references public.staff_profiles(user_id) on delete restrict,
  full_name text not null check (length(trim(full_name)) > 0),
  email text,
  phone text not null default '',
  specialization text not null default '',
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict
);

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  course_code text not null unique check (length(trim(course_code)) > 0),
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  credits numeric(8, 2) not null check (credits > 0),
  default_fee_amount numeric(12, 2) check (default_fee_amount is null or default_fee_amount >= 0),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict
);

create table public.course_teachers (
  course_id uuid not null references public.courses(id) on delete restrict,
  teacher_id uuid not null references public.teachers(id) on delete restrict,
  is_active boolean not null default true,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references public.staff_profiles(user_id) on delete restrict,
  primary key (course_id, teacher_id)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  course_id uuid not null references public.courses(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'withdrawn', 'completed')),
  enrolled_on date not null default current_date,
  ended_on date check (ended_on is null or ended_on >= enrolled_on),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict
);

create unique index enrollments_one_active_course_per_student
  on public.enrollments(student_id, course_id) where status = 'active';

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz check (ends_at is null or ends_at > starts_at),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  unique (course_id, starts_at)
);

create table public.attendance_entries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  enrollment_id uuid not null references public.enrollments(id) on delete restrict,
  status text not null check (status in ('present', 'absent', 'late')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  unique (session_id, enrollment_id)
);

create table public.fee_obligations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  enrollment_id uuid references public.enrollments(id) on delete restrict,
  description text not null check (length(trim(description)) > 0),
  amount numeric(12, 2) not null check (amount > 0),
  due_on date,
  status text not null default 'open' check (status in ('open', 'void')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  updated_by uuid not null references public.staff_profiles(user_id) on delete restrict
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  paid_on date not null,
  method text not null check (method in ('cash', 'bank_transfer', 'card', 'other')),
  reference text not null default '',
  note text not null default '',
  status text not null default 'posted' check (status in ('posted', 'reversed')),
  reversed_at timestamptz,
  reversed_by uuid references public.staff_profiles(user_id) on delete restrict,
  reversal_reason text,
  created_at timestamptz not null default now(),
  created_by uuid not null references public.staff_profiles(user_id) on delete restrict,
  check (
    (status = 'posted' and reversed_at is null and reversed_by is null and reversal_reason is null)
    or
    (status = 'reversed' and reversed_at is not null and reversed_by is not null and length(trim(reversal_reason)) > 0)
  )
);

create table public.payment_allocations (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.payments(id) on delete restrict,
  fee_obligation_id uuid not null references public.fee_obligations(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique (payment_id, fee_obligation_id)
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  entity_type text not null check (entity_type in (
    'staff_profiles', 'attendance_sessions', 'attendance_entries',
    'fee_obligations', 'payments', 'payment_allocations'
  )),
  entity_id uuid not null,
  action text not null check (action in ('created', 'updated', 'reversed')),
  actor_user_id uuid references public.staff_profiles(user_id) on delete set null,
  occurred_at timestamptz not null default now(),
  change_summary jsonb not null default '{}'::jsonb
);

create index students_status_name_idx on public.students(status, full_name);
create index teachers_status_name_idx on public.teachers(status, full_name);
create index courses_status_name_idx on public.courses(status, name);
create unique index students_normalized_number_uidx on public.students(lower(trim(student_number)));
create unique index teachers_normalized_number_uidx on public.teachers(lower(trim(teacher_number)));
create unique index courses_normalized_code_uidx on public.courses(lower(trim(course_code)));
create unique index staff_profiles_normalized_email_uidx on public.staff_profiles(lower(trim(email)));
create index course_teachers_teacher_active_idx on public.course_teachers(teacher_id, is_active);
create index enrollments_course_status_idx on public.enrollments(course_id, status);
create index enrollments_student_status_idx on public.enrollments(student_id, status);
create index attendance_sessions_course_starts_idx on public.attendance_sessions(course_id, starts_at desc);
create index attendance_entries_enrollment_session_idx on public.attendance_entries(enrollment_id, session_id);
create index fee_obligations_student_status_due_idx on public.fee_obligations(student_id, status, due_on);
create index fee_obligations_enrollment_idx on public.fee_obligations(enrollment_id);
create index payments_student_paid_status_idx on public.payments(student_id, paid_on desc, status);
create index payment_allocations_obligation_idx on public.payment_allocations(fee_obligation_id);
create index audit_events_entity_idx on public.audit_events(entity_type, entity_id, occurred_at desc);

create or replace function public.current_staff_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select sp.role
  from public.staff_profiles sp
  where sp.user_id = (select auth.uid())
    and sp.is_active
$$;

create or replace function public.is_assigned_teacher(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.course_teachers ct
    join public.teachers t on t.id = ct.teacher_id
    where ct.course_id = p_course_id
      and ct.is_active
      and t.status = 'active'
      and t.profile_user_id = (select auth.uid())
  ) and public.current_staff_role() = 'teacher'
$$;

revoke all on function public.current_staff_role() from public, anon;
revoke all on function public.is_assigned_teacher(uuid) from public, anon;
grant execute on function public.current_staff_role() to authenticated;
grant execute on function public.is_assigned_teacher(uuid) to authenticated;

create or replace function public.set_updated_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := (select auth.uid());
  return new;
end
$$;

create trigger students_updated_metadata before update on public.students
  for each row execute function public.set_updated_metadata();
create trigger teachers_updated_metadata before update on public.teachers
  for each row execute function public.set_updated_metadata();
create trigger courses_updated_metadata before update on public.courses
  for each row execute function public.set_updated_metadata();
create trigger enrollments_updated_metadata before update on public.enrollments
  for each row execute function public.set_updated_metadata();
create trigger attendance_sessions_updated_metadata before update on public.attendance_sessions
  for each row execute function public.set_updated_metadata();
create trigger attendance_entries_updated_metadata before update on public.attendance_entries
  for each row execute function public.set_updated_metadata();
create trigger fee_obligations_updated_metadata before update on public.fee_obligations
  for each row execute function public.set_updated_metadata();

create or replace function public.set_created_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'An authenticated staff actor is required.';
  end if;
  new.created_by := (select auth.uid());
  new.updated_by := (select auth.uid());
  return new;
end
$$;

create trigger students_created_metadata before insert on public.students
  for each row execute function public.set_created_metadata();
create trigger teachers_created_metadata before insert on public.teachers
  for each row execute function public.set_created_metadata();
create trigger courses_created_metadata before insert on public.courses
  for each row execute function public.set_created_metadata();
create trigger enrollments_created_metadata before insert on public.enrollments
  for each row execute function public.set_created_metadata();
create trigger attendance_sessions_created_metadata before insert on public.attendance_sessions
  for each row execute function public.set_created_metadata();
create trigger attendance_entries_created_metadata before insert on public.attendance_entries
  for each row execute function public.set_created_metadata();
create trigger fee_obligations_created_metadata before insert on public.fee_obligations
  for each row execute function public.set_created_metadata();

create or replace function public.prevent_paid_obligation_changes()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.amount is distinct from old.amount and exists (
    select 1
    from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    where pa.fee_obligation_id = old.id and p.status = 'posted'
  ) then
    raise exception 'An obligation with posted payments cannot have its amount changed.';
  end if;
  if new.status = 'void' and exists (
    select 1 from public.payment_allocations pa
    where pa.fee_obligation_id = old.id
  ) then
    raise exception 'An obligation with payment history cannot be voided.';
  end if;
  return new;
end
$$;

create trigger fee_obligations_protect_paid before update on public.fee_obligations
  for each row execute function public.prevent_paid_obligation_changes();

create or replace function public.validate_fee_obligation_enrollment()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.enrollment_id is not null and not exists (
    select 1
    from public.enrollments e
    where e.id = new.enrollment_id and e.student_id = new.student_id
  ) then
    raise exception 'The enrollment must belong to the selected student.';
  end if;
  return new;
end
$$;

create trigger fee_obligations_validate_enrollment
  before insert or update of enrollment_id, student_id on public.fee_obligations
  for each row execute function public.validate_fee_obligation_enrollment();

create or replace function public.audit_sensitive_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new jsonb := to_jsonb(new);
  v_old jsonb;
  v_entity_id uuid;
  v_action text;
  v_changed_fields text[];
begin
  if tg_op = 'UPDATE' then
    v_old := to_jsonb(old);
    v_action := case
      when tg_table_name = 'payments' and v_new->>'status' = 'reversed' then 'reversed'
      else 'updated'
    end;
    select array_agg(key order by key)
      into v_changed_fields
      from jsonb_object_keys(v_new) as fields(key)
      where v_new->key is distinct from v_old->key
        and key not in ('updated_at', 'updated_by');
  else
    v_action := 'created';
    v_changed_fields := array[]::text[];
  end if;
  v_entity_id := coalesce(
    nullif(v_new->>'id', '')::uuid,
    nullif(v_new->>'user_id', '')::uuid
  );

  insert into public.audit_events(entity_type, entity_id, action, actor_user_id, change_summary)
  values (
    tg_table_name,
    v_entity_id,
    v_action,
    coalesce((select auth.uid()), nullif(v_new->>'updated_by', '')::uuid, nullif(v_new->>'created_by', '')::uuid),
    jsonb_build_object('changed_fields', to_jsonb(coalesce(v_changed_fields, array[]::text[])))
  );
  return new;
end
$$;

create trigger attendance_sessions_audit after insert or update on public.attendance_sessions
  for each row execute function public.audit_sensitive_change();
create trigger staff_profiles_audit after insert or update on public.staff_profiles
  for each row execute function public.audit_sensitive_change();
create trigger attendance_entries_audit after insert or update on public.attendance_entries
  for each row execute function public.audit_sensitive_change();
create trigger fee_obligations_audit after insert or update on public.fee_obligations
  for each row execute function public.audit_sensitive_change();
create trigger payments_audit after insert or update on public.payments
  for each row execute function public.audit_sensitive_change();
create trigger payment_allocations_audit after insert or update on public.payment_allocations
  for each row execute function public.audit_sensitive_change();

create or replace function public.save_attendance_session(
  p_course_id uuid,
  p_session_date date,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text := public.current_staff_role();
  v_session_id uuid;
  v_start timestamptz := p_session_date::timestamp at time zone 'UTC';
  v_roster_count integer;
  v_input_count integer;
  v_raw_input_count integer;
begin
  if v_user_id is null or v_role not in ('administrator', 'teacher') then
    raise exception 'Only an active administrator or teacher can record attendance.';
  end if;
  if v_role = 'teacher' and not public.is_assigned_teacher(p_course_id) then
    raise exception 'This teacher is not assigned to the selected course.';
  end if;
  if jsonb_typeof(p_entries) <> 'array' then
    raise exception 'Attendance entries must be an array.';
  end if;

  select count(*) into v_roster_count
  from public.enrollments e
  where e.course_id = p_course_id and e.status = 'active';

  select count(*), count(distinct x.student_id)
  into v_raw_input_count, v_input_count
  from jsonb_to_recordset(p_entries) as x(student_id uuid, status text);

  if v_roster_count = 0 or v_input_count <> v_roster_count or v_raw_input_count <> v_input_count then
    raise exception 'Mark every active enrolled student exactly once before saving attendance.';
  end if;
  if exists (
    select 1
    from jsonb_to_recordset(p_entries) as x(student_id uuid, status text)
    left join public.enrollments e
      on e.student_id = x.student_id and e.course_id = p_course_id and e.status = 'active'
    where e.id is null or x.status is null or x.status not in ('present', 'absent', 'late')
  ) then
    raise exception 'Attendance includes an invalid student or status.';
  end if;

  insert into public.attendance_sessions(course_id, starts_at, created_by, updated_by)
  values (p_course_id, v_start, v_user_id, v_user_id)
  on conflict (course_id, starts_at)
  do update set updated_at = now(), updated_by = v_user_id
  returning id into v_session_id;

  insert into public.attendance_entries(session_id, enrollment_id, status, created_by, updated_by)
  select v_session_id, e.id, x.status, v_user_id, v_user_id
  from jsonb_to_recordset(p_entries) as x(student_id uuid, status text)
  join public.enrollments e
    on e.student_id = x.student_id and e.course_id = p_course_id and e.status = 'active'
  on conflict (session_id, enrollment_id)
  do update set status = excluded.status, updated_at = now(), updated_by = v_user_id;

  return v_session_id;
end
$$;

create or replace function public.record_payment(
  p_student_id uuid,
  p_obligation_id uuid,
  p_amount numeric,
  p_paid_on date,
  p_method text,
  p_reference text default '',
  p_note text default ''
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_role text := public.current_staff_role();
  v_payment_id uuid;
  v_remaining numeric(12, 2) := p_amount;
  v_obligation record;
  v_paid numeric(12, 2);
  v_allocation numeric(12, 2);
begin
  if v_user_id is null or v_role not in ('administrator', 'finance') then
    raise exception 'Only an active administrator or finance staff member can record payments.';
  end if;
  if p_amount is null or p_amount <= 0 or p_amount <> round(p_amount, 2) then
    raise exception 'Payment amount must be greater than zero.';
  end if;
  if p_method not in ('cash', 'bank_transfer', 'card', 'other') then
    raise exception 'Select a valid payment method.';
  end if;

  insert into public.payments(student_id, amount, paid_on, method, reference, note, created_by)
  values (p_student_id, p_amount, p_paid_on, p_method, coalesce(nullif(trim(p_reference), ''), 'Manual entry'), coalesce(p_note, ''), v_user_id)
  returning id into v_payment_id;

  for v_obligation in
    select fo.id, fo.amount
    from public.fee_obligations fo
    where fo.student_id = p_student_id
      and fo.status = 'open'
      and (p_obligation_id is null or fo.id = p_obligation_id)
    order by fo.due_on nulls last, fo.created_at, fo.id
    for update
  loop
    select coalesce(sum(pa.amount), 0)::numeric(12, 2)
    into v_paid
    from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    where pa.fee_obligation_id = v_obligation.id and p.status = 'posted';

    v_allocation := least(v_remaining, greatest(v_obligation.amount - v_paid, 0));
    if v_allocation > 0 then
      insert into public.payment_allocations(payment_id, fee_obligation_id, amount)
      values (v_payment_id, v_obligation.id, v_allocation);
      v_remaining := v_remaining - v_allocation;
    end if;
    exit when v_remaining = 0;
  end loop;

  if v_remaining > 0 then
    raise exception 'Payment exceeds the selected student obligation balance.';
  end if;
  return v_payment_id;
end
$$;

create or replace function public.save_teacher(
  p_teacher_id uuid,
  p_teacher_number text,
  p_full_name text,
  p_email text,
  p_phone text,
  p_specialization text,
  p_status text,
  p_course_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_teacher_id uuid;
begin
  if v_user_id is null or public.current_staff_role() <> 'administrator' then
    raise exception 'Only an active administrator can manage teacher records.';
  end if;
  if p_teacher_number is null or length(trim(p_teacher_number)) = 0
    or p_full_name is null or length(trim(p_full_name)) = 0 then
    raise exception 'Teacher identifier and full name are required.';
  end if;
  if p_status is null or p_status not in ('active', 'inactive') then
    raise exception 'Select a valid teacher status.';
  end if;
  if exists (
    select 1
    from unnest(coalesce(p_course_ids, array[]::uuid[])) as requested(course_id)
    left join public.courses c on c.id = requested.course_id
    where c.id is null
  ) then
    raise exception 'One or more assigned courses could not be found.';
  end if;

  if p_teacher_id is null then
    insert into public.teachers(
      teacher_number, profile_user_id, full_name, email, phone, specialization, status, created_by, updated_by
    )
    values (
      trim(p_teacher_number),
      (select sp.user_id from public.staff_profiles sp
       where lower(sp.email) = lower(nullif(trim(p_email), ''))
         and sp.role = 'teacher' and sp.is_active),
      trim(p_full_name), nullif(trim(p_email), ''),
      coalesce(p_phone, ''), coalesce(p_specialization, ''), p_status, v_user_id, v_user_id
    )
    returning id into v_teacher_id;
  else
    update public.teachers
    set teacher_number = trim(p_teacher_number),
    profile_user_id = (
      select sp.user_id from public.staff_profiles sp
      where lower(sp.email) = lower(nullif(trim(p_email), ''))
        and sp.role = 'teacher' and sp.is_active
    ),
        full_name = trim(p_full_name),
        email = nullif(trim(p_email), ''),
        phone = coalesce(p_phone, ''),
        specialization = coalesce(p_specialization, ''),
        status = p_status
    where id = p_teacher_id
    returning id into v_teacher_id;
    if v_teacher_id is null then
      raise exception 'The teacher record could not be found.';
    end if;
  end if;

  update public.course_teachers
  set is_active = false
  where teacher_id = v_teacher_id
    and not (course_id = any(coalesce(p_course_ids, array[]::uuid[])));

  insert into public.course_teachers(course_id, teacher_id, is_active, assigned_at, assigned_by)
  select requested.course_id, v_teacher_id, true, now(), v_user_id
  from (
    select distinct unnest(coalesce(p_course_ids, array[]::uuid[])) as course_id
  ) as requested
  on conflict (course_id, teacher_id)
  do update set is_active = true, assigned_at = now(), assigned_by = v_user_id;

  return v_teacher_id;
end
$$;

create or replace function public.save_course(
  p_course_id uuid,
  p_course_code text,
  p_name text,
  p_description text,
  p_credits numeric,
  p_status text,
  p_teacher_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := (select auth.uid());
  v_course_id uuid;
begin
  if v_user_id is null or public.current_staff_role() <> 'administrator' then
    raise exception 'Only an active administrator can manage courses.';
  end if;
  if p_course_code is null or length(trim(p_course_code)) = 0
    or p_name is null or length(trim(p_name)) = 0
    or p_credits is null or p_credits <= 0 then
    raise exception 'Course code, title, and positive credits are required.';
  end if;
  if p_status is null or p_status not in ('active', 'archived') then
    raise exception 'Select a valid course status.';
  end if;
  if exists (
    select 1
    from (
      select distinct unnest(coalesce(p_teacher_ids, array[]::uuid[])) as teacher_id
    ) as requested
    left join public.teachers t on t.id = requested.teacher_id
    where t.id is null
  ) then
    raise exception 'One or more assigned teachers could not be found.';
  end if;

  if p_course_id is null then
    insert into public.courses(
      course_code, name, description, credits, status, created_by, updated_by
    )
    values (
      trim(p_course_code), trim(p_name), coalesce(p_description, ''),
      p_credits, p_status, v_user_id, v_user_id
    )
    returning id into v_course_id;
  else
    update public.courses
    set course_code = trim(p_course_code),
        name = trim(p_name),
        description = coalesce(p_description, ''),
        credits = p_credits,
        status = p_status
    where id = p_course_id
    returning id into v_course_id;
    if v_course_id is null then
      raise exception 'The course record could not be found.';
    end if;
  end if;

  update public.course_teachers
  set is_active = false
  where course_id = v_course_id
    and not (teacher_id = any(coalesce(p_teacher_ids, array[]::uuid[])));

  insert into public.course_teachers(course_id, teacher_id, is_active, assigned_at, assigned_by)
  select v_course_id, requested.teacher_id, true, now(), v_user_id
  from (
    select distinct unnest(coalesce(p_teacher_ids, array[]::uuid[])) as teacher_id
  ) as requested
  on conflict (course_id, teacher_id)
  do update set is_active = true, assigned_at = now(), assigned_by = v_user_id;

  return v_course_id;
end
$$;

create or replace function public.manage_staff_profile(
  p_actor_user_id uuid,
  p_action text,
  p_user_id uuid,
  p_email text default null,
  p_full_name text default null,
  p_role text default null,
  p_is_active boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target public.staff_profiles%rowtype;
  v_active_admins integer;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'This operation must be performed by the trusted staff function.';
  end if;
  if not exists (
    select 1 from public.staff_profiles
    where user_id = p_actor_user_id and role = 'administrator' and is_active
  ) then
    raise exception 'Only an active administrator can manage staff profiles.';
  end if;
  perform set_config('request.jwt.claim.sub', p_actor_user_id::text, true);

  if p_action = 'invite' then
    if p_user_id is null or p_email is null or p_full_name is null
      or p_role is null or p_role not in ('administrator', 'teacher', 'finance') then
      raise exception 'Valid invite details are required.';
    end if;
    insert into public.staff_profiles(
      user_id, email, full_name, role, is_active, created_by, updated_by
    )
    values (
      p_user_id, lower(trim(p_email)), trim(p_full_name), p_role, true,
      p_actor_user_id, p_actor_user_id
    );
    if p_role = 'teacher' then
      update public.teachers
      set profile_user_id = p_user_id
      where lower(email) = lower(trim(p_email)) and profile_user_id is null;
    end if;
    return p_user_id;
  end if;

  select * into v_target
  from public.staff_profiles
  where user_id = p_user_id
  for update;
  if not found then
    raise exception 'The staff profile could not be found.';
  end if;

  if p_action = 'update' then
    if p_full_name is null or length(trim(p_full_name)) = 0
      or p_role is null or p_role not in ('administrator', 'teacher', 'finance') then
      raise exception 'A full name and valid staff role are required.';
    end if;
    if v_target.role = 'administrator' and v_target.is_active
      and (p_role <> 'administrator' or p_is_active = false) then
      perform 1 from public.staff_profiles
      where role = 'administrator' and is_active
      for update;
      select count(*) into v_active_admins
      from public.staff_profiles
      where role = 'administrator' and is_active and user_id <> p_user_id;
      if v_active_admins = 0 then
        raise exception 'At least one active administrator must remain.';
      end if;
    end if;
    update public.staff_profiles
    set full_name = trim(p_full_name),
        role = p_role,
        updated_by = p_actor_user_id,
        updated_at = now()
    where user_id = p_user_id;
    if p_role = 'teacher' then
      update public.teachers
      set profile_user_id = p_user_id
      where lower(email) = lower(v_target.email) and profile_user_id is null;
    end if;
    return p_user_id;
  end if;

  if p_action = 'set-status' then
    if p_is_active is null then
      raise exception 'A valid staff status is required.';
    end if;
    if p_user_id = p_actor_user_id and not p_is_active then
      raise exception 'You cannot deactivate your own active profile.';
    end if;
    if v_target.role = 'administrator' and v_target.is_active and not p_is_active then
      perform 1 from public.staff_profiles
      where role = 'administrator' and is_active
      for update;
      select count(*) into v_active_admins
      from public.staff_profiles
      where role = 'administrator' and is_active and user_id <> p_user_id;
      if v_active_admins = 0 then
        raise exception 'At least one active administrator must remain.';
      end if;
    end if;
    update public.staff_profiles
    set is_active = p_is_active,
        updated_by = p_actor_user_id,
        updated_at = now()
    where user_id = p_user_id;
    return p_user_id;
  end if;

  raise exception 'Unsupported staff profile operation.';
end
$$;

revoke all on function public.save_attendance_session(uuid, date, jsonb) from public, anon;
revoke all on function public.record_payment(uuid, uuid, numeric, date, text, text, text) from public, anon;
revoke all on function public.save_teacher(uuid, text, text, text, text, text, text, uuid[]) from public, anon;
revoke all on function public.save_course(uuid, text, text, text, numeric, text, uuid[]) from public, anon;
revoke all on function public.manage_staff_profile(uuid, text, uuid, text, text, text, boolean) from public, anon, authenticated;
grant execute on function public.save_attendance_session(uuid, date, jsonb) to authenticated;
grant execute on function public.record_payment(uuid, uuid, numeric, date, text, text, text) to authenticated;
grant execute on function public.save_teacher(uuid, text, text, text, text, text, text, uuid[]) to authenticated;
grant execute on function public.save_course(uuid, text, text, text, numeric, text, uuid[]) to authenticated;
grant execute on function public.manage_staff_profile(uuid, text, uuid, text, text, text, boolean) to service_role;

alter table public.staff_profiles enable row level security;
alter table public.academy_settings enable row level security;
alter table public.students enable row level security;
alter table public.teachers enable row level security;
alter table public.courses enable row level security;
alter table public.course_teachers enable row level security;
alter table public.enrollments enable row level security;
alter table public.attendance_sessions enable row level security;
alter table public.attendance_entries enable row level security;
alter table public.fee_obligations enable row level security;
alter table public.payments enable row level security;
alter table public.payment_allocations enable row level security;
alter table public.audit_events enable row level security;

create policy staff_profiles_read_self_or_admin on public.staff_profiles
  for select to authenticated
  using (
    (user_id = (select auth.uid()) and is_active)
    or (select public.current_staff_role()) = 'administrator'
  );
create policy academy_settings_admin_all on public.academy_settings
  for all to authenticated
  using ((select public.current_staff_role()) = 'administrator')
  with check ((select public.current_staff_role()) = 'administrator');

create policy students_read_authorized on public.students
  for select to authenticated
  using (
    (select public.current_staff_role()) in ('administrator', 'finance')
    or exists (
      select 1 from public.enrollments e
      where e.student_id = students.id and e.status = 'active'
        and (select public.is_assigned_teacher(e.course_id))
    )
  );
create policy students_insert_admin_finance on public.students
  for insert to authenticated
  with check ((select public.current_staff_role()) in ('administrator', 'finance'));
create policy students_update_admin_finance on public.students
  for update to authenticated
  using ((select public.current_staff_role()) in ('administrator', 'finance'))
  with check ((select public.current_staff_role()) in ('administrator', 'finance'));

create policy teachers_read_admin_or_self on public.teachers
  for select to authenticated
  using (
    (select public.current_staff_role()) = 'administrator'
    or (
      profile_user_id = (select auth.uid())
      and (select public.current_staff_role()) = 'teacher'
    )
    or exists (
      select 1 from public.course_teachers ct
      where ct.teacher_id = teachers.id and ct.is_active
        and (select public.is_assigned_teacher(ct.course_id))
    )
  );
create policy teachers_admin_manage on public.teachers
  for all to authenticated
  using ((select public.current_staff_role()) = 'administrator')
  with check ((select public.current_staff_role()) = 'administrator');

create policy courses_read_by_role on public.courses
  for select to authenticated
  using (
    (select public.current_staff_role()) in ('administrator', 'finance')
    or (select public.is_assigned_teacher(courses.id))
  );
create policy courses_admin_manage on public.courses
  for all to authenticated
  using ((select public.current_staff_role()) = 'administrator')
  with check ((select public.current_staff_role()) = 'administrator');

create policy course_teachers_read_related on public.course_teachers
  for select to authenticated
  using (
    (select public.current_staff_role()) in ('administrator', 'finance')
    or (select public.is_assigned_teacher(course_teachers.course_id))
  );
create policy course_teachers_admin_manage on public.course_teachers
  for all to authenticated
  using ((select public.current_staff_role()) = 'administrator')
  with check ((select public.current_staff_role()) = 'administrator');

create policy enrollments_read_by_role on public.enrollments
  for select to authenticated
  using (
    (select public.current_staff_role()) in ('administrator', 'finance')
    or (select public.is_assigned_teacher(enrollments.course_id))
  );
create policy enrollments_admin_manage on public.enrollments
  for all to authenticated
  using ((select public.current_staff_role()) = 'administrator')
  with check ((select public.current_staff_role()) = 'administrator');

create policy attendance_sessions_read_assigned on public.attendance_sessions
  for select to authenticated
  using (
    (select public.current_staff_role()) = 'administrator'
    or (select public.is_assigned_teacher(attendance_sessions.course_id))
  );
create policy attendance_entries_read_assigned on public.attendance_entries
  for select to authenticated
  using (
    (select public.current_staff_role()) = 'administrator'
    or exists (
      select 1
      from public.attendance_sessions s
      join public.enrollments e on e.id = attendance_entries.enrollment_id
      where s.id = attendance_entries.session_id
        and s.course_id = e.course_id
        and (select public.is_assigned_teacher(s.course_id))
    )
  );

create policy fee_obligations_read_admin_finance on public.fee_obligations
  for select to authenticated
  using ((select public.current_staff_role()) in ('administrator', 'finance'));
create policy fee_obligations_insert_admin_finance on public.fee_obligations
  for insert to authenticated
  with check ((select public.current_staff_role()) in ('administrator', 'finance'));

create policy payments_read_admin_finance on public.payments
  for select to authenticated
  using ((select public.current_staff_role()) in ('administrator', 'finance'));
create policy allocations_read_admin_finance on public.payment_allocations
  for select to authenticated
  using ((select public.current_staff_role()) in ('administrator', 'finance'));
create policy audit_events_read_admin on public.audit_events
  for select to authenticated
  using ((select public.current_staff_role()) = 'administrator');

revoke all on public.staff_profiles, public.academy_settings, public.students, public.teachers,
  public.courses, public.course_teachers, public.enrollments, public.attendance_sessions,
  public.attendance_entries, public.fee_obligations, public.payments, public.payment_allocations,
  public.audit_events from anon, authenticated;

grant select on public.staff_profiles, public.students, public.teachers, public.courses,
  public.course_teachers, public.enrollments, public.attendance_sessions, public.attendance_entries,
  public.fee_obligations, public.payments, public.payment_allocations, public.audit_events to authenticated;
grant select, insert, update on public.academy_settings to authenticated;
grant insert, update on public.students to authenticated;
grant insert, update on public.teachers, public.courses, public.course_teachers, public.enrollments to authenticated;
grant insert, update on public.fee_obligations to authenticated;
