
import { supabase } from './supabaseClient';

export interface GoogleUser {
    uid: string;
    displayName: string;
    email: string;
}

class AuthService {
    onAuthStateChanged(callback: (user: GoogleUser | null) => void): () => void {
        // Check initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (session?.user) {
                callback({
                    uid: session.user.id,
                    displayName: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Hero',
                    email: session.user.email || '',
                });
            } else {
                callback(null);
            }
        });

        // Listen for changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session?.user) {
                callback({
                    uid: session.user.id,
                    displayName: session.user.user_metadata.full_name || session.user.email?.split('@')[0] || 'Hero',
                    email: session.user.email || '',
                });
            } else {
                callback(null);
            }
        });

        return () => subscription.unsubscribe();
    }
    
    async signInWithGoogle(_email: string): Promise<void> {
        // Note: The 'email' arg is unused here because we redirect to Google directly.
        // In a real app, the user picks their account on the Google page.
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin,
            }
        });
        if (error) throw error;
    }
    
    async signOut(): Promise<void> {
        await supabase.auth.signOut();
    }
}

export const authService = new AuthService();
