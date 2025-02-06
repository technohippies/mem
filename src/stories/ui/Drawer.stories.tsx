import type { Meta, StoryObj } from '@storybook/react';
import { Button } from '@/components/ui/button/Button';
import {
  Drawer,
  DrawerTrigger,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer/Drawer';

const meta: Meta<typeof Drawer> = {
  title: 'UI/Drawer',
  component: Drawer,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;
type Story = StoryObj<typeof Drawer>;

export const Default: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button variant="outline">Open Drawer</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Are you sure absolutely sure?</DrawerTitle>
          <DrawerDescription>
            This action cannot be undone. This will permanently delete your account
            and remove your data from our servers.
          </DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button>Submit</Button>
          <Button variant="outline">Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
};

export const WithCustomContent: Story = {
  render: () => (
    <Drawer>
      <DrawerTrigger asChild>
        <Button>View Profile</Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Profile Settings</DrawerTitle>
          <DrawerDescription>
            Manage your profile information and preferences.
          </DrawerDescription>
        </DrawerHeader>
        <div className="p-4">
          <div className="space-y-4">
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Personal Information</h4>
              <p className="text-sm text-muted-foreground">
                Update your photo and personal details here.
              </p>
            </div>
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-2">Privacy Settings</h4>
              <p className="text-sm text-muted-foreground">
                Choose what information is displayed on your profile.
              </p>
            </div>
          </div>
        </div>
        <DrawerFooter>
          <Button>Save Changes</Button>
          <Button variant="outline">Cancel</Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  ),
}; 