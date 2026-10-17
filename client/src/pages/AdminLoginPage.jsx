import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { ROUTES } from '../routes/routes.js';
import './AdminLoginPage.css';

export const AdminLoginPage = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Nếu đã là admin → chuyển thẳng vào trang quản trị
  useEffect(() => {
    if (isAuthenticated && user?.role === 'admin') {
      navigate(ROUTES.ADMIN, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
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
        portal: 'admin',
      });

      if (res?.success) {
        // Chỉ cho phép admin đăng nhập tại cổng này
        if (res.user?.role !== 'admin') {
          setErrorMessage('Invalid username or password.');
          return;
        }

        login({
          token: res.token,
          user: res.user,
          account: res.account,
        });

        setSuccessMessage('Login successful! Redirecting to admin portal...');
        setTimeout(() => {
          navigate(ROUTES.ADMIN, { replace: true });
        }, 600);
      } else {
        setErrorMessage(res?.message || 'Invalid username or password.');
      }
    } catch (err) {
      const msg =
        err.data?.message ||
        err.message ||
        'Invalid username or password.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page-container">
      <div className="login-card admin-login-card">
        {/* Header */}
        <div className="login-header">
          <div className="login-badge-pill admin-login-badge-pill">
            <ShieldCheck size={14} />
            Admin Portal
          </div>
          <h1 className="login-title">Admin Sign In</h1>
          <p className="login-subtitle">
            Dedicated portal for TechShare system administrators
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="login-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
            <div>{errorMessage}</div>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="login-alert-success" role="status">
            <CheckCircle2 size={18} />
            <div>{successMessage}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label className="login-label" htmlFor="admin-identifier">
              Username or Email
            </label>
            <div className="login-input-wrapper">
              <User size={18} className="login-input-icon" />
              <input
                id="admin-identifier"
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
            <label className="login-label" htmlFor="admin-password">
              Password
            </label>
            <div className="login-input-wrapper">
              <Lock size={18} className="login-input-icon" />
              <input
                id="admin-password"
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
            className="login-btn-submit admin-btn-submit"
            disabled={isLoading}
          >
            {isLoading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>Sign In as Admin</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Back to User Login link */}
        <div className="admin-back-switch-container">
          <Link to={ROUTES.LOGIN} className="admin-back-switch-btn">
            <ArrowLeft size={16} />
            <span>Return to Owner &amp; Renter Login</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminLoginPage;
