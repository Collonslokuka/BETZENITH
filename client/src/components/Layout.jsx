// src/components/Layout.jsx
import { Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Header from './Header';
import Footer from './Footer';
import Sidebar from './Sidebar';

export default function Layout({
  topLeagues,
  allSportsWithLeagues,
  quickAccess,
  openAllSports,
  toggleAllSports,
  handleLeagueClick
}) {
  const location = useLocation();

  // Pages where left sidebar should appear
  const sidebarPages = ['/', '/pre-match', '/live', '/dashboard', '/deposit', '/withdraw',
                        '/bet-history', '/bet-slip', '/favorites', '/my-bets', '/analytics',
                        '/terms', '/privacy', '/responsible-gaming', '/login', '/register', '/auth'];

  const showLeftSidebar = sidebarPages.includes(location.pathname);

  // Mobile drawer state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Auto-close the mobile drawer whenever the route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  return (
    <>
      <Header onOpenSidebar={() => setSidebarOpen(true)} />
      <div className="min-h-screen bg-[#0a0c14]">
        <div className="flex">
          {/* Mobile backdrop — only shows when the drawer is open */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/60 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />
          )}

          {/* Left Sidebar - ALWAYS VISIBLE on desktop, drawer on mobile */}
          <Sidebar
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            topLeagues={topLeagues}
            allSportsWithLeagues={allSportsWithLeagues}
            quickAccess={quickAccess}
            openAllSports={openAllSports}
            toggleAllSports={toggleAllSports}
            handleLeagueClick={handleLeagueClick}
          />

          {/* Main content - ml-64 only on desktop, no margin on mobile */}
          <main className="flex-1 ml-0 lg:ml-64 transition-all duration-300 min-w-0">
            <Outlet />
          </main>
        </div>
      </div>
      <Footer />
    </>
  );
}