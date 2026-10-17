/**
 * REALITY → ACTION AI – Authentication Service
 *
 * Wraps Supabase Auth calls into a clean API.
 * Components should use the AuthContext instead of calling these directly.
 */

import type { AuthError, Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// ── Types ────────────────────────────────────────────────────────────────

export interface AuthResult {
  user: User | null;
  session: Session | null;
  error: AuthError | null;
}

// ── Auth operations ──────────────────────────────────────────────────────

export async function signIn(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signUp(email: string, password: string): Promise<AuthResult> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return {
    user: data.user,
    session: data.session,
    error,
  };
}

export async function signOut(): Promise<{ error: AuthError | null }> {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export async function getAccessToken(): Promise<string | null> {
  const session = await getSession();
  return session?.access_token ?? null;
}
