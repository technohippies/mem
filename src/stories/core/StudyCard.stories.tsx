import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { StudyCard } from '@/components/core/StudyCard';

const meta: Meta<typeof StudyCard> = {
  title: 'Core/StudyCard',
  component: StudyCard,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof StudyCard>;

export const Default: Story = {
  args: {
    front: 'What is the capital of France?',
    back: 'Paris',
    onAgain: () => console.log('Card moved back to deck'),
    onGood: () => console.log('Card marked as remembered'),
  },
};

export const WithImages: Story = {
  args: {
    front: 'Which cat is this?',
    back: 'This is Neo!',
    frontImage: 'https://placecats.com/300/200',
    backImage: 'https://placecats.com/neo/300/200',
    onAgain: () => console.log('Card moved back to deck'),
    onGood: () => console.log('Card marked as remembered'),
  },
};

export const LongContent: Story = {
  args: {
    front: 'Explain the concept of React hooks and why they were introduced.',
    back: 'React hooks were introduced in React 16.8 to allow you to use state and other React features without writing a class component. They help in reusing stateful logic between components, making the code more readable and reducing the complexity of your components.',
    onAgain: () => console.log('Card moved back to deck'),
    onGood: () => console.log('Card marked as remembered'),
  },
}; 