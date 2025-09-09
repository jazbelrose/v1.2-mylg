import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Modal from 'react-modal';
import ConfirmModal from './ConfirmModal';
import { beforeAll, test, expect } from 'vitest';

beforeAll(() => {
  const root = document.createElement('div');
  root.setAttribute('id', 'root');
  document.body.appendChild(root);
  Modal.setAppElement(root);
});

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

  expect(screen.getByText(/does not match/i)).toBeInTheDocument();
  const confirmBtn = screen.getByRole('button', { name: /yes/i });
  expect(confirmBtn).toBeDisabled();

  await user.clear(input);
  await user.type(input, 'Project');

  expect(screen.queryByText(/does not match/i)).not.toBeInTheDocument();
  expect(confirmBtn).not.toBeDisabled();
});