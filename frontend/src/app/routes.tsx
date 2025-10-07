import React, { useState, useLayoutEffect, Suspense } from "react";
import { Routes, Route, Navigate, useLocation, Location, useParams } from "react-router-dom";
import Login from "../dashboard/features/auth/Login/Login";
import Register from "../dashboard/features/auth/Register/Register";
import EmailVerification from "@/dashboard/features/auth/email-verification/EmailVerification";
import EmailChangeVerification from "../dashboard/features/auth/email-verification/EmailChange";
import ForgotPassword from "../dashboard/features/auth/forgot-password/ForgotPassword";
import WorkPost from "../pages/works/workpage/WorkPost";
import GalleryPage from "../dashboard/project/features/gallery/GalleryPage";
import { AnimatePresence, motion, Variants } from "framer-motion";
import ProtectedRoute from "./contexts/ProtectedRoute";
import { ErrorBoundary } from "./ErrorBoundary";
import { useData } from "@/app/contexts/useData";
import NotFound from "../shared/ui/404";
import TermsAndPrivacy from "../pages/TermsAndPrivacy/TermsAndPrivacy";
import { Home } from "../pages/home/home";
import { Works } from "../pages/works/showcase";

import Spinner from "../shared/ui/Spinner";
import { hqRoutes } from "@/hq/routes";

const Dashboard = React.lazy(() => import("../dashboard/home/pages/DashboardLayout"));
const DashboardWelcome = React.lazy(() => import("../dashboard/home/pages/DashboardHome"));
const DashboardNewProject = React.lazy(() => import("@/dashboard/NewProject/NewProject"));
const DashboardSingleProject = React.lazy(() => import("@/dashboard/project/project"));
const DashboardBudgetPage = React.lazy(() => import("../dashboard/project/features/budget/pages/BudgetPage"));
const DashboardCalendarPage = React.lazy(() => import("@/dashboard/project/features/calendar/calendar"));
const DashboardEditorPage = React.lazy(() => import("@/dashboard/project/features/editor/pages/editorpage"));
const DashboardMoodboardPage = React.lazy(() => import("@/dashboard/project/features/moodboard/pages/MoodboardPage"));
const DashboardTasksPage = React.lazy(() => import("../dashboard/home/pages/TasksListPage"));

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

const LegacyHQRedirect: React.FC = () => {
  const location = useLocation();
  const remainder = location.pathname.slice(3); // remove "/hq"
  const normalizedRemainder = remainder.startsWith("/") || remainder.length === 0
    ? remainder
    : `/${remainder}`;
  const targetPath = `/dashboard${normalizedRemainder}`;

  return <Navigate to={`${targetPath}${location.search}${location.hash}`} replace />;
};

const LegacyDashboardProjectsRedirect: React.FC<{ to: string }> = ({ to }) => {
  const location = useLocation();
  return <Navigate to={`${to}${location.search}${location.hash}`} replace />;
};

const LegacyDashboardMessagesRedirect: React.FC = () => {
  const location = useLocation();
  const { userSlug } = useParams<{ userSlug?: string }>();
  const basePath = "/dashboard/projects/messages";
  const target = userSlug ? `${basePath}/${userSlug}` : basePath;

  return <Navigate to={`${target}${location.search}${location.hash}`} replace />;
};

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

        <Route path="/hq/*" element={<LegacyHQRedirect />} />
        
        <Route
          path="/gallery/:projectId/:gallerySlug"
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
          path="/dashboard/tasks"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects/tasks" />}
        />
        <Route
          path="/dashboard/notifications"
          element={
            <LegacyDashboardProjectsRedirect to="/dashboard/projects/notifications" />
          }
        />
        <Route
          path="/dashboard/messages"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects/messages" />}
        />
        <Route path="/dashboard/messages/:userSlug" element={<LegacyDashboardMessagesRedirect />} />
        <Route
          path="/dashboard/collaborators"
          element={
            <LegacyDashboardProjectsRedirect to="/dashboard/projects/collaborators" />
          }
        />
        <Route
          path="/dashboard/settings"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects/settings" />}
        />
        <Route
          path="/dashboard/new"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects/new" />}
        />
        <Route
          path="/dashboard/welcome/*"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects" />}
        />
        <Route
          path="/dashboard/projects-overview"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects" />}
        />
        <Route
          path="/dashboard/allprojects/*"
          element={<LegacyDashboardProjectsRedirect to="/dashboard/projects/allprojects" />}
        />
        <Route
          path="/dashboard/*"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        >
          {hqRoutes.map((route) =>
            route.path === "" ? (
              <Route key="hq-index" index element={route.element} />
            ) : (
              <Route key={`hq-${route.path}`} path={route.path} element={route.element} />
            )
          )}
          <Route
            path="projects/:projectId/:projectName?"
            element={<DashboardSingleProject key={location.key} />}
          />
          <Route
            path="projects/:projectId/:projectName?/budget"
            element={<DashboardBudgetPage />}
          />
          <Route
            path="projects/:projectId/:projectName?/calendar"
            element={<DashboardCalendarPage />}
          />
          <Route
            path="projects/:projectId/:projectName?/moodboard"
            element={<DashboardMoodboardPage />}
          />
          <Route
            path="projects/:projectId/:projectName?/editor"
            element={<DashboardEditorPage />}
          />
          <Route path="projects/tasks" element={<DashboardTasksPage />} />
          <Route path="projects/new" element={<DashboardNewProject />} />
          <Route path="projects" element={<DashboardWelcome />} />
          <Route path="projects/allprojects" element={<DashboardWelcome />} />
          <Route path="projects/*" element={<DashboardWelcome />} />
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












