import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Mail, Lock, ShieldCheck, Database, FileKey, XCircle, Github } from 'lucide-react';

export default function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  const isConfigured = Boolean(
    import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
  );

  useEffect(() => {
    if (isConfigured) {
      // If we are in the OAuth popup callback, wait briefly for Supabase to process the URL hash, then close the window.
      if (window.opener && (window.location.hash.includes('access_token') || window.location.search.includes('code='))) {
        setTimeout(() => window.close(), 1500);
      }

      supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session);
        setLoading(false);
      });

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
        if (session && window.opener) {
          window.close();
        }
      });

      return () => subscription.unsubscribe();
    } else {
      setLoading(false);
    }
  }, [isConfigured]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Check your email for the login link! Or if auto-confirm is enabled, you are logged in.');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  const handleGithubLogin = async () => {
    setErrorMsg('');
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          skipBrowserRedirect: true,
          redirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, 'github_oauth', 'width=600,height=700');
      }
    } catch (error: any) {
      setErrorMsg(error.message || 'Error initializing GitHub login');
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!isConfigured) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600">
              <Database size={32} />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center text-gray-900 mb-2">Supabase Disconnected</h1>
          <p className="text-gray-500 text-center mb-8">
            You must provide your Supabase connection strings to continue using the application.
          </p>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <h3 className="flex items-center gap-2 text-orange-800 font-semibold mb-2">
              <FileKey size={18} /> Required Environment Variables
            </h3>
            <ul className="text-sm text-orange-700 space-y-2 list-disc list-inside">
              <li className="font-mono">VITE_SUPABASE_URL</li>
              <li className="font-mono">VITE_SUPABASE_ANON_KEY</li>
            </ul>
          </div>

          <p className="text-sm text-gray-500 text-center mb-4">
            If you're running this locally or in Github Codespaces, you should put these in your <strong>.env</strong> file. In AI Studio, configure them via the Settings panel.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 to-white">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center -mt-px">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg transform rotate-3">
              <ShieldCheck size={32} className="text-white transform -rotate-3" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {isLogin ? 'Sign in to your account' : 'Create a new account'}
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-gray-100">
            {errorMsg && (
              <div className="bg-red-50 text-red-700 p-3 rounded-lg mb-6 flex items-start gap-2 text-sm">
                <XCircle className="w-5 h-5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}
            
            <form className="space-y-6" onSubmit={handleAuth}>
              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="email">
                  Email address
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="you@example.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700" htmlFor="password">
                  Password
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="appearance-none block w-full pl-10 px-3 py-2 border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {loading ? 'Processing...' : isLogin ? 'Sign in' : 'Sign up'}
                </button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or continue with</span>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1">
                <button
                  onClick={handleGithubLogin}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  <Github className="w-5 h-5" />
                  GitHub
                </button>
              </div>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium cursor-pointer"
              >
                {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-indigo-600 px-6 py-8 sm:p-10 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Supabase Connected</h1>
                <p className="text-indigo-100">You have successfully integrated Supabase Authentication.</p>
              </div>
              <Database size={48} className="text-indigo-300 opacity-50" />
            </div>
          </div>
          <div className="p-6 sm:p-10">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Session Information</h2>
            <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm overflow-x-auto text-gray-600 border border-gray-200 mb-8">
              User ID: {session.user.id}<br />
              Email: {session.user.email}<br />
              Last Sign In: {session.user.last_sign_in_at ? new Date(session.user.last_sign_in_at).toLocaleString() : 'N/A'}
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={signOut}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
