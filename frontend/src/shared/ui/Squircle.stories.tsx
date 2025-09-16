import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import Squircle from './Squircle';

const radii = [12, 16, 20, 24];
const smoothness = [0.4, 0.6, 0.8];

const meta: Meta<typeof Squircle> = {
  title: 'Shared/Squircle',
  component: Squircle,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
};

export default meta;

type Story = StoryObj<typeof Squircle>;

export const RadiusSmoothingMatrix: Story = {
  render: () => (
    <div
      style={{
        display: 'grid',
        gap: '1.5rem',
        gridTemplateColumns: `repeat(${smoothness.length + 1}, minmax(0, 1fr))`,
        alignItems: 'center',
        justifyItems: 'center',
        maxWidth: 'min(900px, 100%)',
      }}
    >
      <div />
      {smoothness.map((value) => (
        <strong key={`header-${value}`}>smoothing {value}</strong>
      ))}
      {radii.map((radius) => (
        <React.Fragment key={`row-${radius}`}>
          <strong>radius {radius}px</strong>
          {smoothness.map((value) => (
            <Squircle
              key={`${radius}-${value}`}
              radius={radius}
              smoothing={value}
              style={{
                width: 120,
                height: 80,
                background:
                  'linear-gradient(135deg, rgba(120, 82, 255, 0.85), rgba(0, 200, 255, 0.85))',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
              }}
            >
              {radius}/{value}
            </Squircle>
          ))}
        </React.Fragment>
      ))}
    </div>
  ),
};
