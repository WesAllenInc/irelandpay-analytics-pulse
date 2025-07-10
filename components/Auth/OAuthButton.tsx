import React from 'react';
import { Button } from '@/components/ui/button';
import { createSupabaseBrowserClient } from '@/lib/supabase';
import { SquareUserRound } from 'lucide-react';

interface OAuthButtonProps {
  className?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const OAuthButton: React.FC<OAuthButtonProps> = ({
  className,
  onSuccess,
  onError
}) => {
  const supabase = createSupabaseBrowserClient();

  const handleMicrosoftSignIn = async () => {
    try {
      // Use current window origin for consistent redirect in all environments
      const redirectUrl = `${window.location.origin}/auth/callback`;
      
      console.log('Auth redirect URL:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'azure',
        options: {
          redirectTo: redirectUrl,
          scopes: 'email profile openid'
        }
      });

      if (error) {
        throw error;
      }

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Microsoft login error:', err);
      if (onError) onError(err);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      onClick={handleMicrosoftSignIn}
      className={`w-full flex items-center justify-center gap-2 ${className}`}
    >
      <SquareUserRound className="w-5 h-5" />
      <span>Sign in with Microsoft</span>
    </Button>
  );
};

export default OAuthButton;
