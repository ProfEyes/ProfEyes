import { createBrowserRouter, redirect } from "react-router-dom";
import App from "./App";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Auth from "./pages/Auth";
import Admin from "./pages/Admin";
import { supabase } from "./lib/supabase";

// Função auxiliar para verificar autenticação
const requireAuth = async () => {
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    throw redirect("/auth");
  }
  return null;
};

// Função auxiliar para direcionar usuários já autenticados
const redirectIfAuthenticated = async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session) {
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
        path: "admin",
        element: <Admin />,
        loader: requireAuth,
      },
    ],
  },
  {
    path: "/auth",
    element: <Auth />,
    loader: redirectIfAuthenticated,
  },
]); 