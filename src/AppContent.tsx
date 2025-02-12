import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { HomePage } from '@/components/pages/HomePage';
import { DeckPage } from '@/components/pages/DeckPage';
import { StudyPage } from '@/components/pages/StudyPage';
import { FrameTestPage } from '@/components/pages/FrameTestPage';
import { Toaster } from 'sonner';
import { InstallBanner } from './components/ui/pwa/InstallBanner';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100">
      <div className="flex flex-col min-h-screen">
        <InstallBanner />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route 
              path="/decks/:id" 
              element={
                <React.Suspense fallback={<div>Loading...</div>}>
                  <AuthWrapper>
                    <DeckPage />
                  </AuthWrapper>
                </React.Suspense>
              } 
            />
            <Route path="/study/:id" element={
              <AuthWrapper>
                <StudyPage />
              </AuthWrapper>
            } />
            <Route path="/frame/test" element={<FrameTestPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
      <Toaster position="top-center" />
    </div>
  );
};

export default AppContent; 