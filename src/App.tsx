import { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Auth from "./pages/Auth";
import MainApp from "./components/MainApp";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";

const queryClient = new QueryClient();

interface UserProfile {
  id: string;
  username: string;
  full_name: string;
  role: 'admin' | 'sbu';
  sbu_name?: string;
}

const App = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fungsi terpusat untuk menangani sesi dan profil
    const handleAuth = async (session: Session | null) => {
      try {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();
          
          if (error) {
            console.error('Error fetching profile:', error);
            setUserProfile(null);
          } else {
            setUserProfile(profile as UserProfile);
          }
        } else {
          setUserProfile(null);
        }
      } catch (error) {
        console.error('Auth handler error:', error);
        setUserProfile(null);
      } finally {
        // SELALU atur loading ke false setelah proses selesai
        setLoading(false);
      }
    };
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        handleAuth(session);
      }
    );

    // Pengecekan awal sesi
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.id);
      handleAuth(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUserProfile(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Logika routing
  let initialRoute = '/';
  if (session && userProfile) {
    initialRoute = userProfile.role === 'admin' ? '/admin/dashboard' : '/sbu/dashboard';
  } else if (!session) {
    initialRoute = '/';
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={session ? <Navigate to={initialRoute} replace /> : <Auth />} />
            <Route path="/admin/*" element={session && userProfile?.role === 'admin' ? <MainApp userRole="admin" userName={userProfile.full_name} onSignOut={handleSignOut} /> : <Navigate to="/" replace />} />
            <Route path="/sbu/*" element={session && userProfile?.role === 'sbu' ? <MainApp userRole="sbu" userName={userProfile.full_name} currentSBU={userProfile.sbu_name} onSignOut={handleSignOut} /> : <Navigate to="/" replace />} />
            <Route path="*" element={<p>404 Not Found</p>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;