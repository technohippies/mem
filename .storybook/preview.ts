import type { Preview } from "@storybook/react";
import '../src/styles/global.css'; // Update this line
import React from 'react';
import { themes } from '@storybook/theming';

const preview: Preview = {
  parameters: {
    layout: 'fullscreen',
    actions: { argTypesRegex: "^on[A-Z].*" },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    darkMode: {
      dark: { ...themes.dark, appBg: 'black' },
      light: { ...themes.normal, appBg: 'white' },
      current: 'light', // Set the default theme to light
    },
    backgrounds: {
      default: 'light',
      values: [
        { name: 'light', value: '#ffffff' },
        { name: 'dark', value: '##18181b' },
      ],
    },
  },
  decorators: [
    (Story) => React.createElement('div', { className: 'dark:bg-neutral-800 dark:text-white' }, React.createElement(Story)),
  ],
  // Update initialGlobals to use object syntax
  initialGlobals: {

    locale: 'en',
  },
};

export default preview;
