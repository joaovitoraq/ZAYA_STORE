# SETUP SUPABASE - 5 MINUTOS - V13 SEM TELA BRANCA

## 1. Criar projeto
https://supabase.com > New Project > nome zaya-store

## 2. Criar tabelas - SQL Editor > New Query > cole e RUN:
create table products (id text primary key, name text, sku text, description text, category text, price numeric, promo_price numeric, on_promo boolean, colors jsonb, sizes jsonb, variations jsonb, images jsonb, bestseller boolean, created_at timestamp default now());
create table categories (id text primary key, name text, slug text, image text, order_num int, active boolean, description text);
create table banners (id text primary key, title text, subtitle text, desktop_img text, mobile_img text, order_num int, active boolean, is_main boolean);
alter table products enable row level security; create policy "public all" on products for all using (true) with check (true);
alter table categories enable row level security; create policy "public all" on categories for all using (true) with check (true);
alter table banners enable row level security; create policy "public all" on banners for all using (true) with check (true);

## 3. Pegar chaves
Settings > API > copie Project URL e anon key

## 4. Vercel
Settings > Environment Variables > adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY > Redeploy

## 5. Teste
PC cadastra produto > celular aparece! Se não configurar env vars, funciona com 💾 Local sem tela branca.
