"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

// Vanilla SVG icons to replace lucide-react
const Icons = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Transactions: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  Budgets: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  Advice: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Sparkles: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>,
  Moon: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
  Sun: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
  LogOut: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>,
  Menu: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>,
  X: () => <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
};

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: Icons.Dashboard },
  { href: "/transactions", label: "Transactions", icon: Icons.Transactions },
  { href: "/budgets", label: "Budgets", icon: Icons.Budgets },
  { href: "/recommendations", label: "Advice", icon: Icons.Advice },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [token, setToken] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    let currentToken = localStorage.getItem("token");
    if (!currentToken && !window.location.pathname.startsWith("/auth")) {
      currentToken = "mock-token-for-demo";
      localStorage.setItem("token", currentToken);
    }
    setToken(currentToken);
    
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    if (theme === "light") {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.href = "/auth";
  };

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border bg-card/50 backdrop-blur-xl z-50">
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-primary tracking-tight flex items-center gap-2">
              <Icons.Sparkles /> ExpenseAI
            </h1>
          </div>
        </div>
        <nav className="flex-1 px-4 space-y-1.5 mt-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link key={href} href={href} className="relative block group">
                <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 z-10 relative ${isActive ? "text-primary-foreground bg-primary" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"}`}>
                  <Icon />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-border mt-auto flex flex-col gap-2">
          {mounted && (
            <button onClick={toggleTheme} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-xl transition-all">
              {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          )}
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
            <Icons.LogOut />
            Sign out
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <aside className="fixed inset-y-0 left-0 w-64 bg-card border-r border-border z-50 flex flex-col lg:hidden shadow-2xl transition-transform duration-300">
            <div className="p-5 flex items-center justify-between border-b border-border">
              <h1 className="text-xl font-bold text-primary tracking-tight">ExpenseAI</h1>
              <button onClick={() => setSidebarOpen(false)} className="p-2 -mr-2 text-muted-foreground hover:bg-muted rounded-lg">
                <Icons.X />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {nav.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setSidebarOpen(false)} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${pathname === href ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                  <Icon />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="p-4 border-t border-border flex flex-col gap-2">
               {mounted && (
                <button onClick={toggleTheme} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition-all">
                  {theme === "dark" ? <Icons.Sun /> : <Icons.Moon />}
                  {theme === "dark" ? "Light Mode" : "Dark Mode"}
                </button>
              )}
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                <Icons.LogOut />
                Sign out
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        <header className="sticky top-0 z-30 lg:hidden flex items-center justify-between p-4 bg-background/80 backdrop-blur-md border-b border-border">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-muted-foreground hover:bg-muted rounded-lg">
            <Icons.Menu />
          </button>
          <span className="font-semibold text-foreground">ExpenseAI</span>
          <div className="w-6" /> {/* Spacer */}
        </header>
        
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {children}
        </main>
      </div>
    </div>
  );
}
