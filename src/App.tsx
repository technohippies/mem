import { Brain } from '@phosphor-icons/react';

function App() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto py-8">
        <div className="flex items-center justify-center gap-4 text-4xl font-bold">
          <Brain weight="duotone" className="h-12 w-12" />
          <h1>Anki Farcaster</h1>
        </div>
      </main>
    </div>
  );
}

export default App; 