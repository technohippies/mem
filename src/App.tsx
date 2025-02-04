import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/components/pages/HomePage';
import { DeckPage } from '@/components/pages/DeckPage';
import { StudyPage } from '@/components/pages/StudyPage';
import { Toaster } from './components/ui/toast/Toaster';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decks/:stream_id" element={<DeckPage />} />
        <Route path="/study/:stream_id" element={<StudyPage />} />
      </Routes>
      <Toaster />
    </Router>
  );
}

export default App; 