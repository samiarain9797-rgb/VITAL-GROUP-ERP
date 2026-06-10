import { Api, useAuth } from 'bknd/client';

// Get URL from env
let rawUrl = import.meta.env.VITE_BKND_URL || "http://localhost:3000";
if (typeof rawUrl === 'string') {
  rawUrl = rawUrl.replace(/^"|"$/g, '').trim();
}
let cleanUrl = rawUrl;
try {
  const parsed = new URL(rawUrl);
  cleanUrl = `${parsed.protocol}//${parsed.host}`;
} catch (e) {
  console.warn("Invalid BKND URL format", rawUrl);
}

let authHandlers = [];
let currentUser = null;

export const api = new Api({ 
  host: cleanUrl,
  onAuthStateChange: (state) => {
    currentUser = state.user;
    const session = state.user ? { user: state.user } : null;
    authHandlers.forEach(h => h('SIGNED_IN_OR_OUT', session));
  }
});

export const supabase = {
  auth: {
    getSession: async () => {
      try {
        await api.verifyAuth();
        const state = api.getAuthState();
        const user = state.user;
        if (user) {
          return { data: { session: { user } }, error: null };
        }
      } catch (e) {}
      return { data: { session: null }, error: null };
    },
    onAuthStateChange: (handler) => {
      authHandlers.push(handler);
      return { data: { subscription: { unsubscribe: () => { authHandlers = authHandlers.filter(h => h !== handler); } } } };
    },
    signUp: async ({ email, password }) => {
      try {
        const res = await api.auth.register("password", { email, password });
        if (res.data) {
          const user = res.data.user;
          return { data: { user, session: { user } }, error: null };
        }
        return { data: null, error: res.error };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signInWithPassword: async ({ email, password }) => {
      try {
        const res = await api.auth.login("password", { email, password });
        if (res.data) {
          const user = res.data.user;
          return { data: { user, session: { user } }, error: null };
        }
        return { data: null, error: res.error };
      } catch (err) {
        return { data: null, error: err };
      }
    },
    signOut: async () => {
      try {
        await api.auth.logout();
      } catch (e) {}
      
      const session = null;
      authHandlers.forEach(h => h('SIGNED_OUT', session));
    },
    resetPasswordForEmail: async (email, opts) => {
      console.warn("resetPasswordForEmail not natively supported by shim");
      return { error: null };
    },
    setSession: async (session) => {
      // No-op
    }
  }
};
