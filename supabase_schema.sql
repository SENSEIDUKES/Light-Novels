-- Copy and paste this script into your Supabase SQL Editor to set up the necessary tables

-- 1. Users table (Profiles)
CREATE TABLE IF NOT EXISTS public.users (
  uid UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  "displayName" TEXT,
  "photoURL" TEXT,
  "premiumTier" TEXT DEFAULT 'mortal',
  role TEXT DEFAULT 'user',
  "imageGenerationCount" INTEGER DEFAULT 0,
  "imageQuotaResetAt" TEXT,
  "qiPoints" INTEGER DEFAULT 0,
  "cultivationRank" TEXT DEFAULT 'Mortal',
  "nextRankQi" INTEGER DEFAULT 100,
  "daoTitle" TEXT,
  "lastQiCultivationAt" TEXT
);

-- 2. Stories table
CREATE TABLE IF NOT EXISTS public.stories (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Chapters table
CREATE TABLE IF NOT EXISTS public.chapters (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  story_id TEXT NOT NULL,
  chapter_number INTEGER NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  payload JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(story_id, chapter_number)
);

-- RLS (Row Level Security)

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" 
ON public.users FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Users can update their own profile" 
ON public.users FOR UPDATE 
USING (auth.uid() = uid);

CREATE POLICY "Users can insert their own profile" 
ON public.users FOR INSERT 
WITH CHECK (auth.uid() = uid);

CREATE POLICY "Users can manage their own stories" 
ON public.stories FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own chapters" 
ON public.chapters FOR ALL 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);
