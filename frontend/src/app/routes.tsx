import React, { useState, useLayoutEffect, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, Location } from "react-router-dom";
import Login from "../features/auth/Login/Login";
import Register from "../features/auth/Register/Register";
import EmailVerification from "@/features/auth/email-verification/EmailVerification";
import EmailChangeVerification from "../features/auth/email-verification/EmailChange";
import ForgotPassword from "../features/auth/forgot-password/ForgotPassword";
import WorkPost from "../pages/works/workpage/WorkPost";
import GalleryPage from "../features/gallery/GalleryPage";
import { AnimatePresence, motion, Variants } from "framer-motion";
import ProtectedRoute from "./contexts/ProtectedRoute";
import { ErrorBoundary } from "./ErrorBoundary";
import { useData } from "@/app/contexts/useData";
import NotFound from "../shared/ui/404";
import TermsAndPrivacy from "../pages/TermsAndPrivacy/TermsAndPrivacy";
import { Home } from "../pages/home/home";
import { Works } from "../pages/works/showcase";

import Spinner from "../shared/ui/Spinner";

const Dashboard = React.lazy(() => import("../features/dashboard/pages/DashboardLayout"));
const DashboardWelcome = React.lazy(() => import("../features/dashboard/pages/DashboardHome"));
const DashboardNewProject = React.lazy(() => import("@/features/project/pages/NewProject"));
const DashboardSingleProject = React.lazy(() => import("@/features/project/pages/project"));
const DashboardBudgetPage = React.lazy(() => import("../features/budget/pages/BudgetPage"));
const DashboardCalendarPage = React.lazy(() => import("@/features/calendar/calendar"));
const DashboardEditorPage = React.lazy(() => import("@/features/editor/pages/editorpage"));

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();
  const { opacity, setOpacity } = useData();
  const opacityClass = opacity === 1 ? "opacity-low" : "opacity-high";
  const [prevPathname, setPrevPathname] = useState<string>("");
  
  useLayoutEffect(() => {
    const blogPostRouteRegex = /^\/blog\/[^/]+$/;
    const dmRouteRegex = /^\/dashboard(?:\/welcome)?\/messages\/[^/]+$/;
    const isBlogPost = blogPostRouteRegex.test(pathname);
    const wasBlogPost = blogPostRouteRegex.test(prevPathname);
    const isDM = dmRouteRegex.test(pathname);
    const wasDM = dmRouteRegex.test(prevPathname);
    const stayingInDashboard = pathname.startsWith("/dashboard") &&
      prevPathname.startsWith("/dashboard");
    const shouldAnimate = !isBlogPost && !wasBlogPost && !isDM && !wasDM && !stayingInDashboard;
    
    let timer: NodeJS.Timeout;
    
    if (shouldAnimate) {
      setOpacity(0);
      window.scrollTo(0, 0);
      timer = setTimeout(() => {
        setOpacity(1);
      }, 300);
    } else {
      setOpacity(1);
    }
    
    setPrevPathname(pathname);
    
    return () => {
      clearTimeout(timer);
      if (shouldAnimate) {
        setOpacity(0);
      }
    };
  }, [pathname, setOpacity, prevPathname]);
  
  return <div className={`page-fade ${opacityClass}`} />;
};

const pageVariants: Variants = {
  initial: { opacity: 0, y: "100vh" }, // changed from 100vw to 100vh
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: "100vh" }, // changed from -100vw to -100vh
};

const pageTransition = {
  type: "tween" as const,
  ease: "anticipate",
  duration: 1,
};

function AppRoutes(): React.ReactElement {
  const location = useLocation();
  
  return (
    <ErrorBoundary>
      <Suspense fallback={<Spinner />}>
        <ScrollToTop />
        <ActualRoutes location={location} />
      </Suspense>
    </ErrorBoundary>
  );
}

interface ActualRoutesProps {
  location: Location;
}

const ActualRoutes: React.FC<ActualRoutesProps> = ({ location }) => {
  
  return (
    <AnimatePresence mode="wait">
      <Routes key={location.pathname} location={location}>
        <Route 
          path="/" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Home />
            </motion.div>
          } 
        />
        

        
        <Route 
          path="/works" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Works />
            </motion.div>
          } 
        />
        
        <Route 
          path="/works/:workSlug" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <WorkPost />
            </motion.div>
          } 
        />
        
        <Route 
          path="/gallery/:projectSlug/:gallerySlug" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <GalleryPage projectId={undefined} />
            </motion.div>
          } 
        />
        
        <Route 
          path="/dashboard/*" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          <Route path="projects/:projectSlug" element={<DashboardSingleProject />} />
          <Route path="projects/:projectSlug/budget" element={<DashboardBudgetPage />} />
          <Route path="projects/:projectSlug/calendar" element={<DashboardCalendarPage />} />
          <Route path="projects/:projectSlug/editor" element={<DashboardEditorPage />} />
          <Route path="new" element={<DashboardNewProject />} />
          <Route path="welcome/*" element={<Navigate to=".." replace />} />
          <Route path="*" element={<DashboardWelcome />} />
        </Route>
        
        <Route 
          path="/login" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Login />
            </motion.div>
          } 
        />
        
        <Route 
          path="/register" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <Register />
            </motion.div>
          } 
        />
        
        <Route 
          path="/email-verification" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <EmailVerification registrationData={undefined} userEmail={undefined} />
            </motion.div>
          } 
        />
        
        <Route 
          path="/email-change-verification" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <EmailChangeVerification />
            </motion.div>
          } 
        />
        
        <Route 
          path="/forgot-password" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <ForgotPassword />
            </motion.div>
          } 
        />
        
        <Route 
          path="/terms-and-privacy" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <TermsAndPrivacy />
            </motion.div>
          } 
        />
        
        <Route 
          path="*" 
          element={
            <motion.div
              initial="initial"
              animate="in"
              exit="out"
              variants={pageVariants}
              transition={pageTransition}
            >
              <NotFound />
            </motion.div>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
