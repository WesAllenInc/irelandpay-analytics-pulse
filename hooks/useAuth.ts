'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

// Define user role type
type UserRole = 'admin' | 'agent' | null;

// Define approval status type
type ApprovalStatus = 'pending' | 'approved' | 'rejected' | null;

// Define auth context type
type AuthContextType = {
  user: User | null;
  session: Session | null;
  role: UserRole;
  approvalStatus: ApprovalStatus;
  loading: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isAgent: boolean;
  isPending: boolean;
  isApproved: boolean;
  isRejected: boolean;
};

// Create auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  role: null,
  approvalStatus: null,
  loading: true,
  error: null,
  signOut: async () => {},
  isAdmin: false,
  isAgent: false,
  isPending: false,
  isApproved: false,
  isRejected: false
});

// Auth Provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [approvalStatus, setApprovalStatus] = useState<ApprovalStatus>(null);
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
          // Fetch user role and approval status from agents table
          const { data: agentData, error: agentError } = await supabase
            .from("agents")
            .select("role, approval_status")
            .eq("email", session.user.email || "")
            .single();
 
          if (agentError) {
            console.error("Error fetching user data:", agentError);
            setRole(null);
            setApprovalStatus(null);
          } else {
            setRole(agentData?.role as UserRole || "agent");
            setApprovalStatus(agentData?.approval_status as ApprovalStatus || "pending");
            
            // Redirect unapproved users to pending approval page
            if (agentData?.approval_status === 'rejected') {
              router.push('/auth/account-rejected');
            } else if (agentData?.approval_status === 'pending') {
              router.push('/auth/pending-approval');
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
          // Fetch user role and approval status
          const { data: agentData, error: agentError } = await supabase
            .from("agents")
            .select("role, approval_status")
            .eq("email", session.user.email || "")
            .single();
 
          if (agentError) {
            console.error("Error fetching user data:", agentError);
            setRole(null);
            setApprovalStatus(null);
          } else {
            setRole(agentData?.role as UserRole || "agent");
            setApprovalStatus(agentData?.approval_status as ApprovalStatus || "pending");
            
            // Redirect unapproved users to pending approval page
            if (agentData?.approval_status === 'rejected') {
              router.push('/auth/account-rejected');
            } else if (agentData?.approval_status === 'pending') {
              router.push('/auth/pending-approval');
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
  const isPending = approvalStatus === "pending";
  const isApproved = approvalStatus === "approved";
  const isRejected = approvalStatus === "rejected";

  const value: AuthContextType = {
    user,
    session,
    role,
    approvalStatus,
    loading,
    error,
    signOut,
    isAdmin,
    isAgent,
    isPending,
    isApproved,
    isRejected
  };

  return (
    <AuthContext.Provider value={value}>
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
