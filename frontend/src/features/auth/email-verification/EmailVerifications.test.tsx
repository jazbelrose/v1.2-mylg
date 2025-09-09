// EmailVerification.test.tsx
import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import EmailVerification from './EmailVerification';
import {
  confirmSignUp,
  fetchAuthSession,
  signIn,
} from 'aws-amplify/auth';
import { updateUserProfile } from '../../../shared/utils/api';

vi.mock('aws-amplify/auth', () => ({
  confirmSignUp: vi.fn().mockResolvedValue({ isSignUpComplete: true }),
  resendSignUpCode: vi.fn(),
  signIn: vi.fn(),
  fetchAuthSession: vi.fn().mockResolvedValue({
    tokens: { idToken: { payload: { sub: 'sub123' } } },
  }),
}));

vi.mock('../../../app/contexts/DataProvider', () => ({
  useData: () => ({ opacity: 1 }),
}));

vi.mock('../../../app/contexts/AuthContext', () => ({
  useAuth: () => ({ validateAndSetUserSession: vi.fn() }),
}));

vi.mock('../../../utils/api', () => ({
  updateUserProfile: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: {} }),
}));

// Cast the mocked fns for TS
const mockedConfirmSignUp = confirmSignUp as ReturnType<typeof vi.fn>;
const mockedFetchAuthSession = fetchAuthSession as ReturnType<typeof vi.fn>;
const mockedSignIn = signIn as ReturnType<typeof vi.fn>;
const mockedUpdateUserProfile = updateUserProfile as ReturnType<typeof vi.fn>;

describe('EmailVerification', () => {
  beforeEach(() => {
    mockedConfirmSignUp.mockResolvedValue({ isSignUpComplete: true });
    mockedFetchAuthSession.mockResolvedValue({
      tokens: { idToken: { payload: { sub: 'sub123' } } },
    } as Awaited<ReturnType<typeof fetchAuthSession>>);
    mockedSignIn.mockResolvedValue({} as Awaited<ReturnType<typeof signIn>>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('auto verifies when code is pasted', async () => {
    const { getAllByRole } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '123456',
      },
    } as unknown as ClipboardEvent);

    await waitFor(() => {
      expect(mockedConfirmSignUp).toHaveBeenCalledWith({
        username: 'test@example.com',
        confirmationCode: '123456',
      });
    });
  });

  it('auto verifies when code typed', async () => {
    const { getAllByRole } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    const digits = ['1', '2', '3', '4', '5', '6'];

    digits.forEach((d, i) => {
      fireEvent.change(inputs[i], { target: { value: d } });
    });

    await waitFor(() => {
      expect(mockedConfirmSignUp).toHaveBeenCalled();
    });
  });

  it('prevents double verification when validate clicked after paste', async () => {
    const { getAllByRole, getByRole } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    const button = getByRole('button', { name: /validate/i });

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '123456',
      },
    } as unknown as ClipboardEvent);

    fireEvent.click(button);

    await waitFor(() => {
      expect(mockedConfirmSignUp).toHaveBeenCalledTimes(1);
    });
  });

  it('navigates to dashboard if user already verified', async () => {
    const error = new Error('User is already confirmed') as Error & { name: string };
    error.name = 'NotAuthorizedException';
    mockedConfirmSignUp.mockImplementationOnce(() => Promise.reject(error));

    const { getAllByRole, findByText } = render(<EmailVerification userEmail="test@example.com" />);
    const inputs = getAllByRole('textbox') as HTMLInputElement[];

    fireEvent.paste(inputs[0], {
      clipboardData: {
        getData: () => '123456',
      },
    } as unknown as ClipboardEvent);

    await findByText('Email successfully verified');

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  it('keeps profile pending after verification', async () => {
    const registrationData = { password: 'pass123', pending: true };
    const { getAllByRole } = render(
      <EmailVerification userEmail="test@example.com" registrationData={registrationData} />
    );
    const inputs = getAllByRole('textbox') as HTMLInputElement[];
    const digits = ['1', '2', '3', '4', '5', '6'];

    digits.forEach((d, i) => {
      fireEvent.change(inputs[i], { target: { value: d } });
    });

    await waitFor(() => {
      expect(mockedUpdateUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({ pending: true })
      );
    });
  });
});
