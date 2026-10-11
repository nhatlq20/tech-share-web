import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { ROUTES } from '../routes/routes.js';
import './LoginPage.css';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Trang đích sau khi đăng nhập (nếu bị redirect tới đây)
  const from = location.state?.from?.pathname || ROUTES.HOME;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Vui lòng nhập tên đăng nhập hoặc email.');
      return;
    }
    if (!password) {
      setErrorMessage('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
      });

      if (res?.success) {
        const role = res.user?.role;

        // Tài khoản admin không được đăng nhập tại đây
        if (role === 'admin') {
          setErrorMessage(
            'Tài khoản hoặc mật khẩu không chính xác.'
          );
          return;
        }

        login({
          token: res.token,
          user: res.user,
          account: res.account,
        });

        setSuccessMessage('Đăng nhập thành công! Đang chuyển hướng...');
        setTimeout(() => {
          // Owner → vào thẳng trang quản lý
          if (role === 'owner') {
            navigate(ROUTES.OWNER, { replace: true });
          } else {
            // Renter → về trang đích trước đó hoặc home
            navigate(from, { replace: true });
          }
        }, 600);
      } else {
        setErrorMessage(res?.message || 'Đăng nhập không thành công.');
      }
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-badge-pill">
            <Sparkles size={14} />
            TechShare Authentication
          </div>
          <h1 className="login-title">Chào mừng trở lại</h1>
          <p className="login-subtitle">
            Đăng nhập để thuê thiết bị công nghệ &amp; quản lý đơn hàng
          </p>
        </div>

        {/* Thông báo lỗi */}
        {errorMessage && (
          <div className="login-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Thông báo thành công */}
        {successMessage && (
          <div className="login-alert-success" role="status">
            <CheckCircle2 size={18} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Form đăng nhập */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-label" htmlFor="login-identifier">
              Tên đăng nhập hoặc Email
            </label>
            <div className="login-input-wrapper">
              <User size={18} className="login-input-icon" />
              <input
                id="login-identifier"
                type="text"
                className="login-input"
                placeholder="Nhập tên đăng nhập hoặc email..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-label" htmlFor="login-password">
              Mật khẩu
            </label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input-password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-options-row">
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Vui lòng liên hệ quản trị viên để khôi phục mật khẩu.');
              }}
              className="login-forgot-link"
            >
              Quên mật khẩu?
            </a>
          </div>

          <button
            type="submit"
            className="login-btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Đang xác thực...</span>
            ) : (
              <>
                <span>Đăng nhập</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          Chưa có tài khoản?
          <Link to={ROUTES.REGISTER} className="login-footer-link">
            Đăng ký ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
