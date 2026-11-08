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
  ShieldCheck,
  ShieldAlert,
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
  const [bannedInfo, setBannedInfo] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  // Trang đích sau khi đăng nhập (nếu bị redirect tới đây)
  const from = location.state?.from?.pathname || ROUTES.HOME;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setBannedInfo(null);
    setSuccessMessage('');

    if (!identifier.trim()) {
      setErrorMessage('Please enter your username or email.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/login', {
        identifier: identifier.trim(),
        password,
        portal: 'client',
      });

      if (res?.success) {
        const role = res.user?.role;

        // Chặn admin đăng nhập ở trang login thường
        if (role === 'admin') {
          setErrorMessage('Invalid username or password.');
          return;
        }

        // Accounts with the "both" role can use both renter and owner features.
        if (!['owner', 'renter', 'both'].includes(role)) {
          setErrorMessage('Invalid username or password.');
          return;
        }

        login({
          token: res.token,
          user: res.user,
          account: res.account,
        });

        setSuccessMessage('Login successful! Redirecting...');
        setTimeout(() => {
          // Phân quyền điều hướng theo role
          const isOwnerDestination =
            from === ROUTES.OWNER || from.startsWith(`${ROUTES.OWNER}/`);
          if (role === 'owner' || (role === 'both' && isOwnerDestination)) {
            navigate(isOwnerDestination ? from : ROUTES.OWNER, { replace: true });
          } else {
            // Renters and dual-role accounts can return to their requested public route.
            const isRenterSafeRoute =
              from &&
              !from.startsWith('/admin') &&
              !isOwnerDestination &&
              from !== ROUTES.LOGIN;
            navigate(isRenterSafeRoute ? from : ROUTES.HOME, { replace: true });
          }
        }, 600);
      } else {
        setErrorMessage(res?.message || 'Invalid username or password.');
      }
    } catch (err) {
      const isBanned =
        err.status === 403 ||
        err.data?.isbanned === true ||
        Boolean(err.data?.banReason) ||
        (err.data?.message && err.data.message.toLowerCase().includes('khóa'));

      if (isBanned) {
        const reason = err.data?.banReason || 'Vi phạm chính sách và điều khoản sử dụng TechShare.';
        setBannedInfo({ isBanned: true, reason });
        setErrorMessage(err.data?.message || `Tài khoản của bạn đã bị khóa. Lí do: ${reason}`);
      } else {
        setBannedInfo(null);
        const msg =
          err.data?.message ||
          err.message ||
          'Invalid username or password.';
        setErrorMessage(msg);
      }
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
          <h1 className="login-title">Welcome Back</h1>
          <p className="login-subtitle">
            Log in to rent tech devices &amp; manage your orders
          </p>
        </div>

        {/* Banned Alert with Reason */}
        {bannedInfo ? (
          <div
            className="login-alert-error"
            role="alert"
            style={{
              backgroundColor: '#FEF2F2',
              borderColor: '#FCA5A5',
              color: '#991B1B',
              padding: '16px',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '14.5px' }}>
              <ShieldAlert size={20} color="#DC2626" />
              <span>Tài khoản của bạn đã bị khóa</span>
            </div>
            <div style={{ fontSize: '13.5px', color: '#7F1D1D', lineHeight: 1.5 }}>
              <strong>Lí do khóa:</strong> {bannedInfo.reason}
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
              Nếu bạn cho rằng đây là sự nhầm lẫn, vui lòng liên hệ quản trị viên qua email <strong>support@techshare.vn</strong> để được kiểm tra.
            </div>
          </div>
        ) : errorMessage ? (
          /* Normal Error Alert */
          <div className="login-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{errorMessage}</div>
          </div>
        ) : null}

        {/* Success Alert */}
        {successMessage && (
          <div className="login-alert-success" role="status">
            <CheckCircle2 size={18} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-label" htmlFor="login-identifier">
              Username or Email
            </label>
            <div className="login-input-wrapper">
              <User size={18} className="login-input-icon" />
              <input
                id="login-identifier"
                type="text"
                className="login-input"
                placeholder="Enter username or email..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                autoComplete="username"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="login-form-group">
            <label className="login-label" htmlFor="login-password">
              Password
            </label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="login-input login-input-password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                disabled={isLoading}
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="login-options-row">
            <Link
              to={ROUTES.FORGOT_PASSWORD}
              className="login-forgot-link"
            >
              Forgot password?
            </Link>
          </div>

          <button
            type="submit"
            className="login-btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="login-footer">
          Don't have an account?
          <Link to={ROUTES.REGISTER} className="login-footer-link">
            Register now
          </Link>
        </div>

        {/* Admin Portal Switch Section */}
        <div className="login-admin-divider">
          <span>Are you an administrator?</span>
        </div>

        <div className="login-admin-switch-container">
          <a href="/admin/login" className="login-admin-switch-btn">
            <ShieldCheck size={18} />
            <span>Admin Portal Sign In</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
