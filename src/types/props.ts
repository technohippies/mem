import type { ReactNode } from 'react';
import type { Deck, FlashCard, StudyState, CardRating } from './models';

// Common props
export interface BaseProps {
  className?: string;
  children?: ReactNode;
}

// Card component props
export interface FlashCardProps extends BaseProps {
  card: FlashCard;
  state: StudyState;
  onFlip: () => void;
  onRate?: (rating: CardRating) => void;
  showProgress?: boolean;
}

// Deck list and grid props
export interface DeckGridProps extends BaseProps {
  decks: Deck[];
  onDeckClick: (deck: Deck) => void;
}

export interface DeckCardProps extends BaseProps {
  deck: Deck;
  onClick?: (deck: Deck) => void;
  showStats?: boolean;
}

// Study interface props
export interface StudyInterfaceProps extends BaseProps {
  deckId: string;
  onComplete?: () => void;
  onExit?: () => void;
}

// Navigation props
export interface NavBarProps extends BaseProps {
  onCreateDeck?: () => void;
  onProfile?: () => void;
  onSearch?: (query: string) => void;
}

// Form props
export interface DeckFormProps extends BaseProps {
  initialValues?: Partial<Deck>;
  onSubmit: (values: Partial<Deck>) => void;
  isLoading?: boolean;
}

export interface CardFormProps extends BaseProps {
  deckId: string;
  initialValues?: Partial<FlashCard>;
  onSubmit: (values: Partial<FlashCard>) => void;
  isLoading?: boolean;
}

// Button variants
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'link';

// Button props
export interface ButtonProps extends BaseProps {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
} 