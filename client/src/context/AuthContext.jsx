import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api.js';
import { STORAGE_KEYS } from '../constants/config.js';
import { ROUTES } from '../routes/routes.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN) || null;
  });

  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.USER_DATA);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [account, setAccount] = useState(() => {
    try {
      const saved = localStorage.getItem('techshare_account');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(false);

  // Cập nhật khi đăng nhập thành công
  const login = (authData) => {
    const { token: newToken, user: newUser, account: newAccount } = authData;

    if (newToken) {
      setToken(newToken);
      localStorage.setItem(STORAGE_KEYS.AUTH_TOKEN, newToken);
    }
    if (newUser) {
      setUser(newUser);
      localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(newUser));
    }
    if (newAccount) {
      setAccount(newAccount);
      localStorage.setItem('techshare_account', JSON.stringify(newAccount));
    }
  };

  // Đăng xuất và dọn dẹp LocalStorage, tất cả các role đều trở về trang Home
  const logout = () => {
    setToken(null);
    setUser(null);
    setAccount(null);
    localStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER_DATA);
    localStorage.removeItem('techshare_account');
    window.location.href = ROUTES.HOME;
  };

  // Tải lại dữ liệu profile mới nhất từ backend collection users
  const refreshProfile = async () => {
    if (!token) return null;
    try {
      setIsLoading(true);
      const res = await api.get('/auth/profile', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res?.success && res?.user) {
        setUser(res.user);
        localStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(res.user));
        if (res.account) {
          setAccount(res.account);
          localStorage.setItem('techshare_account', JSON.stringify(res.account));
        }
        return res.user;
      }
    } catch (err) {
      console.warn('Không thể làm mới profile tự động:', err.message);
    } finally {
      setIsLoading(false);
    }
    return null;
  };

  // Khi khởi động, nếu có token thì đồng bộ lại thông tin profile mới nhất
  useEffect(() => {
    if (token) {
      refreshProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        token,
        user,
        account,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshProfile,
        setUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

export default AuthContext;
