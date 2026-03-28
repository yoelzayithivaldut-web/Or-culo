-- Create profiles table
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up Row Level Security (RLS) for profiles
alter table profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Create books table
create table books (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  title text not null,
  content text,
  status text default 'draft',
  progress integer default 0,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for books
alter table books enable row level security;

create policy "Users can view their own books."
  on books for select
  using ( auth.uid() = owner_id );

create policy "Users can insert their own books."
  on books for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update their own books."
  on books for update
  using ( auth.uid() = owner_id );

create policy "Users can delete their own books."
  on books for delete
  using ( auth.uid() = owner_id );

-- Create clients table
create table clients (
  id uuid default gen_random_uuid() primary key,
  owner_id uuid references auth.users on delete cascade not null,
  name text not null,
  email text,
  phone text,
  status text default 'active',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Set up RLS for clients
alter table clients enable row level security;

create policy "Users can view their own clients."
  on clients for select
  using ( auth.uid() = owner_id );

create policy "Users can insert their own clients."
  on clients for insert
  with check ( auth.uid() = owner_id );

create policy "Users can update their own clients."
  on clients for update
  using ( auth.uid() = owner_id );

create policy "Users can delete their own clients."
  on clients for delete
  using ( auth.uid() = owner_id );

-- Create a trigger to handle new user profiles
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url)
  values (new.id, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
