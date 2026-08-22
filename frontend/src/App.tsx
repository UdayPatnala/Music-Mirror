/**
 * ============================================================================
 * B.Tech CSE Final Year Project — Music Mirror (Stage 4 Submission)
 * Originally developed by: Student 4 (Roll: 1601-22-733-112) - April 2026
 * ----------------------------------------------------------------------------
 * Contribution: Set up original React Router layout routes, page imports,
 * and base theme mappings.
 * ============================================================================
 * Solo Upgrades (Student Project Lead - Month 7):
 *  - Added React.lazy code-splitting and Suspense wrappers for better loading
 *    performance.
 *  - Added standard Guest Profile setup and a production-grade Error Boundary.
 * ============================================================================
 */

import React, { Suspense, Component } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { NetworkStatusIndicator } from './components/NetworkStatusIndicator';

const LandingPage   = React.lazy(() => import('./pages/LandingPage'));
const MoodRoom      = React.lazy(() => import('./pages/MoodRoom'));
const SummaryPage   = React.lazy(() => import('./pages/SummaryPage'));
const ProfilePage   = React.lazy(() => import('./pages/ProfilePage'));
const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));

const DEFAULT_GUEST_PROFILE = {
    name: "Guest Listener",
    email: "guest@musicmirror.ai",
    genre: "Telugu Pop",
    goal: "Match my mood",
    languages: ["Telugu", "English", "Tamil", "Hindi"],
};

/* ── Error Boundary ─────────────────────────────── */
interface EBProps { children: React.ReactNode; }
interface EBState { hasError: boolean; error: Error | null; }

class ErrorBoundary extends Component<EBProps, EBState> {
    state: EBState = { hasError: false, error: null };
    static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("Music Mirror Error:", error, info);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', background: '#F8FAFC', color: '#172033',
                    fontFamily: 'Outfit, sans-serif', padding: '24px', textAlign: 'center'
                }}>
                    <h2 style={{ fontSize: '1.8rem', marginBottom: '12px', color: '#4F46E5' }}>🪞 Music Mirror</h2>
                    <p style={{ color: '#475569', marginBottom: '20px', maxWidth: '400px' }}>
                        Something unexpected happened. Let's restart your session.
                    </p>
                    <button
                        onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/'; }}
                        style={{
                            padding: '12px 28px', background: '#4F46E5',
                            border: 'none', borderRadius: '999px', color: '#fff',
                            fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer'
                        }}
                    >
                        Restart
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

/* ── Protected Route — ensures guest profile exists ─ */
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const profile    = useAppStore(s => s.profile);
    const setProfile = useAppStore(s => s.setProfile);

    React.useEffect(() => {
        if (!profile) setProfile(DEFAULT_GUEST_PROFILE);
    }, [profile, setProfile]);

    return <>{children}</>;
};

const Loading = (
    <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', background: '#F8FAFC',
        color: '#4F46E5', fontFamily: 'Outfit, sans-serif',
        fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em'
    }}>
        Loading Music Mirror…
    </div>
);

/* ── App ──────────────────────────────────────────── */
export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <div className="app-shell" style={{ position: 'relative', minHeight: '100vh' }}>
                    <Suspense fallback={Loading}>
                        <Routes>
                            <Route path="/"          element={<LandingPage />} />
                            <Route path="/room"      element={<ProtectedRoute><MoodRoom /></ProtectedRoute>} />
                            <Route path="/profile"   element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
                            <Route path="/summary"   element={<ProtectedRoute><SummaryPage /></ProtectedRoute>} />
                            <Route path="/auth"      element={<Navigate to="/profile" replace />} />
                            <Route path="*"          element={<Navigate to="/" replace />} />
                        </Routes>
                    </Suspense>
                    <NetworkStatusIndicator />
                </div>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
