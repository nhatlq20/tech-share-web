import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AccountBannedModal } from './AccountBannedModal.jsx';

describe('AccountBannedModal JSX Component', () => {
  let container, root;

  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('does not render content when isOpen is false', async () => {
    await act(async () => {
      root.render(
        <AccountBannedModal isOpen={false} reason="Vi phạm" onConfirm={() => {}} />
      );
    });
    expect(container.innerHTML).toBe('');
  });

  test('renders modal with title, reason and logout button when isOpen is true', async () => {
    const reasonText = 'Vi phạm chính sách thanh toán tiền thuê thiết bị';
    await act(async () => {
      root.render(
        <AccountBannedModal isOpen={true} reason={reasonText} onConfirm={() => {}} />
      );
    });

    expect(container.textContent).toContain('Tài Khoản Đã Bị Khóa');
    expect(container.textContent).toContain(reasonText);
    expect(container.textContent).toContain('Đăng xuất ngay');
  });

  test('triggers onConfirm callback when clicking logout button', async () => {
    let confirmed = false;
    await act(async () => {
      root.render(
        <AccountBannedModal
          isOpen={true}
          reason="Vi phạm quy chế"
          onConfirm={() => {
            confirmed = true;
          }}
        />
      );
    });

    const btn = container.querySelector('button');
    expect(btn).toBeDefined();
    await act(async () => {
      btn.click();
    });
    expect(confirmed).toBe(true);
  });
});
