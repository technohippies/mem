import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthWrapper } from './components/auth/AuthWrapper';
import { HomePage } from '@/components/pages/HomePage';
import { DeckPage } from '@/components/pages/DeckPage';
import { StudyPage } from '@/components/pages/StudyPage';
import { Toaster } from 'sonner';

const AppContent: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-neutral-900 text-neutral-100">
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/decks/:stream_id" element={<DeckPage />} />
          <Route path="/study/:stream_id" element={
            <AuthWrapper>
              <StudyPage />
            </AuthWrapper>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster position="top-center" />
    </div>
  );
};

export default AppContent; 