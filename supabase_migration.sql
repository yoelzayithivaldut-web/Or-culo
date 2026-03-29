-- Migration for Supabase (PostgreSQL)
-- This schema matches the existing Firestore structure

-- 1. Users table (Profile)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    display_name TEXT,
    address TEXT,
    phone TEXT,
    education_level TEXT,
    main_genre TEXT,
    writing_goal TEXT,
    onboarding_completed BOOLEAN DEFAULT false,
    plan TEXT DEFAULT 'free',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policies for users
DROP POLICY IF EXISTS "Users can only read their own data" ON public.users;
DROP POLICY IF EXISTS "Users can only update their own data" ON public.users;
DROP POLICY IF EXISTS "Users can insert their own data" ON public.users;

CREATE POLICY "Users can only read their own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can only update their own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 2. Books table
CREATE TABLE IF NOT EXISTS public.books (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    author TEXT,
    genre TEXT,
    synopsis TEXT,
    content TEXT,
    status TEXT DEFAULT 'writing',
    language TEXT DEFAULT 'pt-BR',
    cover_url TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for books
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Policies for books
CREATE POLICY "Users can only read their own books" ON public.books
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can only create their own books" ON public.books
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can only update their own books" ON public.books
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can only delete their own books" ON public.books
    FOR DELETE USING (auth.uid() = owner_id);

-- 3. Clients table
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    notes TEXT,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for clients
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Policies for clients
CREATE POLICY "Users can only read their own clients" ON public.clients
    FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can only create their own clients" ON public.clients
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can only update their own clients" ON public.clients
    FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can only delete their own clients" ON public.clients
    FOR DELETE USING (auth.uid() = owner_id);

-- Trigger for updatedAt
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_users BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_books BEFORE UPDATE ON public.books FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_updated_at_clients BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- 4. Auth Trigger (Sync auth.users to public.users)
-- This ensures a profile exists as soon as a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, display_name, onboarding_completed)
    VALUES (
        NEW.id, 
        NEW.email, 
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, 'Escritor'),
        false
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(EXCLUDED.display_name, public.users.display_name);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
