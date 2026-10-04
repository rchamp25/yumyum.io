import type { User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export interface AuthUser {
    uid: string;
    displayName: string;
    email: string;
}

const toAuthUser = (user: User): AuthUser => ({
    uid: user.id,
    displayName: user.user_metadata.full_name || user.email?.split('@')[0] || 'Hero',
    email: user.email || '',
});

class AuthService {
    /**
     * Calls back with the signed-in user (or null) once on subscribe, and again whenever
     * the session changes. Note that token refreshes also re-emit the same user, so
     * callers should compare user ids rather than treat every call as a new login.
     */
    onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            // Supabase holds an auth lock while this listener runs, so any Supabase query made
            // synchronously from the callback can deadlock. Defer to the next tick.
            const user = session?.user ? toAuthUser(session.user) : null;
            setTimeout(() => callback(user), 0);
        });
        return () => subscription.unsubscribe();
    }

    async signInWithGoogle(): Promise<void> {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            },
        });
        if (error) throw error;
    }

    async signOut(): Promise<void> {
        await supabase.auth.signOut();
    }
}

export const authService = new AuthService();
