import { createBrowserRouter, redirect } from "react-router-dom";
import App from "./App";
import { Home, Dashboard, Settings, Auth, AuthCallback, Admin, Live, NotFound, Signals } from "./pages";
import ResetPassword from "./pages/ResetPassword";
import StreamerDashboard from "./pages/StreamerDashboard";
import MeetingRoom from "./pages/MeetingRoom";
import StreamViewer from "./pages/StreamViewer";
import { getSupabase } from "./lib/supabase";
import { Session } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';

// Log para debugging da rota de sinais
console.log("[DEBUG] Importação de Signals:", !!Signals);

// Função auxiliar para verificar autenticação
const requireAuth = async () => {
  const { data: { session } } = await (getSupabase() as SupabaseClient<Database>).auth.getSession();
  if (!session) {
    throw redirect("/auth");
  }
  return null;
};

// Função auxiliar para direcionar usuários já autenticados
const redirectIfAuthenticated = async () => {
  const { data: { session } } = await (getSupabase() as SupabaseClient<Database>).auth.getSession();
  if (session) {
    throw redirect("/");
  }
  return null;
};

// Rotas da aplicação
export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
        loader: requireAuth,
      },
      {
        path: "dashboard",
        element: <Dashboard />,
        loader: requireAuth,
      },
      {
        path: "settings",
        element: <Settings />,
        loader: requireAuth,
      },
      {
        path: "profile",
        element: <Settings />,
        loader: requireAuth,
      },
      {
        path: "admin",
        element: <Admin />,
        loader: requireAuth,
      },
      {
        path: "live",
        element: <Live />,
        loader: requireAuth,
      },
      {
        path: "signals",
        element: <Signals />,
        loader: requireAuth,
      },
    ],
  },
  {
    path: "/streamer/:streamId",
    element: <StreamerDashboard />,
    loader: requireAuth,
  },
  {
    path: "/meeting/:streamId",
    element: <MeetingRoom />,
    loader: requireAuth,
  },
  {
    path: "/watch/:streamId",
    element: <StreamViewer />,
    loader: requireAuth,
  },
  {
    path: "/auth/reset-password", 
    element: <ResetPassword />,
  },
  {
    path: "/reset-password",
    element: <ResetPassword />,
  },
  {
    path: "/auth/callback",
    element: <AuthCallback />,
  },
  {
    path: "/auth",
    element: <Auth />,
    loader: redirectIfAuthenticated,
  },
  {
    path: "*",
    element: <NotFound />,
  },
]); 