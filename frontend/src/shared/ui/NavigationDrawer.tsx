import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Folder, Bell, MessageSquare, Settings, LogOut, Shield, Users, X } from 'lucide-react';
import { useAuth } from '@/app/contexts/useAuth';
import { useData } from '@/app/contexts/useData';
import { useNotifications } from '../../app/contexts/useNotifications';
import NavBadge from './NavBadge';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'aws-amplify/auth';
import Cookies from 'js-cookie';
import './navigation-drawer.css';
import { GridPlus } from '../icons/GridPlus';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
  setActiveView: (view: string) => void;
}

const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  open,
  onClose,
  setActiveView,
}) => {
  const { setIsAuthenticated, setCognitoUser } = useAuth();
  const { dmThreads } = useData();
  const { notifications } = useNotifications() as { notifications: Array<{ read?: boolean }>; };
  const navigate = useNavigate();

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const unreadMessages = dmThreads.filter((t) => t.read === false).length;

  const handleNavigation = (view: string) => {
    setActiveView(view);
    const base = "/dashboard";
    const path = view === "welcome" ? base : `${base}/${view}`;
    navigate(path);
    onClose(); // Close drawer after navigation
  };

  const handleCreateProject = () => {
    navigate("/dashboard/new");
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsAuthenticated(false);
      setCognitoUser(null);
      navigate("/login");
      Cookies.remove("myCookie");
      onClose();
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  const navigationItems = [
    {
      icon: <GridPlus size={24} color="white" />,
      label: "Create New Project",
      onClick: handleCreateProject,
      isAction: true,
    },
    {
      icon: <Home size={24} color="white" />,
      label: "Home",
      onClick: () => handleNavigation("welcome"),
    },
    {
      icon: <Folder size={24} color="white" />,
      label: "Projects",
      onClick: () => handleNavigation("projects"),
    },
    {
      icon: (
        <div className="nav-icon-wrapper">
          <Bell size={24} color="white" />
          <NavBadge count={unreadNotifications} label="notification" className="nav-drawer-badge" />
        </div>
      ),
      label: "Notifications",
      onClick: () => handleNavigation("notifications"),
      badge: unreadNotifications,
    },
    {
      icon: (
        <div className="nav-icon-wrapper">
          <MessageSquare size={24} color="white" />
          <NavBadge count={unreadMessages} label="message" className="nav-drawer-badge" />
        </div>
      ),
      label: "Messages",
      onClick: () => handleNavigation("messages"),
      badge: unreadMessages,
    },
    {
      icon: <Users size={24} color="white" />,
      label: "Collaborators",
      onClick: () => handleNavigation("collaborators"),
    },
  ];

  const bottomItems = [
    {
      icon: (
        <a
          href="/terms-and-privacy"
          target="_blank"
          rel="noopener noreferrer"
          style={{ textDecoration: "none" }}
        >
          <Shield size={24} color="white" />
        </a>
      ),
      label: "Terms & Privacy",
      onClick: () => {},
    },
    {
      icon: <Settings size={24} color="white" />,
      label: "Settings",
      onClick: () => handleNavigation("settings"),
    },
    {
      icon: <LogOut size={24} color="white" />,
      label: "Sign Out",
      onClick: handleSignOut,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="navigation-drawer-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          
          {/* Drawer */}
          <motion.div
            className="navigation-drawer"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className="navigation-drawer-header">
              <div
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  border: '2px solid white',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
                onClick={() => navigate('/')}
                role="button"
                tabIndex={0}
                aria-label="Go to Home"
              >
                M!
              </div>
              <button className="close-button" onClick={onClose}>
                <X size={24} color="white" />
              </button>
            </div>

            <div className="navigation-drawer-content">
              <div className="navigation-items">
                {navigationItems.map((item, index) => (
                  <div
                    key={index}
                    className={`nav-drawer-item ${item.isAction ? 'nav-drawer-action' : ''}`}
                    onClick={item.onClick}
                  >
                    <div className="nav-drawer-icon">
                      {item.icon}
                    </div>
                    <span className="nav-drawer-label">{item.label}</span>
                  </div>
                ))}
              </div>

              <div className="navigation-items-bottom">
                {bottomItems.map((item, index) => (
                  <div
                    key={index}
                    className="nav-drawer-item"
                    onClick={item.onClick}
                  >
                    <div className="nav-drawer-icon">
                      {item.icon}
                    </div>
                    <span className="nav-drawer-label">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NavigationDrawer;
