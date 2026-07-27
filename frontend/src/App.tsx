// @ts-nocheck
import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAppStore } from './store/useAppStore';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const MoodRoom = lazy(() => import('./pages/MoodRoom'));
const SummaryPage = lazy(() => import('./pages/SummaryPage'));

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const profile = useAppStore(state => state.profile);
    if (!profile) return <Navigate to="/" replace />;
    return <>{children}</>;
};

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <Suspense fallback={<div className="flex-center">Loading AI Modules...</div>}>
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
        </QueryClientProvider>
    );
}
