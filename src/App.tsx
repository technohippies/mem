import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage } from '@/components/pages/HomePage';
import { DeckPage } from '@/components/pages/DeckPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/decks/:slug" element={<DeckPage />} />
        {/* TODO: Add study route once implemented */}
        <Route path="/study/:slug" element={<div>Study page coming soon</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App; 