-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES (extends auth.users)
create table profiles (
  id uuid references auth.users on delete cascade not null primary key,
  email text,
  full_name text,
  avatar_url text,
  bio text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- SONGS
create table songs (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  artist text not null,
  url text not null, -- URL to MP3 (Jamendo or Storage)
  cover_url text,
  genre text,
  duration integer, -- in seconds
  origin text check (origin in ('jamendo', 'local')) default 'jamendo',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- LISTENING HISTORY
create table listening_history (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  song_id uuid references songs(id) on delete set null,
  listened_at timestamp with time zone default timezone('utc'::text, now()) not null,
  duration_listened integer not null, -- How long they actually listened
  completed boolean default false -- If they finished the song
);

-- CONNECTIONS (Vibe Match results or Manual requests)
create table connections (
  id uuid default uuid_generate_v4() primary key,
  user_a uuid references profiles(id) on delete cascade not null,
  user_b uuid references profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'connected', 'blocked')) default 'pending',
  match_score float, -- The calculated vibe match %
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint unique_connection unique (user_a, user_b)
);

-- MESSAGES
create table messages (
  id uuid default uuid_generate_v4() primary key,
  sender_id uuid references profiles(id) on delete cascade not null,
  receiver_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Basic examples)
alter table profiles enable row level security;
alter table songs enable row level security;
alter table listening_history enable row level security;
alter table connections enable row level security;
alter table messages enable row level security;

-- Allow public read of songs
create policy "Public songs are viewable by everyone" on songs for select using (true);

-- Allow users to read their own profile
create policy "Public profiles are viewable by everyone" on profiles for select using (true);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

-- Function to handle new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function on auth.users insert
create trigger on_auth_user_created
  for each row execute procedure public.handle_new_user();

-- USER MUSIC PROFILES (Spotify Data)
create table if not exists public.user_music_profiles (
  user_id uuid references auth.users(id) on delete cascade primary key,
  top_artists jsonb,
  top_genres jsonb,
  genre_vector jsonb,
  is_spotify_linked boolean default false,
  last_updated timestamp with time zone default timezone('utc'::text, now())
);

-- Enable RLS for music profiles
alter table public.user_music_profiles enable row level security;

-- Policies for music profiles
create policy "Users can view their own music profile"
  on public.user_music_profiles for select
  using (auth.uid() = user_id);

create policy "Users can update their own music profile"
  on public.user_music_profiles for update
  using (auth.uid() = user_id);

create policy "Users can insert their own music profile"
  on public.user_music_profiles for insert
  with check (auth.uid() = user_id);

create policy "Users can view other users' music profiles"
  on public.user_music_profiles for select
  using (true);
