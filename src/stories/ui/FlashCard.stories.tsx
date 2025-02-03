import type { Meta, StoryObj } from '@storybook/react';
import { FlashCard } from '@/components/ui/flashcard/FlashCard';

const meta: Meta<typeof FlashCard> = {
  title: 'UI/FlashCard',
  component: FlashCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof FlashCard>;

export const TextOnly: Story = {
  args: {
    frontContent: 'What is the capital of France?',
    backContent: 'Paris',
    isFlipped: false,
  },
};

export const TextOnlyFlipped: Story = {
  args: {
    frontContent: 'What is the capital of France?',
    backContent: 'Paris',
    isFlipped: true,
  },
};

export const WithImages: Story = {
  args: {
    frontContent: 'Which cat is this?',
    backContent: 'This is Neo!',
    frontImage: 'https://placecats.com/300/200',
    backImage: 'https://placecats.com/neo/300/200',
    isFlipped: false,
  },
};

export const LongText: Story = {
  args: {
    frontContent: 'Explain the concept of React hooks and why they were introduced.',
    backContent: 'React hooks were introduced in React 16.8 to allow you to use state and other React features without writing a class component. They help in reusing stateful logic between components, making the code more readable and reducing the complexity of your components.',
    isFlipped: false,
  },
}; 