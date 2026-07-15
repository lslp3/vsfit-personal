import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { router } from './routes';
import { useAuthStore } from '../store/authStore';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { supabase } from '../lib/supabase';

export function App() {
  const { isLoading, initialize } = useAuthStore();

  useEffect(() => {
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        useAuthStore.getState().logoutFromEvent();
      } else if (event === 'TOKEN_REFRESHED' && session) {
        useAuthStore.getState().setUser(session.user);
      }
    });

    return () => subscription?.unsubscribe();
  }, [initialize]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return <RouterProvider router={router} />;
}
