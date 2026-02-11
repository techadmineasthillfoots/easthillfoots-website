
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Church, Home, Calendar, Menu, X, Shield, Contact } from 'lucide-react';
import { UserRole, Feedback, ContactRequest } from '../types';
import FeedbackButton from './FeedbackButton';
import ContactUsButton from './ContactUsButton';
import { DEFAULT_GOOGLE_SHEETS_URL } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  userRole: UserRole;
  onFeedbackSubmitted?: (feedback: Feedback) => void;
  onSaveRequest?: (request: ContactRequest) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, userRole, onFeedbackSubmitted, onSaveRequest }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const location = useLocation();
  
  const googleSheetsUrl = localStorage.getItem('church_google_sheets_url') || DEFAULT_GOOGLE_SHEETS_URL || '';

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dollar', path: '/dollar', icon: Church },
    { name: 'Muckhart', path: '/muckhart', icon: Church },
    { name: 'Events', path: '/events', icon: Calendar },
    { name: 'Contacts', path: '/contacts', icon: Contact },
    // Always show Admin link so users can reach the login page
    { name: 'Admin', path: '/admin', icon: Shield },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar - Full Width */}
      <header className="sticky top-0 z-50 w-full bg-indigo-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 md:h-20">
            {/* Branding */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="bg-indigo-800 p-2 rounded-xl group-hover:bg-indigo-700 transition-colors">
                <Church className="w-6 h-6 md:w-8 md:h-8 text-indigo-100" />
              </div>
              <h1 className="font-serif text-lg md:text-xl font-bold tracking-tight leading-tight">
                East Hillfoots <span className="hidden sm:inline text-indigo-300">Church of Scotland</span>
              </h1>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-white text-indigo-900 shadow-sm scale-105' 
                        : 'text-indigo-100 hover:bg-indigo-800 hover:text-white'}
                    `}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            {/* Role indicator (Desktop) */}
            <div className="hidden md:flex items-center ml-4 pl-4 border-l border-indigo-800">
              <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-xs uppercase shadow-inner border border-indigo-400">
                {userRole[0]}
              </div>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-indigo-800 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {isOpen && (
          <div className="md:hidden bg-indigo-950 border-t border-indigo-800 animate-in slide-in-from-top duration-300">
            <div className="px-4 py-6 space-y-2">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsOpen(false)}
                    className={`
                      flex items-center space-x-4 px-4 py-3 rounded-xl transition-all
                      ${isActive ? 'bg-indigo-600 text-white' : 'text-indigo-100 hover:bg-indigo-800'}
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
            <div className="p-4 bg-indigo-900 border-t border-indigo-800 flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white uppercase">
                {userRole[0]}
              </div>
              <div>
                <p className="text-sm font-semibold">{userRole}</p>
                <p className="text-xs text-indigo-300">Current Session</p>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area - Full screen width by default */}
      <main className="flex-1 w-full bg-slate-50 flex flex-col">
        {children}
        
        <footer className="mt-auto py-12 border-t bg-white px-4 md:px-8">
          <div className="max-w-7xl mx-auto text-center space-y-4">
            <p className="text-slate-500 text-sm">© {new Date().getFullYear()} East Hillfoots Church of Scotland - Registered Charity Number SC009713. Serving Dollar and Muckhart.</p>
            <div className="flex justify-center space-x-6 text-slate-400 text-xs uppercase tracking-widest">
              <span>Worship</span>
              <span>•</span>
              <span>Community</span>
              <span>•</span>
              <span>Fellowship</span>
            </div>
          </div>
        </footer>
      </main>

      {/* Global Action Buttons */}
      <FeedbackButton googleSheetsUrl={googleSheetsUrl} onFeedbackSubmitted={onFeedbackSubmitted} />
      <ContactUsButton googleSheetsUrl={googleSheetsUrl} onSaveRequest={onSaveRequest} />
    </div>
  );
};

export default Layout;
