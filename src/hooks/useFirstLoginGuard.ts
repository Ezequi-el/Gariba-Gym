import { useEffect, useState, useCallback } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/**
 * Detects whether the authenticated user must change their password before
 * accessing the app. Works with two signal sources (checked in order):
 *
 *   1. Supabase Auth user_metadata.must_change_password  (set by admin via
 *      supabase.auth.admin.updateUserById or invite flows)
 *   2. socios.must_change_password column  (legacy flag used by the current
 *      admin portal when creating members)
 *
 * Usage:
 *   const { mustChangePassword, markPasswordChanged } = useFirstLoginGuard(user);
 *
 *   if (mustChangePassword) return <ChangePasswordScreen onDone={markPasswordChanged} />;
 *
 * NOTE: This project does not use react-router-dom. The "redirect" is
 * implemented as a boolean gate — render a password-change screen when true.
 * If react-router-dom is added in the future, replace the boolean gate with
 * useNavigate('/cambiar-contrasena') inside the useEffect below.
 */
export function useFirstLoginGuard(user: User | null) {
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!user) {
      setMustChangePassword(false);
      setChecking(false);
      return;
    }

    // Source 1: Supabase Auth user_metadata
    const metaFlag = user.user_metadata?.must_change_password === true;
    if (metaFlag) {
      setMustChangePassword(true);
      setChecking(false);
      return;
    }

    // Source 2: socios table (legacy flag for members created by the admin portal)
    const checkSociosFlag = async () => {
      const { data } = await supabase
        .from('socios')
        .select('must_change_password')
        .eq('user_id', user.id)
        .maybeSingle();

      setMustChangePassword(data?.must_change_password === true);
      setChecking(false);
    };

    checkSociosFlag();
  }, [user]);

  /**
   * Call this after a successful password change to clear both signal sources.
   * Clears user_metadata flag (if set) and the socios column (if the user is
   * a member). The caller is responsible for re-rendering after this resolves.
   */
  const markPasswordChanged = useCallback(async () => {
    if (!user) return;

    // Clear Auth metadata flag
    await supabase.auth.updateUser({
      data: { must_change_password: false }
    });

    // Clear socios column
    await supabase
      .from('socios')
      .update({ must_change_password: false })
      .eq('user_id', user.id);

    setMustChangePassword(false);
  }, [user]);

  return { mustChangePassword, markPasswordChanged, checking };
}
