import { useEffect, type ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import AIChatbot from './components/AIChatbot';
import { ToastProvider, useToast } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';
import LandingPage from './pages/Landing';
import LoginPage from './pages/auth/Login';
import SignupPage from './pages/auth/Signup';
import ForgotPasswordPage from './pages/auth/ForgotPassword';
import DashboardPage from './pages/Dashboard';
import CoursesPage from './pages/Courses';
import CourseDetailPage from './pages/CourseDetail';
import ChatPage from './pages/Chat';
import QuizPage from './pages/Quiz';
import CodeLabPage from './pages/CodeLab';
import VideosPage from './pages/Videos';
import VideoPlayerPage from './pages/VideoPlayer';
import ProgressPage from './pages/Progress';
import NotesPage from './pages/Notes';
import SearchPage from './pages/Search';
import SettingsPage from './pages/settings/Settings';
import AdminPage from './pages/Admin';
import AdminAgentPage from './pages/AdminAgent';
import FlashcardsPage from './pages/Flashcards';
import ConceptMapPage from './pages/ConceptMap';
import ExamPrepPage from './pages/ExamPrep';
import SocraticPage from './pages/Socratic';
import JoinCoursePage from './pages/JoinCourse';
import NotFoundPage from './pages/NotFound';
import LegalPage from './pages/Legal';
import { useAuthStore } from './stores/auth.store';
import './stores/settings.store'; // Initialize settings (theme/font) on load

function SessionWatcher() {
  const clearSession = useAuthStore((s) => s.clearSession);
  const { showToast } = useToast();
  useEffect(() => {
    const onAuthExpired = () => {
      showToast('Your session has expired. Please sign in again.', 'error');
      setTimeout(() => clearSession(), 1500);
    };
    window.addEventListener('saarthi:auth-expired', onAuthExpired);
    return () => window.removeEventListener('saarthi:auth-expired', onAuthExpired);
  }, [clearSession, showToast]);
  return null;
}

function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <BrowserRouter>
      <ToastProvider>
      <SessionWatcher />
      <ErrorBoundary>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/join" element={<JoinCoursePage />} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/signup" element={<PublicOnly><SignupPage /></PublicOnly>} />
        <Route path="/forgot-password" element={<PublicOnly><ForgotPasswordPage /></PublicOnly>} />

        {/* App Routes (with Sidebar + Topbar layout) */}
        <Route element={<ProtectedLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:id" element={<CourseDetailPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/quiz" element={<QuizPage />} />
          <Route path="/code-lab" element={<CodeLabPage />} />
          <Route path="/code-lab/:id" element={<CodeLabPage />} />
          <Route path="/videos" element={<VideosPage />} />
          <Route path="/videos/:id" element={<VideoPlayerPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/concept-map" element={<ConceptMapPage />} />
          <Route path="/exam-prep" element={<ExamPrepPage />} />
          <Route path="/socratic" element={<SocraticPage />} />
        </Route>

        {/* Admin Routes (standalone, no AppShell) */}
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/admin/:agentKey" element={<AdminAgentPage />} />

        {/* Legal */}
        <Route path="/legal/:type" element={<LegalPage />} />

        {/* Fallback */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Global Floating AI Chatbot - visible on all pages */}
      <AIChatbot />
      </ErrorBoundary>
      </ToastProvider>
    </BrowserRouter>
  );
}

function ProtectedLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  if (isRestoring) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppShell />;
}

function PublicOnly({ children }: { children: ReactElement }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isRestoring = useAuthStore((s) => s.isRestoring);
  if (isRestoring) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

export default App;
