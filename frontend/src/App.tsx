// @ts-nocheck
import React, { Suspense, lazy, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const MoodRoom = lazy(() => import('./pages/MoodRoom'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));

const queryClient = new QueryClient();

const DEFAULT_GUEST_PROFILE = {
    name: "Guest Listener",
    email: "guest@musicmirror.ai",
    genre: "Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"],
};

class ErrorBoundary extends Component {
    state = { hasError: false, error: null };
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error("Music Mirror App Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: '#08080f', color: '#e2e8f0', fontFamily: 'Outfit, sans-serif', padding: '24px', textCenter: 'center'
                }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: '#a855f7' }}>🪞 Music Mirror V2</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '20px', maxWidth: '400px', textAlign: 'center' }}>
                        Something unexpected happened while rendering. Let's restart your session.
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false }); window.location.href = '/room'; }}
                        style={{
                            padding: '12px 24px', background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
                            border: 'none', borderRadius: '999px', color: '#fff', fontWeight: 'bold', cursor: 'pointer'
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
                    <Suspense fallback={
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#08080f', color: '#a855f7', fontFamily: 'Outfit, sans-serif' }}>
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
                            <Route path="/summary" element={
                                <ProtectedRoute>
                                    <SummaryPage />
                                </ProtectedRoute>
                            } />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                </BrowserRouter>
            </ErrorBoundary>
        </QueryClientProvider>
    );
}
