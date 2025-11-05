// In a real application, this would interface with a library like Firebase Auth or the Google Identity Services SDK.
// We'll simulate the user session using localStorage to provide a persistent experience.

export interface GoogleUser {
    uid: string;
    displayName: string;
    email: string;
}

const MOCK_USER_SESSION_KEY = 'google_mock_user_session';

// --- This object simulates a browser-based Google Auth API ---
const mockGoogleAuthAPI = {
    _listeners: new Set<(user: GoogleUser | null) => void>(),
    
    onAuthStateChanged: (callback: (user: GoogleUser | null) => void): () => void => {
        mockGoogleAuthAPI._listeners.add(callback);
        // Immediately notify the new listener with the current authentication state
        try {
            const sessionData = localStorage.getItem(MOCK_USER_SESSION_KEY);
            callback(sessionData ? JSON.parse(sessionData) : null);
        } catch {
            callback(null);
        }
        
        // Return an unsubscribe function to prevent memory leaks
        return () => {
            mockGoogleAuthAPI._listeners.delete(callback);
        };
    },
    
    signIn: async (email: string): Promise<GoogleUser> => {
        // Simulate a network delay
        await new Promise(res => setTimeout(res, 500)); 
        
        if (!email || !email.includes('@')) {
            throw new Error("Invalid email provided for sign-in.");
        }
        
        const user: GoogleUser = {
            uid: `google|${email.toLowerCase()}`,
            displayName: email.split('@')[0],
            email: email.toLowerCase(),
        };
        
        localStorage.setItem(MOCK_USER_SESSION_KEY, JSON.stringify(user));
        // Notify all listeners about the new authenticated user
        mockGoogleAuthAPI._listeners.forEach(cb => cb(user));
        return user;
    },
    
    signOut: async (): Promise<void> => {
        localStorage.removeItem(MOCK_USER_SESSION_KEY);
        // Notify all listeners that the user has signed out
        mockGoogleAuthAPI._listeners.forEach(cb => cb(null));
    },
};
// --- End of mock API ---


class AuthService {
    /**
     * Registers a callback that fires whenever the user's sign-in state changes.
     * @param callback The function to call with the user object or null.
     * @returns An unsubscribe function to clean up the listener.
     */
    onAuthStateChanged(callback: (user: GoogleUser | null) => void): () => void {
        return mockGoogleAuthAPI.onAuthStateChanged(callback);
    }
    
    /**
     * Initiates the Google Sign-In flow.
     */
    async signInWithGoogle(email: string): Promise<GoogleUser> {
        return mockGoogleAuthAPI.signIn(email);
    }
    
    /**
     * Signs the current user out.
     */
    async signOut(): Promise<void> {
        return mockGoogleAuthAPI.signOut();
    }
}

export const authService = new AuthService();