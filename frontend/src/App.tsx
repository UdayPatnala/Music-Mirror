import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';
import GlobalPlayerHost from './components/GlobalPlayerHost';
import { BackgroundMusicPlayer } from './components/BackgroundMusicPlayer';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const MoodRoom = lazy(() => import('./pages/MoodRoom'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));

const queryClient = new QueryClient();

const DEFAULT_GUEST_PROFILE = {
    name: "Guest Listener",
    email: "guest@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"],
};

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { hasError: false, error: null };
    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("Music Mirror App Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: '#090909', color: '#FFFFFF', fontFamily: 'Outfit, sans-serif', padding: '24px', textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: '#D4AF37' }}>🪞 Music Mirror V2</h2>
                    <p style={{ color: '#B6B6B6', marginBottom: '20px', maxWidth: '400px', textAlign: 'center' }}>
                        Something unexpected happened while rendering. Let's restart your session.
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false }); window.location.href = '/room'; }}
                        style={{
                            padding: '12px 24px', background: 'linear-gradient(135deg, #D4AF37, #FF9966)',
                            border: 'none', borderRadius: '999px', color: '#000', fontWeight: 'bold', cursor: 'pointer'
                        }}
                    >
                        Reload Room
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const profile = useAppStore(state => state.profile);
    const setProfile = useAppStore(state => state.setProfile);

    React.useEffect(() => {
        if (!profile) {
            setProfile(DEFAULT_GUEST_PROFILE);
        }
    }, [profile, setProfile]);

    return <>{children}</>;
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <ErrorBoundary>
                <BrowserRouter>
                    <div className="app-shell" style={{ position: "relative", minHeight: "100vh" }}>
                        <Suspense fallback={
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#090909', color: '#D4AF37', fontFamily: 'Outfit, sans-serif' }}>
                                Loading AI Modules...
                            </div>
                        }>
                            <Routes>
                                <Route path="/" element={<LandingPage />} />
                                <Route path="/room" element={
                                    <ProtectedRoute>
                                        <MoodRoom />
                                    </ProtectedRoute>
                                } />
                                <Route path="/profile" element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                } />
                                <Route path="/dashboard" element={
                                    <ProtectedRoute>
                                        <DashboardPage />
                                    </ProtectedRoute>
                                } />
                                <Route path="/auth" element={
                                    <ProtectedRoute>
                                        <ProfilePage />
                                    </ProtectedRoute>
                                } />
                                <Route path="/summary" element={
                                    <ProtectedRoute>
                                        <SummaryPage />
                                    </ProtectedRoute>
                                } />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Suspense>
                        <GlobalPlayerHost />
                        <BackgroundMusicPlayer />
                    </div>
                </BrowserRouter>
            </ErrorBoundary>
        </QueryClientProvider>
    );
}
