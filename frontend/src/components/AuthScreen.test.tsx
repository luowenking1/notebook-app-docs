import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { mockLogin, mockRegister } = vi.hoisted(() => ({
  mockLogin: vi.fn().mockResolvedValue(undefined),
  mockRegister: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    authError: null,
    register: mockRegister,
    login: mockLogin,
    logout: vi.fn(),
    clearAuthError: vi.fn(),
  }),
}));

import AuthScreen from './AuthScreen';

describe('AuthScreen', () => {
  it('defaults to the log-in form', () => {
    render(<AuthScreen />);
    expect(screen.getByRole('button', { name: 'Log in' })).toBeInTheDocument();
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
  });

  it('submits email and password to login()', async () => {
    render(<AuthScreen />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Email'), 'reader@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Log in' }));

    expect(mockLogin).toHaveBeenCalledWith('reader@test.com', 'password123');
  });

  it('switches to the sign-up form and submits to register()', async () => {
    render(<AuthScreen />);
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: 'Sign up' }));
    expect(screen.getByRole('button', { name: 'Sign up', })).toBeInTheDocument();

    await user.type(screen.getByLabelText('Email'), 'new@test.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(mockRegister).toHaveBeenCalledWith('new@test.com', 'password123');
  });
});
