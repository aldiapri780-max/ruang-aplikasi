-- Jalankan seluruh SQL ini di Supabase Dashboard > SQL Editor.
-- Tabel profil: satu profil untuk setiap akun Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  price numeric(14,2) not null default 0 check (price >= 0),
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.products enable row level security;

-- Profil hanya bisa dibaca pemiliknya. Pengguna tidak dapat mengubah role sendiri.
drop policy if exists "Users read own profile" on public.profiles;
create policy "Users read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

-- Produk bisa dilihat oleh pengunjung yang login.
drop policy if exists "Authenticated users read products" on public.products;
create policy "Authenticated users read products" on public.products
  for select to authenticated using (true);

-- Hanya admin yang boleh menambah, mengubah, dan menghapus produk.
drop policy if exists "Admins insert products" on public.products;
create policy "Admins insert products" on public.products
  for insert to authenticated
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins update products" on public.products;
create policy "Admins update products" on public.products
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "Admins delete products" on public.products;
create policy "Admins delete products" on public.products
  for delete to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Buat profil otomatis setiap kali akun baru didaftarkan.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- PENTING: setelah membuat akun pertama, jalankan perintah ini
-- secara manual di SQL Editor untuk menjadikan akun tersebut admin:
-- update public.profiles
-- set role = 'admin'
-- where id = (select id from auth.users where email = 'EMAIL_KAMU');
