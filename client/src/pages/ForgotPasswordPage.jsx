import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api.js';
import { ROUTES } from '../routes/routes.js';
import './ForgotPasswordPage.css';

export const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  // Step 1: Find Account | Step 2: Verify OTP | Step 3: New Password
  const [step, setStep] = useState(1);

  // Form State
  const [identifier, setIdentifier] = useState('');
  const [targetEmail, setTargetEmail] = useState('');
  const [maskedEmail, setMaskedEmail] = useState('');
  const [resetToken, setResetToken] = useState('');

  // Password fields for step 3
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // 6-digit OTP State for step 2
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpInputRefs = useRef([]);

  // OTP Countdown Timer (300s = 5 minutes)
  const [timeLeft, setTimeLeft] = useState(300);
  const [canResend, setCanResend] = useState(false);

  // Feedback & Loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, timeLeft]);

  // Format seconds to mm:ss
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // =========================================================================
  // STEP 1: Find account & send OTP
  // =========================================================================
  const handleFindAccount = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanId = identifier.trim();
    if (!cleanId) {
      setErrorMessage('Please enter your username or email address.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/forgot-password-init', {
        identifier: cleanId,
      });

      if (res?.success) {
        setTargetEmail(res.email);
        setMaskedEmail(res.maskedEmail || res.email);
        setSuccessMessage(res.message || 'Verification code sent to your email.');
        setStep(2);
        setTimeLeft(300);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setErrorMessage(res?.message || 'No account found matching this username or email.');
      }
    } catch (err) {
      setErrorMessage(
        err?.data?.message || err?.message || 'No account found matching this username or email.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 2: Handle 6-digit OTP entry and validation
  // =========================================================================
  const handleOtpChange = (index, value) => {
    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);
    setErrorMessage('');

    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        otpInputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').trim().replace(/\D/g, '');
    if (!pasteData) return;

    const chars = pasteData.slice(0, 6).split('');
    const newDigits = ['', '', '', '', '', ''];
    chars.forEach((c, i) => {
      newDigits[i] = c;
    });
    setOtpDigits(newDigits);

    const nextIndex = Math.min(chars.length, 5);
    otpInputRefs.current[nextIndex]?.focus();
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the verification code.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/forgot-password-verify-otp', {
        email: targetEmail,
        otp: fullOtp,
      });

      if (res?.success) {
        setResetToken(res.resetToken);
        setSuccessMessage('Code verified successfully! Now create your new password.');
        setStep(3);
      } else {
        setErrorMessage(res?.message || 'Invalid or expired verification code.');
      }
    } catch (err) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Invalid or expired verification code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend && timeLeft > 0) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setIsLoading(true);
      const res = await api.post('/auth/forgot-password-resend-otp', {
        email: targetEmail,
      });

      if (res?.success) {
        setSuccessMessage(res.message || 'A new verification code has been sent to your email.');
        setTimeLeft(300);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Failed to resend code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // =========================================================================
  // STEP 3: Reset password
  // =========================================================================
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res = await api.post('/auth/forgot-password-reset', {
        resetToken,
        email: targetEmail,
        newPassword,
      });

      if (res?.success) {
        setSuccessMessage(
          res.message || 'Password reset successfully! Redirecting to login...'
        );
        setTimeout(() => {
          navigate(ROUTES.LOGIN);
        }, 1500);
      } else {
        setErrorMessage(res?.message || 'Failed to reset password.');
      }
    } catch (err) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Failed to reset password. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="forgot-page-container">
      <div className="forgot-card">
        {/* Header */}
        <div className="forgot-header">
          <div className="forgot-badge-pill">
            <Sparkles size={14} />
            <span>Account Security</span>
          </div>
          <h1 className="forgot-title">
            {step === 1 && 'Forgot Password'}
            {step === 2 && 'Verify Security Code'}
            {step === 3 && 'Set New Password'}
          </h1>
          <p className="forgot-subtitle">
            {step === 1 &&
              'Enter your username or email address and we will send a 6-digit OTP code to reset your password.'}
            {step === 2 &&
              'Enter the 6-digit code sent to your registered email address.'}
            {step === 3 &&
              'Create a new strong password for your TechShare account.'}
          </p>
        </div>

        {/* Steps Progress Tracker */}
        <div className="forgot-steps-tracker">
          <div className={`forgot-step-node ${step === 1 ? 'active' : 'completed'}`}>
            <span className="forgot-step-circle">1</span>
            <span>Find Account</span>
          </div>
          <div className={`forgot-step-line ${step >= 2 ? 'active' : ''}`} />
          <div className={`forgot-step-node ${step === 2 ? 'active' : step > 2 ? 'completed' : ''}`}>
            <span className="forgot-step-circle">2</span>
            <span>Verify OTP</span>
          </div>
          <div className={`forgot-step-line ${step === 3 ? 'active' : ''}`} />
          <div className={`forgot-step-node ${step === 3 ? 'active' : ''}`}>
            <span className="forgot-step-circle">3</span>
            <span>New Password</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="forgot-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="forgot-alert-success" role="alert">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* =================================================================
            STEP 1: FIND ACCOUNT BY USERNAME OR EMAIL
            ================================================================= */}
        {step === 1 && (
          <form onSubmit={handleFindAccount} className="forgot-form" noValidate>
            <div className="forgot-form-group">
              <label className="forgot-label" htmlFor="forgot-identifier">
                Username or Email Address
              </label>
              <div className="forgot-input-wrapper">
                <User size={18} className="forgot-input-icon" />
                <input
                  id="forgot-identifier"
                  type="text"
                  className="forgot-input"
                  placeholder="renter123 or user@example.com"
                  value={identifier}
                  onChange={(e) => {
                    setIdentifier(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoComplete="username"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="forgot-btn-submit"
              disabled={isLoading || !identifier.trim()}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="spin-loader" />
                  <span>Searching account...</span>
                </>
              ) : (
                <>
                  <span>Find Account &amp; Send Code</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* =================================================================
            STEP 2: 6-DIGIT OTP VERIFICATION
            ================================================================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="forgot-otp-container" noValidate>
            <div className="forgot-otp-icon-glow">
              <ShieldCheck size={34} />
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 2px 0' }}>
              We sent a 6-digit verification code to:
            </p>
            <span className="forgot-masked-email">{maskedEmail}</span>

            {/* 6 Digit Inputs */}
            <div className="forgot-otp-inputs-row" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`forgot-otp-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={isLoading}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* Resend & Timer */}
            <div className="forgot-resend-row">
              {timeLeft > 0 ? (
                <span>
                  Code expires in: <strong>{formatTime(timeLeft)}</strong>
                </span>
              ) : (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>Code has expired.</span>
              )}
              <span>•</span>
              <button
                type="button"
                className="forgot-btn-resend"
                onClick={handleResendOtp}
                disabled={isLoading || (!canResend && timeLeft > 0)}
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              className="forgot-btn-submit"
              disabled={isLoading || otpDigits.join('').length !== 6}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="spin-loader" />
                  <span>Verifying code...</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Verify Code</span>
                </>
              )}
            </button>

            {/* Back Button to Step 1 */}
            <button
              type="button"
              className="forgot-back-btn"
              onClick={() => {
                setStep(1);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              disabled={isLoading}
            >
              <ArrowLeft size={15} />
              <span>Use a different username or email</span>
            </button>
          </form>
        )}

        {/* =================================================================
            STEP 3: NEW PASSWORD FORM
            ================================================================= */}
        {step === 3 && (
          <form onSubmit={handleResetPassword} className="forgot-form" noValidate>
            <div className="forgot-form-group">
              <label className="forgot-label" htmlFor="forgot-new-password">
                New Password
              </label>
              <div className="forgot-input-wrapper">
                <Lock size={18} className="forgot-input-icon" />
                <input
                  id="forgot-new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  className="forgot-input forgot-input-password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                  autoFocus
                />
                <button
                  type="button"
                  className="forgot-password-toggle"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  tabIndex={-1}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                >
                  {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="forgot-form-group">
              <label className="forgot-label" htmlFor="forgot-confirm-password">
                Confirm New Password
              </label>
              <div className="forgot-input-wrapper">
                <Lock size={18} className="forgot-input-icon" />
                <input
                  id="forgot-confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  className="forgot-input forgot-input-password"
                  placeholder="Re-enter your new password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (errorMessage) setErrorMessage('');
                  }}
                  autoComplete="new-password"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="forgot-password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="forgot-btn-submit"
              disabled={isLoading || !newPassword || !confirmPassword}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="spin-loader" />
                  <span>Updating password...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Reset Password</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer: Back to Login */}
        <div className="forgot-footer">
          <span>Remembered your password?</span>
          <Link to={ROUTES.LOGIN} className="forgot-footer-link">
            Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
