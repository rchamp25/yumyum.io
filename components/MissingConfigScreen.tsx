import React from 'react';

const MissingConfigScreen: React.FC = () => (
  <div className="w-screen h-dvh flex items-center justify-center p-4">
    <div className="bg-gray-800/80 p-8 rounded-xl border border-red-500/50 max-w-lg text-center">
      <h1 className="text-2xl font-bold text-red-400 mb-3">Supabase is not configured</h1>
      <p className="text-gray-300">
        Set <code className="text-teal-300">VITE_SUPABASE_URL</code> and{' '}
        <code className="text-teal-300">VITE_SUPABASE_ANON_KEY</code> in <code>.env.local</code>{' '}
        (see <code>.env.example</code>), then restart the dev server.
      </p>
    </div>
  </div>
);

export default MissingConfigScreen;
