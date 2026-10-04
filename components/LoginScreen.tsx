
import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: () => void | Promise<void>;
  onPlayAsGuest: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, onPlayAsGuest }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await onLogin();
    } catch (err) {
      setIsLoading(false);
      alert(`Login failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-md p-6 md:p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-md w-full">
      <p className="text-teal-400 font-black uppercase tracking-[0.3em] text-sm mb-4">yumyum.io</p>
      <h1 className="text-3xl md:text-4xl font-bold mb-2 text-white">Welcome, Adventurer</h1>
      <p className="text-gray-400 mb-8">Sign in to keep your heroes on your account, or jump straight in as a guest.</p>
      
      <div className="space-y-6">
        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg text-lg hover:bg-gray-200 transition-colors duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100 disabled:cursor-wait"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Connecting...
            </span>
          ) : (
            <>
              <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
                <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.35 6.52C12.91 13.46 18.06 9.5 24 9.5z"></path>
                <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 3.32-2.31 6.17-4.79 8.09l7.92 6.13c4.5-4.18 7.07-10.12 7.07-17.18z"></path>
                <path fill="#FBBC05" d="M10.91 28.74c-.5-1.52-.79-3.13-.79-4.74s.29-3.22.79-4.74l-8.35-6.52C.73 15.82 0 19.82 0 24s.73 8.18 2.56 11.26l8.35-6.52z"></path>
                <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.92-6.13c-2.16 1.45-4.96 2.3-8.02 2.3-5.95 0-11.09-3.96-12.91-9.28L2.56 34.78C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
              Sign in with Google
            </>
          )}
        </button>
        <button
          onClick={onPlayAsGuest}
          disabled={isLoading}
          className="w-full bg-teal-600 text-white font-semibold py-3 px-6 rounded-lg text-lg hover:bg-teal-500 transition-colors duration-300 disabled:opacity-50"
        >
          Play as Guest
        </button>
        <p className="text-xs text-gray-500">Guest heroes are saved in this browser only.</p>
      </div>
    </div>
  );
};

export default LoginScreen;
