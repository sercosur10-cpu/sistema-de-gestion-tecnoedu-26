import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const DEFAULT_SUPABASE_URL = 'https://epxgjoizmnerdsojzjft.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'sb_publishable_lq2FjFBuICcvKvpR5Mq82w_L8DWVoeF';

const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Si el entorno aún tenía el typo 'epxq...' lo corregimos automáticamente a 'epxg...'
const resolvedUrl =
  !envUrl || envUrl.includes('epxqjoizmnerdsojzjft') || envUrl.includes('tu-proyecto')
    ? DEFAULT_SUPABASE_URL
    : envUrl;

const resolvedKey =
  !envKey || envKey.includes('tu-anon-key-publica') || envKey.includes('PENDIENTE')
    ? DEFAULT_SUPABASE_ANON_KEY
    : envKey;

export const isSupabaseConfigured = Boolean(resolvedUrl && resolvedKey);

export const supabase: SupabaseClient<Database> = createClient<Database>(
  resolvedUrl,
  resolvedKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
