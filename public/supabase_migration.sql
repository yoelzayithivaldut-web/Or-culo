-- Create users table (Profile)
create table users (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  display_name text,
  onboarding_completed boolean default false,
  address text,
  phone text,
  education_level text,
  main_genre text,
  writing_goal text,
  plan text default 'free',
  role text default 'user',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for users
alter table users enable row level security;

create policy "Users can only read their own data"
  on users for select
  using ( auth.uid() = id or (select role from users where id = auth.uid()) = 'admin' );

create policy "Users can insert their own data"
  on users for insert
  with check ( auth.uid() = id );

create policy "Users can update their own data"
  on users for update
  using ( auth.uid() = id or (select role from users where id = auth.uid()) = 'admin' );

-- Create books table
create table books (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  title text not null,
  author text,
  genre text,
  synopsis text,
  content text,
  status text default 'writing',
  language text default 'pt-BR',
  cover_url text,
  progress integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for books
alter table books enable row level security;

create policy "Users can view their own books."
  on books for select
  using ( auth.uid() = owner_id or (select role from users where id = auth.uid()) = 'admin' );

create policy "Users can insert their own books."
  on books for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update their own books."
  on books for update
  using ( auth.uid() = owner_id or (select role from users where id = auth.uid()) = 'admin' );

create policy "Users can delete their own books."
  on books for delete
  using ( auth.uid() = owner_id or (select role from users where id = auth.uid()) = 'admin' );

-- Create clients table
create table clients (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text,
  notes text,
  phone text,
  status text default 'active',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for clients
alter table clients enable row level security;

create policy "Users can view their own clients."
  on clients for select
  using ( auth.uid() = owner_id or (select role from users where id = auth.uid()) = 'admin' );

create policy "Users can insert their own clients."
  on clients for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update their own clients."
  on clients for update
  using ( auth.uid() = owner_id or (select role from users where id = auth.uid()) = 'admin' );

create policy "Users can delete their own clients."
  on clients for delete
  using ( auth.uid() = owner_id or (select role from users where id = auth.uid()) = 'admin' );

-- Create a trigger to handle new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
declare
  is_admin boolean;
begin
  is_admin := (new.email = 'word.intelligence@gmail.com' or new.email = 'yoelzayithivaldut@gmail.com');

  insert into public.users (id, email, display_name, onboarding_completed, role, plan)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'Escritor'),
    case when is_admin then true else false end,
    case when is_admin then 'admin' else 'user' end,
    case when is_admin then 'premium' else 'free' end
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.users.display_name),
    role = case when is_admin then 'admin' else public.users.role end,
    plan = case when is_admin then 'premium' else public.users.plan end;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
