import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowRight, ShieldCheck } from 'lucide-react';
import { Button } from './Button';

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

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
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-[#475467]">
            {!isDashboard ? (
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
                <a
                  href="#classifications"
                  className="hover:text-[#182230] transition-colors py-1 focus-visible:ring-1 focus-visible:ring-[#315EFB] rounded"
                >
                  Classifications
                </a>
              </>
            ) : (
              <Link
                to="/"
                className="hover:text-[#182230] transition-colors py-1"
              >
                Back to Product Overview
              </Link>
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
              <Link to="/">
                <Button variant="outline" size="sm">
                  Exit to Landing
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
          {!isDashboard ? (
            <>
              <a
                href="#overview"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-[#344054] hover:text-[#182230]"
              >
                Overview
              </a>
              <a
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-[#344054] hover:text-[#182230]"
              >
                How It Works
              </a>
              <a
                href="#capabilities"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-[#344054] hover:text-[#182230]"
              >
                Capabilities
              </a>
              <a
                href="#classifications"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-base font-medium text-[#344054] hover:text-[#182230]"
              >
                Classifications
              </a>
              <div className="pt-2">
                <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full" size="md">
                    Open Analyzer
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <div className="pt-2">
              <Link to="/" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full" size="md">
                  Back to Landing Page
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
