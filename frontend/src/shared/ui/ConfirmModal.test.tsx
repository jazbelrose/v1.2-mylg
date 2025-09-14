import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmModal from './ConfirmModal';
import { test, expect, vi } from 'vitest';

vi.mock('react-modal', () => ({
  default: vi.fn().mockImplementation(({ children, ...props }) => <div {...props}>{children}</div>),
  setAppElement: vi.fn(),
}));

test("shows feedback when confirmation text doesn't match", async () => {
  const user = userEvent.setup();
  render(
    <ConfirmModal
      isOpen={true}
      onRequestClose={() => {}}
      onConfirm={() => {}}
      confirmText="Project"
    />
  );

  const input = screen.getByPlaceholderText('Type "Project" to confirm');
  await user.type(input, 'Wrong');

  expect(screen.getByText(/does not match/i)).toBeTruthy();
  const confirmBtn = screen.getByRole('button', { name: /yes/i }) as HTMLButtonElement;
  expect(confirmBtn.disabled).toBe(true);

  await user.clear(input);
  await user.type(input, 'Project');

  expect(screen.queryByText(/does not match/i)).toBeNull();
  expect(confirmBtn.disabled).toBe(false);
});