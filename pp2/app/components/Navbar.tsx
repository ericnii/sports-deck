"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/feed", label: "Personalized Feed", color: "bg-indigo-600 hover:bg-indigo-700" },
  { href: "/forums", label: "Forums", color: "bg-blue-500 hover:bg-blue-600" },
  { href: "/league/standings", label: "League Standings", color: "bg-green-600 hover:bg-green-700" },
  { href: "/matches", label: "Matches", color: "bg-yellow-500 hover:bg-yellow-600" },
  { href: "/moderation", label: "Moderation", color: "bg-red-600 hover:bg-red-700" },
];

function SearchBar({ isMobile }: { isMobile?: boolean }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }
    
    setIsSearching(true);
    setIsOpen(true);
    
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.users || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  return (
    <div className={`relative ${isMobile ? "w-full mb-3" : "w-64 mr-2"}`}>
      <div className="relative">
        <input 
          type="text" 
          placeholder="Search users..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => { if (query.trim()) setIsOpen(true); }}
          onBlur={() => setTimeout(() => setIsOpen(false), 200)}
          className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 text-sm rounded-full pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium placeholder-zinc-400"
        />
        <svg className="w-4 h-4 absolute left-3.5 top-2.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        {isSearching && (
          <div className="absolute right-3 top-2.5">
            <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}
      </div>

      {isOpen && (
        <div className={`absolute mt-2 w-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl overflow-hidden z-50 transition-all ${isMobile ? 'static mt-4' : ''}`}>
          {results.length > 0 ? (
            <div className="max-h-60 overflow-y-auto py-1">
              {results.map((u) => (
                <a 
                  key={u.id} 
                  href={`/users/${u.username}`}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 transition-colors"
                >
                  {u.avatar ? (
                    <img src={u.avatar} alt={u.username} className="w-8 h-8 rounded-full object-cover shadow-sm" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-700 dark:text-indigo-300 font-extrabold text-xs uppercase shadow-sm">
                      {u.username.substring(0, 2)}
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tracking-tight">{u.username}</span>
                    {u.role === "ADMIN" && <span className="text-[10px] uppercase font-bold text-red-500 tracking-widest mt-0.5">Admin</span>}
                  </div>
                </a>
              ))}
            </div>
          ) : !isSearching && query.trim() ? (
            <div className="px-4 py-3 text-sm text-zinc-500 font-medium text-center">No users found.</div>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user));
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isMobileMenuOpen]);

  // Don't render the navbar on the home page (it has its own embedded nav)
  if (pathname === "/") return null;

  return (
    <header className="w-full flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm relative z-40">
      {/* Home link */}
      <div className="flex-1 flex justify-start">
        <a
          href="/"
          className="text-indigo-700 dark:text-indigo-300 font-extrabold text-lg tracking-tight shrink-0 flex items-center"
        >
          SportsDeck
        </a>
      </div>

      {/* Desktop Section links */}
      <nav className="hidden lg:flex flex-wrap gap-2 justify-center px-4 shrink-0">
        {NAV_LINKS.map(({ href, label, color }) => {
          if (href === "/moderation" && user?.role !== "ADMIN") return null;
          return (
            <a
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-white text-sm font-semibold shadow transition flex-shrink-0 ${color} ${pathname.startsWith(href) ? "ring-2 ring-offset-1 ring-white/60" : ""
                }`}
            >
              {label}
            </a>
          );
        })}
        {user && (
          <a
            href={`/users/${user.username}`}
            className={`px-4 py-2 rounded-lg text-white text-sm font-semibold shadow transition flex-shrink-0 bg-gray-700 hover:bg-gray-800 ${pathname.startsWith(`/users/${user.username}`) ? "ring-2 ring-offset-1 ring-white/60" : ""}`}
          >
            Public Profile
          </a>
        )}
      </nav>

      {/* Desktop Auth & Mobile Menu Toggle */}
      <div className="flex-1 flex justify-end gap-2 items-center shrink-0">
        {/* Desktop Auth */}
        <div className="hidden lg:flex gap-2 items-center">
          <SearchBar />
          {user ? (
            <>
              <a href="/logout" className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-semibold shadow hover:bg-black transition flex items-center mr-1">
                Logout
              </a>
              <a 
                href="/profile" 
                className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-extrabold text-sm uppercase shadow hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 hover:ring-offset-white dark:hover:ring-offset-zinc-900 transition-all overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700"
                title="Edit your profile"
              >
                {user.avatar ? (
                  <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                  (user.username || user.email || "?").substring(0, 2)
                )}
              </a>
            </>
          ) : (
            <>
              <a href="/login" className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-semibold shadow hover:bg-black transition">Login</a>
              <a href="/signup" className="px-4 py-2 rounded-lg bg-zinc-800 text-white text-sm font-semibold shadow hover:bg-black transition">Sign Up</a>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button
          className="lg:hidden p-2 -mr-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Side Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Side Menu */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-zinc-900 shadow-xl overflow-y-auto overscroll-none transform transition-transform duration-300 ease-in-out lg:hidden flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
          }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 sticky top-0 bg-white dark:bg-zinc-900 z-10">
          <span className="text-indigo-700 dark:text-indigo-300 font-extrabold text-lg tracking-tight shrink-0">
            Menu
          </span>
          <button
            className="p-2 -mr-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
            onClick={() => setIsMobileMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 p-4 flex flex-col gap-3">
          <SearchBar isMobile={true} />
          {NAV_LINKS.map(({ href, label, color }) => {
            if (href === "/moderation" && user?.role !== "ADMIN") return null;
            return (
              <a
                key={href}
                href={href}
                className={`px-4 py-3 rounded-lg text-white text-sm font-semibold shadow transition ${color} ${pathname.startsWith(href) ? "ring-2 ring-offset-1 ring-white/60" : ""
                  }`}
                onClick={() => setIsMobileMenuOpen(false)}
              >
                {label}
              </a>
            );
          })}
          {user && (
            <a
              href={`/users/${user.username}`}
              className={`px-4 py-3 rounded-lg text-white text-sm font-semibold shadow transition bg-gray-700 hover:bg-gray-800 ${pathname.startsWith(`/users/${user.username}`) ? "ring-2 ring-offset-1 ring-white/60" : ""}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              Public Profile
            </a>
          )}
        </div>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2 sticky bottom-0 bg-white dark:bg-zinc-900 z-10">
          {user ? (
            <>
            <div className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800">
              <a 
                href="/profile" 
                className="flex items-center gap-3 hover:opacity-80 transition"
              >
                <div className="w-10 h-10 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center text-indigo-700 dark:text-indigo-400 font-extrabold text-sm uppercase shadow-sm overflow-hidden shrink-0 border border-zinc-300 dark:border-zinc-600">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.username} className="w-full h-full object-cover" />
                  ) : (
                    (user.username || user.email || "?").substring(0, 2)
                  )}
                </div>
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100 truncate max-w-[120px]">
                  {user.username}
                </span>
              </a>
              <a href="/logout" className="p-2.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition" title="Logout">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </a>
            </div>
            </>
          ) : (
            <>
              <a href="/login" className="px-4 py-3 text-center rounded-lg bg-zinc-800 text-white text-sm font-semibold shadow hover:bg-black transition">Login</a>
              <a href="/signup" className="px-4 py-3 text-center rounded-lg bg-zinc-800 text-white text-sm font-semibold shadow hover:bg-black transition">Sign Up</a>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
