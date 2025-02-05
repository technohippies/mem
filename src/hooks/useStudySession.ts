import { useState, useEffect } from 'react';
import type { Flashcard } from '@/types/models';
import { calculateFSRS, type FSRSInput, initializeCard } from '@/services/fsrs';
import { IDBStorage } from '@/services/storage/idb';

interface StudySessionState {
  cards: Flashcard[];
  currentIndex: number;
  showingCard: boolean;
  isLoading: boolean;
  totalCards: number;
  newCardsToday: number;
  reviewsToday: number;
  sessionComplete: boolean;
  isExtraStudy: boolean;
}

export function useStudySession(deckId: string, isInitialized: boolean = false) {
  const [state, setState] = useState<StudySessionState>({
    cards: [],
    currentIndex: 0,
    showingCard: true,
    isLoading: true,
    totalCards: 0,
    newCardsToday: 0,
    reviewsToday: 0,
    sessionComplete: false,
    isExtraStudy: false
  });

  const [storage, setStorage] = useState<IDBStorage | null>(null);
  const userId = 'user'; // TODO: Get from auth context

  // Initialize storage only once and wait for it to be ready
  useEffect(() => {
    let mounted = true;
    const initStorage = async () => {
      try {
        // Wait a bit to ensure any previous connections are closed
        await new Promise(resolve => setTimeout(resolve, 100));
        const instance = await IDBStorage.getInstance();
        if (mounted) {
          console.log('Storage initialized successfully in useStudySession');
          setStorage(instance);
        }
      } catch (error) {
        console.error('Failed to initialize storage in useStudySession:', error);
      }
    };
    initStorage();
    return () => { mounted = false; };
  }, []);

  const loadStudySession = async (isExtra: boolean = false) => {
    if (!storage || !deckId) return;
    
    console.log('Loading study session for deck:', deckId, isExtra ? '(extra study)' : '(regular study)');
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      // Get all cards for the deck to count total
      const allCards = await storage.getCardsForDeck(deckId);
      console.log('Total cards in deck:', allCards.length);

      // Get cards studied today
      const studiedToday = await storage.getCardsStudiedToday(userId, deckId);
      console.log('Cards studied today:', studiedToday.length);

      // Count new cards studied today
      const newCardsToday = (await Promise.all(
        studiedToday.map(async (cardId: string) => {
          const progress = await storage.getCardProgress(cardId, userId);
          return progress?.reps === 1;
        })
      )).filter(Boolean).length;

      console.log('New cards studied today:', newCardsToday);
      console.log('Reviews completed today:', studiedToday.length - newCardsToday);

      let dueCards: Flashcard[];
      if (isExtra) {
        // For extra study, get all cards that have been studied today
        dueCards = await storage.getAllDueCards(deckId, userId);
        console.log('Loading all studied cards for extra practice:', dueCards.length);
      } else {
        // For regular study, get new cards and due reviews
        const remainingNewCards = Math.max(0, 20 - newCardsToday);
        console.log('Remaining new cards allowed:', remainingNewCards);
        dueCards = await storage.getDueCards(deckId, userId, remainingNewCards);
      }
      console.log('Due cards loaded:', dueCards.length);

      // For extra study, we always start from the beginning
      // For regular study, we continue from where we left off
      const startIndex = isExtra ? 0 : (await storage.getLastStudiedIndex(userId, deckId));
      console.log('Starting at index:', startIndex);

      const sessionComplete = dueCards.length === 0 || (!isExtra && startIndex >= dueCards.length);
      console.log('Session complete:', sessionComplete);
      
      setState(prev => ({ 
        ...prev, 
        cards: dueCards,
        currentIndex: startIndex,
        showingCard: !sessionComplete,
        isLoading: false,
        totalCards: allCards.length,
        newCardsToday,
        reviewsToday: studiedToday.length - newCardsToday,
        sessionComplete,
        isExtraStudy: isExtra
      }));
    } catch (error) {
      console.error('Failed to load study session:', error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (storage && deckId && isInitialized) {
      loadStudySession(false);
    }
  }, [deckId, storage, isInitialized]);

  const handleGrade = async (grade: 1 | 3) => {
    if (!storage) return;

    const { cards, currentIndex, isExtraStudy } = state;
    const card = cards[currentIndex];
    if (!card) return;

    console.log('Grading card:', card.id, 'with grade:', grade, isExtraStudy ? '(extra study)' : '(regular study)');

    // Hide card immediately before processing
    setState(prev => ({ ...prev, showingCard: false }));

    try {
      // Get or initialize progress for this card
      let progress = await storage.getCardProgress(card.id, userId);
      const isNewCard = !progress;
      
      // Initialize new card or use existing progress
      const currentProgress = isNewCard ? initializeCard() : progress;
      
      if (isNewCard) {
        console.log('Initializing new card');
      }
      console.log('Card progress:', currentProgress);
      
      // Calculate FSRS parameters
      const fsrsInput: FSRSInput = {
        difficulty: currentProgress.difficulty,
        stability: currentProgress.stability,
        reps: currentProgress.reps,
        lapses: currentProgress.lapses,
        lastInterval: currentProgress.interval,
        timeSinceLastReview: currentProgress.review_date 
          ? Math.floor((Date.now() - new Date(currentProgress.review_date).getTime()) / (1000 * 60 * 60 * 24)) 
          : 0,
        grade
      };

      console.log('FSRS input:', fsrsInput);

      // Calculate new FSRS values
      const result = calculateFSRS(fsrsInput);
      console.log('FSRS result:', result);
      
      // Update progress in storage
      const updatedProgress = {
        ...result,
        review_date: new Date().toISOString()
      };
      await storage.updateCardProgress(card.id, userId, deckId, updatedProgress);
      console.log('Progress updated in storage');

      // Only update last studied index for regular study
      if (!isExtraStudy) {
        await storage.setLastStudiedIndex(userId, deckId, currentIndex);
        console.log('Last studied index updated:', currentIndex);
      }

      // Check if we've reached the end of the session
      const nextIndex = currentIndex + 1;
      // Session is complete when we've finished grading the current card and it's the last one
      const sessionComplete = currentIndex >= cards.length - 1;
      console.log('Current index:', currentIndex, 'Cards length:', cards.length, 'Session complete:', sessionComplete);

      // Move to next card and show it if not complete
      setState(prev => ({
        ...prev,
        currentIndex: nextIndex,
        showingCard: !sessionComplete,
        newCardsToday: !isExtraStudy && isNewCard ? prev.newCardsToday + 1 : prev.newCardsToday,
        reviewsToday: !isExtraStudy && !isNewCard ? prev.reviewsToday + 1 : prev.reviewsToday,
        sessionComplete
      }));
    } catch (error) {
      console.error('Failed to process grade:', error);
      // Show the current card again if there was an error
      setState(prev => ({ ...prev, showingCard: true }));
    }
  };

  const restartSession = async () => {
    console.log('Starting extra study session...');
    await loadStudySession(true);
  };

  return {
    currentCard: state.cards[state.currentIndex],
    showingCard: state.showingCard,
    isComplete: state.sessionComplete,
    isLoading: state.isLoading,
    newCardsToday: state.newCardsToday,
    reviewsToday: state.reviewsToday,
    totalCards: state.totalCards,
    isExtraStudy: state.isExtraStudy,
    onGrade: handleGrade,
    onRestart: restartSession,
    reloadSession: () => loadStudySession(state.isExtraStudy)
  };
} 