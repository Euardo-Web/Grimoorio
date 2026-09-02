import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { House, Users, UserCircle, Books, SignOut, List, X, Bell } from "@phosphor-icons/react";
import { useState, useEffect } from "react";
import api from "@/lib/api";

const NAV = [
  { to: "/app", label: "Início", icon: House, testid: "nav-home" },
  { to: "/app/campaigns", label: "Campanhas", icon: Users, testid: "nav-campaigns" },
  { to: "/app/characters", label: "Personagens", icon: UserCircle, testid: "nav-characters" },
  { to: "/app/templates", label: "Modelos", icon: Books, testid: "nav-templates" },
];

export default function Layout({ children, right }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get("/notifications");
        setNotifs(data);
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  const unread = notifs.filter((n) => !n.read).length;

  const markRead = async () => {
    await api.post("/notifications/read-all");
    setNotifs(notifs.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="min-h-screen flex bg-[#0A0A0E] relative">
      {/* Sidebar */}
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:static top-0 left-0 h-screen z-40 w-60 bg-[#0A0A0E] border-r border-white/5 flex flex-col`}
      >
        <div className="px-5 py-6 border-b border-white/5 flex items-center justify-between">
          <Link to="/app" className="font-display text-2xl font-bold tracking-tight text-white" data-testid="brand-link">
            <span className="text-[#FF4500]">🧌</span> Grimório
          </Link>
          <button className="md:hidden text-gray-400" onClick={() => setOpen(false)} data-testid="close-menu-btn">
            <X size={20} />
          </button>
        </div>
        <nav className="flex-1 py-4 px-2">
          {NAV.map(({ to, label, icon: Icon, testid }) => {
            const active = location.pathname === to || (to !== "/app" && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                data-testid={testid}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium ${
                  active ? "bg-[#FF4500]/10 text-white border-l-2 border-[#FF4500]" : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Icon size={18} weight={active ? "fill" : "regular"} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/5">
          <div className="text-xs text-gray-500 mb-2 font-mono">{user?.email}</div>
          <div className="text-sm text-gray-300 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#FF4500]"></span>
            {user?.name} <span className="text-xs text-gray-500">({user?.role === "master" ? "Mestre" : "Jogador"})</span>
          </div>
          <button
            onClick={async () => { await logout(); nav("/login"); }}
            data-testid="logout-btn"
            className="w-full flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <SignOut size={16} /> Sair
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 bg-black/60 z-30 md:hidden" onClick={() => setOpen(false)} />}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 glass border-b border-white/5">
          <div className="flex items-center justify-between px-4 md:px-8 py-3">
            <button className="md:hidden text-gray-400" onClick={() => setOpen(true)} data-testid="open-menu-btn">
              <List size={22} />
            </button>
            <div className="flex-1" />
            <div className="relative">
              <button
                onClick={() => { setShowNotifs(!showNotifs); if (!showNotifs && unread > 0) markRead(); }}
                data-testid="notifications-btn"
                className="relative p-2 text-gray-400 hover:text-white"
              >
                <Bell size={20} weight={unread > 0 ? "fill" : "regular"} />
                {unread > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF4500]" />
                )}
              </button>
              {showNotifs && (
                <div className="absolute right-0 top-full mt-2 w-80 glass rounded-sm shadow-2xl max-h-96 overflow-y-auto scroll-thin" data-testid="notifications-panel">
                  {notifs.length === 0 ? (
                    <div className="p-4 text-sm text-gray-500">Sem notificações</div>
                  ) : notifs.map((n) => (
                    <div key={n.id} className="p-3 border-b border-white/5 text-sm text-gray-300">
                      {n.message}
                      <div className="text-xs text-gray-500 mt-1 font-mono">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 relative z-10">
          {children}
        </main>
      </div>

      {right}
    </div>
  );
}
