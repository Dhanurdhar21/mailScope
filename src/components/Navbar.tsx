import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';
  const isHistory = location.pathname === '/history';
  const isCompare = location.pathname === '/compare';
  const isAppView = isDashboard || isHistory || isCompare;

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-[#E4E7EC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Mark */}
          <Link
            to="/"
            className="flex items-center gap-2.5 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#315EFB] rounded-lg p-1"
          >
            <div className="w-8 h-8 rounded-lg bg-[#315EFB] flex items-center justify-center text-white shadow-xs group-hover:bg-[#2447C7] transition-colors">
              <ShieldCheck className="w-5 h-5" strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold text-lg tracking-tight text-[#182230]">
                MailScope
              </span>
            </div>
            <span className="ml-1 text-[11px] font-medium tracking-wide uppercase px-1.5 py-0.5 rounded bg-[#F2F4F7] text-[#475467] border border-[#E4E7EC]">
              Analyzer
            </span>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#475467]">
            {!isAppView ? (
              <>
                <a
                  href="#overview"
                  className="hover:text-[#182230] transition-colors py-1 focus-visible:ring-1 focus-visible:ring-[#315EFB] rounded"
                >
                  Overview
                </a>
                <a
                  href="#how-it-works"
                  className="hover:text-[#182230] transition-colors py-1 focus-visible:ring-1 focus-visible:ring-[#315EFB] rounded"
                >
                  How It Works
                </a>
                <a
                  href="#capabilities"
                  className="hover:text-[#182230] transition-colors py-1 focus-visible:ring-1 focus-visible:ring-[#315EFB] rounded"
                >
                  Capabilities
                </a>
                <Link
                  to="/history"
                  className="hover:text-[#182230] transition-colors py-1 focus-visible:ring-1 focus-visible:ring-[#315EFB] rounded"
                >
                  History
                </Link>
                <Link
                  to="/compare"
                  className="hover:text-[#182230] transition-colors py-1 focus-visible:ring-1 focus-visible:ring-[#315EFB] rounded"
                >
                  Compare
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/dashboard"
                  className={`py-1 transition-colors ${
                    isDashboard
                      ? 'text-[#315EFB] font-semibold border-b-2 border-[#315EFB]'
                      : 'hover:text-[#182230]'
                  }`}
                >
                  Analyzer
                </Link>
                <Link
                  to="/history"
                  className={`py-1 transition-colors ${
                    isHistory
                      ? 'text-[#315EFB] font-semibold border-b-2 border-[#315EFB]'
                      : 'hover:text-[#182230]'
                  }`}
                >
                  History
                </Link>
                <Link
                  to="/compare"
                  className={`py-1 transition-colors ${
                    isCompare
                      ? 'text-[#315EFB] font-semibold border-b-2 border-[#315EFB]'
                      : 'hover:text-[#182230]'
                  }`}
                >
                  Compare
                </Link>
                <Link
                  to="/"
                  className="hover:text-[#182230] transition-colors py-1 text-xs text-[#667085]"
                >
                  Product Overview
                </Link>
              </>
            )}
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-3">
            {!isDashboard ? (
              <Link to="/dashboard">
                <Button
                  size="sm"
                  icon={<ArrowRight className="w-4 h-4" />}
                  iconPosition="right"
                >
                  Open Analyzer
                </Button>
              </Link>
            ) : (
              <Link to="/history">
                <Button variant="outline" size="sm">
                  View History
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-[#667085] hover:text-[#182230] hover:bg-[#F2F4F7] focus:outline-none focus:ring-2 focus:ring-[#315EFB]"
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E4E7EC] px-4 pt-3 pb-5 space-y-3 shadow-lg">
          <Link
            to="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-base font-medium ${
              isDashboard ? 'text-[#315EFB] font-semibold' : 'text-[#344054] hover:text-[#182230]'
            }`}
          >
            Analyzer Workspace
          </Link>
          <Link
            to="/history"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-base font-medium ${
              isHistory ? 'text-[#315EFB] font-semibold' : 'text-[#344054] hover:text-[#182230]'
            }`}
          >
            Analysis History
          </Link>
          <Link
            to="/compare"
            onClick={() => setMobileMenuOpen(false)}
            className={`block py-2 text-base font-medium ${
              isCompare ? 'text-[#315EFB] font-semibold' : 'text-[#344054] hover:text-[#182230]'
            }`}
          >
            Compare Batches
          </Link>
          <div className="pt-2 border-t border-[#F2F4F7]">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <Button variant="outline" className="w-full" size="md">
                Product Landing Page
              </Button>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
