import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase';
import { logRequest, logError } from '@/lib/logging';

export async function GET(request: Request) {
  // Log request with safe metadata only
  logRequest(request, {
    metadata: { endpoint: 'auth/callback' }
  });
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const supabase = createSupabaseServerClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (error) {
      logError('Error exchanging code for session', error);
      return NextResponse.redirect(`${origin}/auth?error=${encodeURIComponent(error.message)}`);
    }
    
    // Check if user exists in agents table
    if (data.session?.user?.email) {
      const { data: agentData, error: fetchError } = await supabase
        .from('agents')
        .select('id, role')
        .eq('email', data.session.user.email)
        .single();
      
      // If user doesn't exist in agents table, create a new record
      if (!agentData && !fetchError) {
        const { error: insertError } = await supabase
          .from('agents')
          .insert({
            email: data.session.user.email,
            agent_name: data.session.user?.user_metadata?.name || data.session.user.email.split('@')[0],
            role: 'agent' // Default role for new users
          });
          
        if (insertError) {
          console.error('Error creating agent record:', insertError);
        }
        
        // Redirect to leaderboard for new agents
        return NextResponse.redirect(`${origin}/leaderboard`);
      }
      
      // Redirect based on role
      if (agentData) {
        return NextResponse.redirect(`${origin}${agentData.role === 'admin' ? '/dashboard' : '/leaderboard'}`);
      }
    }
    
    // Default redirect if we can't determine role
    return NextResponse.redirect(`${origin}${next}`);
  }

  // No code found, redirect to auth page
  return NextResponse.redirect(`${origin}/auth?error=No%20code%20provided`);
}
