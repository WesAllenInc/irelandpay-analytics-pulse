'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@lib/supabase/client';
import { Session, User } from '@supabase/supabase-js';

// Define user role type
type UserRole = 'admin' | 'agent' | null;

// Define auth context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  role: UserRole;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAgent: boolean;
};

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  loading: true,
  error: null,
  signOut: async () => {},
  isAdmin: false,
  isAgent: false
});

// Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          throw sessionError;
        }
        
        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          // Executive users always get admin role
          const { isExecutiveUser } = await import('@/lib/auth/executive-check');
          const isExecutive = isExecutiveUser(session.user.email);
          
          if (isExecutive) {
            console.log('✅ Executive user detected in useAuth, setting admin role');
            setRole('admin');
          } else {
            // For non-executive users, fetch role from agents table
            const { data: agentData, error: agentError } = await supabase
              .from("agents")
              .select("role")
              .eq("email", session.user.email || "")
              .single();
   
            if (agentError) {
              console.error("Error fetching user role:", agentError);
              setRole(null);
            } else {
              setRole(agentData?.role as UserRole || "agent");
            }
          }
        }
      } catch (err: any) {
        console.error("Auth initialization error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
  
    getInitialSession();
  
    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user || null);
        setLoading(true);
  
        if (event === "SIGNED_OUT") {
          setRole(null);
          router.push("/auth");
        } 
        else if (session?.user) {
          // Executive users always get admin role
          const { isExecutiveUser } = await import('@/lib/auth/executive-check');
          const isExecutive = isExecutiveUser(session.user.email);
          
          if (isExecutive) {
            console.log('✅ Executive user detected in auth state change, setting admin role');
            setRole('admin');
          } else {
            // For non-executive users, fetch role from agents table
            const { data: agentData, error: agentError } = await supabase
              .from("agents")
              .select("role")
              .eq("email", session.user.email || "")
              .single();
   
            if (agentError) {
              console.error("Error fetching user role:", agentError);
              setRole(null);
            } else {
              setRole(agentData?.role as UserRole || "agent");
            }
          }
        }
  
        setLoading(false);
      }
    );
  
    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Sign out function
  const signOut = async () => {
    await supabase.auth.signOut();
    router.push("/auth");
  };

  // Helper properties
  const isAdmin = role === "admin";
  const isAgent = role === "agent";

  return (
    <AuthContext.Provider value={{
      user,
      session,
      role,
      loading,
      error,
      signOut,
      isAdmin,
      isAgent
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export default useAuth;
