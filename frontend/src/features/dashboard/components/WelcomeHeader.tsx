import React, { useEffect, useState } from 'react';
import { User, Bell, Menu } from "lucide-react";
import { useData } from '@/app/contexts/useData';
import { useNavigate } from 'react-router-dom';
import { useAuth } from "@/app/contexts/useAuth";
import { useOnlineStatus } from '@/app/contexts/OnlineStatusContext';
import NotificationsDrawer from '../../../shared/ui/NotificationsDrawer';
import NavigationDrawer from '../../../shared/ui/NavigationDrawer';
import { useNotifications } from "../../../app/contexts/useNotifications";
import NavBadge from "../../../shared/ui/NavBadge";
import { GridPlus } from "../../../shared/icons/GridPlus";
import GlobalSearch from './GlobalSearch';
import './GlobalSearch.css';

const WelcomeHeader: React.FC<{ userName?: string; setActiveView?: (view: string) => void }> = ({ userName: propUserName, setActiveView }) => {
  const { userData } = useData();
  const { isOnline } = useOnlineStatus(); // <-- only need this now
  const navigate = useNavigate();

  const userName = propUserName || userData?.firstName || userData?.email || 'User';
  const userThumbnail = userData?.thumbnail;
  const userId = userData?.userId;

  // notifications drawer
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsPinned, setNotificationsPinned] = useState(false);

  // navigation drawer
  const [navigationOpen, setNavigationOpen] = useState(false);

  // notifications count
  const { notifications } = useNotifications();
  const unreadNotifications = notifications.filter((n) => !n.read).length;

  // online status (derived from presenceChanged events via OnlineStatusContext)
  const isUserOnline = !!userId && isOnline(String(userId));

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleHomeClick = () => navigate('/');
  const handleNotificationsToggle = () => setNotificationsOpen(!notificationsOpen);
  const handleNotificationsPinToggle = () => setNotificationsPinned(!notificationsPinned);
  const handleNavigationToggle = () => setNavigationOpen(!navigationOpen);

  const handleAvatarKeyDown: React.KeyboardEventHandler<HTMLDivElement | SVGElement | HTMLImageElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHomeClick();
    }
  };

  const handleLogoKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleHomeClick();
    }
  };

  const handleNotificationKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNotificationsToggle();
    }
  };

  const handleMenuKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleNavigationToggle();
    }
  };

  return (
    <>
      <div className="welcome-header-desktop">
        {/* Left: Logo + Hamburger */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            className="header-icon-btn"
            onClick={handleHomeClick}
            role="button"
            tabIndex={0}
            aria-label="Go to Home"
            onKeyDown={handleLogoKeyDown}
          >
            <div
              style={{
                width: isMobile ? '32px' : '40px',
                height: isMobile ? '32px' : '40px',
                borderRadius: '50%',
                border: '1px solid white',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: isMobile ? '14px' : '18px',
              }}
            >
              M!
            </div>
          </div>

          <div
            className="header-icon-btn"
            onClick={handleNavigationToggle}
            role="button"
            tabIndex={0}
            aria-label="Open navigation menu"
            onKeyDown={handleMenuKeyDown}
            style={{ cursor: 'pointer' }}
          >
            <Menu size={isMobile ? 20 : 24} color="white" />
          </div>
        </div>

        {/* Center: Global Search */}
        <div className="welcome-header-center">
          <GlobalSearch />
        </div>

        {/* Right: Create, Notifications, Avatar (+ online dot) */}
        <div className="welcome-header-right">
          <div
            className="nav-item-style"
            onClick={() => navigate("/dashboard/new")}
            title="Create New Project"
          >
            <GridPlus size={isMobile ? 20 : 26} color="white" />
          </div>

          <div
            className="nav-icon-wrapper nav-icon-style"
            onClick={handleNotificationsToggle}
            role="button"
            tabIndex={0}
            aria-label="Open notifications"
            onKeyDown={handleNotificationKeyDown}
          >
            <Bell size={isMobile ? 24 : 26} color="white" />
            <NavBadge count={unreadNotifications} label="notification" className="nav-bar-badge" />
          </div>

          <div style={{ position: 'relative' }}>
            {userThumbnail ? (
              <img
                src={userThumbnail}
                alt={`${userName}'s Thumbnail`}
                style={{
                  width: isMobile ? '32px' : '40px',
                  height: isMobile ? '32px' : '40px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  cursor: 'pointer',
                }}
                onClick={handleHomeClick}
                role="button"
                tabIndex={0}
                aria-label="Go to Home"
                onKeyDown={handleAvatarKeyDown}
              />
            ) : (
              <User
                size={isMobile ? 24 : 30}
                color="white"
                style={{
                  borderRadius: '50%',
                  backgroundColor: '#333',
                  cursor: 'pointer',
                  padding: isMobile ? '4px' : '5px',
                }}
                onClick={handleHomeClick}
                role="button"
                tabIndex={0}
                aria-label="Go to Home"
                onKeyDown={handleAvatarKeyDown}
              />
            )}

            {isUserOnline && (
              <div
                style={{
                  position: 'absolute',
                  top: isMobile ? '1px' : '2px',
                  right: isMobile ? '1px' : '2px',
                  width: isMobile ? '10px' : '12px',
                  height: isMobile ? '10px' : '12px',
                  borderRadius: '50%',
                  backgroundColor: '#00ff00',
                  border: '2px solid #000',
                }}
                aria-label="Online"
              />
            )}
          </div>
        </div>
      </div>

      <NotificationsDrawer
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        pinned={notificationsPinned}
        onTogglePin={handleNotificationsPinToggle}
      />

      {setActiveView && (
        <NavigationDrawer
          open={navigationOpen}
          onClose={() => setNavigationOpen(false)}
          setActiveView={setActiveView}
        />
      )}
    </>
  );
};

export default WelcomeHeader;
