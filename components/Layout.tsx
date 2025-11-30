import React, { useState } from 'react';
import { useStore } from '../store';
import { Shield, Menu, X, Sun, Moon, AlertCircle, BarChart2, Map as MapIcon, Home, Mic } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom'; // Using wouter or similar in standard, but user asked for standard structure. We will assume react-router-dom is available or use a simple custom router if strictly no external deps, but prompt allows libraries. We will use HashRouter in App.tsx.
import { Button } from './ui/common';
import { motion, AnimatePresence } from 'framer-motion';
import { askSafetyAssistant } from '../services/gemini';

export const Navbar = () => {
  const { theme, toggleTheme } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <MapIcon size={18} /> },
    { name: 'Report', path: '/report', icon: <AlertCircle size={18} /> },
    { name: 'Leaderboard', path: '/leaderboard', icon: <BarChart2 size={18} /> },
    { name: 'News', path: '/news', icon: <Home size={18} /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center space-x-2">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-safety-500 to-trust-500 text-white">
            <Shield size={20} className="fill-current" />
            <span className="absolute -right-1 -top-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-alert-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-alert-500"></span>
            </span>
          </div>
          <span className="text-xl font-bold tracking-tight hidden sm:inline-block">CrowdGuard</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`text-sm font-medium transition-colors hover:text-primary flex items-center gap-2 ${isActive(link.path) ? 'text-primary font-bold' : 'text-muted-foreground'
                }`}
            >
              {link.icon}
              {link.name}
            </Link>
          ))}
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="ml-4">
            {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </Button>
          <Link to="/sos">
            <Button variant="destructive" className="animate-pulse shadow-[0_0_15px_rgba(229,57,53,0.5)]">
              SOS
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex md:hidden items-center space-x-2">
          <Link to="/sos">
            <Button variant="destructive" size="sm" className="mr-2">SOS</Button>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)}>
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </Button>
        </div>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-b bg-background"
          >
            <div className="flex flex-col space-y-4 p-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center space-x-2 text-sm font-medium ${isActive(link.path) ? 'text-primary' : 'text-muted-foreground'
                    }`}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </Link>
              ))}
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm font-medium">Theme</span>
                <Button variant="ghost" size="sm" onClick={toggleTheme}>
                  {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

export const AssistantFab = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!query.trim()) return;
    setLoading(true);
    const ans = await askSafetyAssistant(query);
    setResponse(ans);
    setLoading(false);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end space-y-4">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="w-80 rounded-xl border bg-card p-4 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <h4 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4 text-trust-500" /> Safety Assistant</h4>
              <Button size="sm" variant="ghost" onClick={() => setIsOpen(false)}><X className="w-4 h-4" /></Button>
            </div>
            <div className="space-y-3">
              {response ? (
                <div className="rounded bg-muted p-3 text-sm">
                  {response}
                  <button onClick={() => { setResponse(null); setQuery('') }} className="block mt-2 text-xs text-primary underline">Ask another</button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground">Ask AI about safety protocols, emergency numbers, or what to do in a crisis.</p>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="E.g., What if I see a fire?"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                    />
                    <Button size="icon" onClick={handleAsk} disabled={loading}>
                      {loading ? <span className="animate-spin">⌛</span> : <Mic size={16} />}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <Button
        size="lg"
        className="h-14 w-14 rounded-full shadow-lg bg-trust-500 hover:bg-trust-600 text-white"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Shield size={28} />
      </Button>
    </div>
  )
}

export const Footer = () => (
  <footer className="border-t py-6 md:py-0 bg-muted/20">
    <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row px-4 md:px-8">
      <div className="flex flex-col items-center gap-4 px-8 md:flex-row md:gap-2 md:px-0">
        <Shield className="h-6 w-6 text-primary" />
        <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
          Built by CrowdGuard Inc. for safer communities.
        </p>
      </div>
      <p className="text-center text-sm text-muted-foreground">
        &copy; 2025 CrowdGuard. All rights reserved.
      </p>
    </div>
  </footer>
);
