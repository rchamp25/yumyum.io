import React, { useState } from 'react';

interface LoginScreenProps {
  onLogin: (email: string) => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('player@example.com');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim() && email.includes('@')) {
      onLogin(email);
    } else {
      alert("Please enter a valid email address.");
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur-md p-8 rounded-xl shadow-lg border border-gray-700 text-center max-w-md w-full">
      <h1 className="text-4xl font-bold mb-2 text-white">Welcome, Adventurer</h1>
      <p className="text-gray-400 mb-8">Sign in to begin or continue your journey.</p>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-center text-lg"
          required
        />
        <button
          type="submit"
          className="w-full flex items-center justify-center bg-white text-gray-700 font-semibold py-3 px-6 rounded-lg text-lg hover:bg-gray-200 transition-colors duration-300 transform hover:scale-105 disabled:opacity-50 disabled:scale-100"
          disabled={!email.trim()}
        >
          <svg className="w-6 h-6 mr-3" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.35 6.52C12.91 13.46 18.06 9.5 24 9.5z"></path>
            <path fill="#34A853" d="M46.98 24.55c0-1.57-.15-3.09-.42-4.55H24v8.51h12.8c-.57 3.32-2.31 6.17-4.79 8.09l7.92 6.13c4.5-4.18 7.07-10.12 7.07-17.18z"></path>
            <path fill="#FBBC05" d="M10.91 28.74c-.5-1.52-.79-3.13-.79-4.74s.29-3.22.79-4.74l-8.35-6.52C.73 15.82 0 19.82 0 24s.73 8.18 2.56 11.26l8.35-6.52z"></path>
            <path fill="#EA4335" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.92-6.13c-2.16 1.45-4.96 2.3-8.02 2.3-5.95 0-11.09-3.96-12.91-9.28L2.56 34.78C6.51 42.62 14.62 48 24 48z"></path>
            <path fill="none" d="M0 0h48v48H0z"></path>
          </svg>
          Sign in with Email
        </button>
      </form>
      <p className="text-xs text-gray-500 mt-4">(This is a simulated login. No real Google account is used.)</p>
    </div>
  );
};

export default LoginScreen;