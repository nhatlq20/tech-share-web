import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useAuth } from '../context/AuthContext.jsx';
import { ProtectedRoute } from './ProtectedRoute.jsx';

jest.mock('../context/AuthContext.jsx', () => ({
  useAuth: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  Navigate: ({ to }) => <div data-testid="redirect" data-to={to} />,
  useLocation: () => ({ pathname: '/owner' }),
}));

describe('ProtectedRoute role access', () => {
  let container;
  let root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.clearAllMocks();
  });

  const renderRoute = async (role, roles) => {
    useAuth.mockReturnValue({
      isAuthenticated: true,
      user: { role },
      isLoading: false,
    });

    await act(async () => {
      root.render(
        <ProtectedRoute roles={roles}>
          <div data-testid="protected-content">Owner workspace</div>
        </ProtectedRoute>
      );
    });
  };

  test('allows a dual-role account into owner routes', async () => {
    await renderRoute('both', ['owner']);

    expect(container.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    expect(container.querySelector('[data-testid="redirect"]')).toBeNull();
  });

  test('does not grant admin access to a dual-role account', async () => {
    await renderRoute('both', ['admin']);

    expect(container.querySelector('[data-testid="protected-content"]')).toBeNull();
    expect(container.querySelector('[data-testid="redirect"]')?.getAttribute('data-to')).toBe('/');
  });
});
