import { useState, useEffect } from 'react';
import type { Flashcard } from '@/types/models';
import { calculateFSRS, initializeCard, type FSRSOutput } from '@/services/fsrs';
import { PouchStorage } from '@/services/storage/pouch';

interface StudySessionState {
  cards: Flashcard[];
  currentIndex: number;
  showAnswer: boolean;
  completed: boolean;
  progress: {
    reviewed: number;
    remaining: number;
    correct: number;
  };
}

interface StudySessionHook {
  state: StudySessionState;
  showAnswer: () => void;
  gradeCard: (grade: 1 | 3) => void; // 1: Again, 3: Good
  reset: () => void;
}

export function useStudySession(
  deckId: string,
  userId: string,
  maxNewCards: number = 20
): StudySessionHook {
  const [storage] = useState(() => new PouchStorage(userId));
  const [state, setState] = useState<StudySessionState>({
    cards: [],
    currentIndex: 0,
    showAnswer: false,
    completed: false,
    progress: {
      reviewed: 0,
      remaining: 0,
      correct: 0
    }
  });

  // Load cards on mount
  useEffect(() => {
    const loadCards = async () => {
      console.log(`Loading cards for deck ${deckId}...`);
      const cards = await storage.getDueCards(deckId, userId, maxNewCards);
      console.log(`Loaded ${cards.length} cards:`, cards);
      setState(prev => ({
        ...prev,
        cards,
        progress: {
          ...prev.progress,
          remaining: cards.length
        }
      }));
    };

    loadCards();
  }, [deckId, userId, maxNewCards, storage]);

  const showAnswer = () => {
    setState(prev => ({
      ...prev,
      showAnswer: true
    }));
  };

  const gradeCard = async (grade: 1 | 3) => {
    const currentCard = state.cards[state.currentIndex];
    console.log(`Grading card ${currentCard.id} with grade ${grade}`);
    
    // Calculate new FSRS values
    const lastProgress = await storage.getCardProgress(currentCard.id, userId);
    console.log('Previous progress:', lastProgress);
    
    const fsrsInput = lastProgress || initializeCard();
    console.log('FSRS input:', fsrsInput);
    
    const now = new Date();
    const timeSinceLastReview = lastProgress 
      ? Math.floor((now.getTime() - new Date(lastProgress.review_date).getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    const fsrsOutput = calculateFSRS({
      difficulty: fsrsInput.difficulty,
      stability: fsrsInput.stability,
      reps: fsrsInput.reps,
      lapses: fsrsInput.lapses,
      lastInterval: fsrsInput.interval,
      timeSinceLastReview,
      grade
    });
    
    console.log('FSRS output:', {
      ...fsrsOutput,
      nextReview: new Date(now.getTime() + fsrsOutput.interval * 24 * 60 * 60 * 1000).toISOString()
    });

    // Update progress in storage
    await storage.updateCardProgress(currentCard.id, userId, fsrsOutput);
    console.log('Progress updated in storage');

    // Update state
    setState(prev => {
      const newIndex = prev.currentIndex + 1;
      const completed = newIndex >= prev.cards.length;

      return {
        ...prev,
        currentIndex: newIndex,
        showAnswer: false,
        completed,
        progress: {
          reviewed: prev.progress.reviewed + 1,
          remaining: prev.cards.length - (prev.progress.reviewed + 1),
          correct: prev.progress.correct + (grade === 3 ? 1 : 0)
        }
      };
    });
  };

  const reset = () => {
    setState({
      cards: [],
      currentIndex: 0,
      showAnswer: false,
      completed: false,
      progress: {
        reviewed: 0,
        remaining: 0,
        correct: 0
      }
    });
  };

  return {
    state,
    showAnswer,
    gradeCard,
    reset
  };
} 