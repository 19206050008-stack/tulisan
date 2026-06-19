import { supabase } from './client';

export async function signUp(email: string, password: string, username: string, fullName: string, interest?: string) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, full_name: fullName }
    }
  });
  if (error) throw error;

  if (data.user) {
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      full_name: fullName,
      role: 'user',
      interest: interest || 'both'
    });
    
    // CRITICAL FIX: If profile creation fails, we should attempt to clean up the auth user
    if (profileError) {
      // Note: Supabase doesn't provide easy way to delete auth user from client
      // In production, you can handle this via a database trigger or cloud function
      console.error('Profile creation failed after auth signup:', profileError);
      throw new Error('Registration failed. Please try again or contact support if the issue persists.');
    }
  }

  return data;
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase not configured');
  
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}
