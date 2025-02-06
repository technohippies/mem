import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '../../components/ui/button/Button';

const meta: Meta<typeof Button> = {
  title: 'UI/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  render: () => <Button variant="default">Button</Button>,
};

export const Secondary: Story = {
  render: () => <Button variant="secondary">Button</Button>,
};

export const Destructive: Story = {
  render: () => <Button variant="destructive">Button</Button>,
};

export const Ghost: Story = {
  render: () => <Button variant="ghost">Button</Button>,
};

export const Link: Story = {
  render: () => <Button variant="link">Button</Button>,
}; 