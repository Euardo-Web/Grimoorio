import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { Toaster } from "sonner";
import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Dashboard from "@/pages/Dashboard";
import CampaignsPage from "@/pages/CampaignsPage";
import CampaignDetail from "@/pages/CampaignDetail";
import CharactersPage from "@/pages/CharactersPage";
import CharacterSheet from "@/pages/CharacterSheet";
import TemplatesPage from "@/pages/TemplatesPage";
import TemplateEditor from "@/pages/TemplateEditor";
import "@/App.css";

function Protected({ children }) {
  const { user } = useAuth();
  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center text-gray-500 font-mono text-sm">carregando...</div>;
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/app" element={<Protected><Dashboard /></Protected>} />
      <Route path="/app/campaigns" element={<Protected><CampaignsPage /></Protected>} />
      <Route path="/app/campaigns/:id" element={<Protected><CampaignDetail /></Protected>} />
      <Route path="/app/characters" element={<Protected><CharactersPage /></Protected>} />
      <Route path="/app/characters/:id" element={<Protected><CharacterSheet /></Protected>} />
      <Route path="/app/templates" element={<Protected><TemplatesPage /></Protected>} />
      <Route path="/app/templates/:id" element={<Protected><TemplateEditor /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster theme="dark" position="bottom-right" richColors closeButton />
      </BrowserRouter>
    </AuthProvider>
  );
}
