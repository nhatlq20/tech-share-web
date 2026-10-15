import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  UserCheck,
  Mail,
  Phone,
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
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { ROUTES } from '../routes/routes.js';
import './RegisterPage.css';

interface RegisterFormData {
  username: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface RegisterResponse {
  success: boolean;
  message: string;
  token?: string;
  account?: any;
  user?: any;
  email?: string;
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Step 1: Account Information | Step 2: OTP Verification
  const [step, setStep] = useState<1 | 2>(1);

  // Form State
  const [formData, setFormData] = useState<RegisterFormData>({
    username: '',
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState<boolean>(false);

  // 6-digit OTP State
  const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // OTP Countdown Timer (300s = 5 minutes)
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [canResend, setCanResend] = useState<boolean>(false);

  // Status & Feedback messages
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Countdown timer for OTP expiry
  useEffect(() => {
    let timer: NodeJS.Timeout;
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
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle form field change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errorMessage) setErrorMessage('');
  };

  // Step 1: Validate and submit information to receive OTP
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const cleanUsername = formData.username.trim().toLowerCase();
    const cleanName = formData.name.trim();
    const cleanPhone = formData.phone.trim();
    const cleanEmail = formData.email.trim().toLowerCase();
    const cleanPassword = formData.password;
    const cleanConfirmPassword = formData.confirmPassword;

    // Validate inputs
    if (!cleanUsername || !cleanName || !cleanPhone || !cleanEmail || !cleanPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (cleanUsername.length < 3) {
      setErrorMessage('Username must be at least 3 characters long.');
      return;
    }

    if (/\s/.test(cleanUsername)) {
      setErrorMessage('Username must not contain whitespace.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Invalid email address format.');
      return;
    }

    const phoneRegex = /^[0-9]{9,11}$/;
    if (!phoneRegex.test(cleanPhone)) {
      setErrorMessage('Invalid phone number (must be 9 to 11 digits).');
      return;
    }

    if (cleanPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (cleanPassword !== cleanConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      const res: RegisterResponse = await api.post('/auth/register-init', {
        username: cleanUsername,
        name: cleanName,
        phone: cleanPhone,
        email: cleanEmail,
        password: cleanPassword,
      });

      if (res?.success) {
        setSuccessMessage(res.message || 'Verification code sent to your email.');
        setStep(2);
        setTimeLeft(300);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Unable to send verification code. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle single digit OTP entry
  const handleOtpChange = (index: number, value: string) => {
    const cleanChar = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...otpDigits];
    newDigits[index] = cleanChar;
    setOtpDigits(newDigits);
    setErrorMessage('');

    if (cleanChar && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }
  };

  // Handle backspace and arrow navigation
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
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

  // Handle paste 6-digit OTP code
  const handleOtpPaste = (e: React.ClipboardEvent) => {
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

  // Step 2: Verify OTP and activate account
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMessage('Please enter all 6 digits of the OTP code.');
      return;
    }

    try {
      setIsLoading(true);
      const res: RegisterResponse = await api.post('/auth/register-verify-otp', {
        email: formData.email.trim().toLowerCase(),
        otp: fullOtp,
      });

      if (res?.success) {
        setSuccessMessage('Congratulations! Your TechShare account has been successfully activated.');

        if (res.token && res.user && res.account) {
          login({
            token: res.token,
            user: res.user,
            account: res.account,
          });
        }

        setTimeout(() => {
          navigate(ROUTES.HOME);
        }, 1200);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Invalid or expired OTP code.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP code
  const handleResendOtp = async () => {
    if (!canResend && timeLeft > 0) return;
    setErrorMessage('');
    setSuccessMessage('');

    try {
      setIsLoading(true);
      const res: RegisterResponse = await api.post('/auth/resend-otp', {
        email: formData.email.trim().toLowerCase(),
      });

      if (res?.success) {
        setSuccessMessage(res.message || 'A new OTP code has been sent to your email.');
        setTimeLeft(300);
        setCanResend(false);
        setOtpDigits(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      }
    } catch (err: any) {
      setErrorMessage(
        err?.data?.message || err?.message || 'Failed to resend OTP. Please try again later.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="register-page-container">
      <div className="register-card">
        {/* Header */}
        <div className="register-header">
          <div className="register-badge-pill">
            <Sparkles size={14} />
            <span>TechShare ID</span>
          </div>
          <h1 className="register-title">
            {step === 1 ? 'Create an Account' : 'OTP Verification'}
          </h1>
          <p className="register-subtitle">
            {step === 1
              ? 'Join TechShare to rent high-end tech devices & hardware'
              : 'Enter the 6-digit verification code sent to your email'}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="register-steps-tracker">
          <div className={`register-step-node ${step === 1 ? 'active' : 'completed'}`}>
            <span className="register-step-circle">1</span>
            <span>Account Details</span>
          </div>
          <div className={`register-step-line ${step === 2 ? 'active' : ''}`} />
          <div className={`register-step-node ${step === 2 ? 'active' : ''}`}>
            <span className="register-step-circle">2</span>
            <span>Verify OTP</span>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="register-alert-error" role="alert">
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Success Alert */}
        {successMessage && (
          <div className="register-alert-success" role="alert">
            <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* =================================================================
            STEP 1: ACCOUNT INFORMATION FORM
            ================================================================= */}
        {step === 1 && (
          <form onSubmit={handleRegisterSubmit} className="register-form" noValidate>
            {/* Username & Full Name */}
            <div className="register-form-row">
              <div className="register-form-group">
                <label className="register-label" htmlFor="register-username">
                  Username <span className="required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <User size={16} className="register-input-icon" />
                  <input
                    id="register-username"
                    name="username"
                    type="text"
                    className="register-input"
                    placeholder="e.g. renter_pro"
                    value={formData.username}
                    onChange={handleInputChange}
                    autoComplete="username"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="register-name">
                  Full Name <span className="required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <UserCheck size={16} className="register-input-icon" />
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    className="register-input"
                    placeholder="John Doe"
                    value={formData.name}
                    onChange={handleInputChange}
                    autoComplete="name"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Email & Phone */}
            <div className="register-form-row">
              <div className="register-form-group">
                <label className="register-label" htmlFor="register-email">
                  Email Address <span className="required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <Mail size={16} className="register-input-icon" />
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    className="register-input"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={handleInputChange}
                    autoComplete="email"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="register-phone">
                  Phone Number <span className="required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <Phone size={16} className="register-input-icon" />
                  <input
                    id="register-phone"
                    name="phone"
                    type="tel"
                    className="register-input"
                    placeholder="0912345678"
                    value={formData.phone}
                    onChange={handleInputChange}
                    autoComplete="tel"
                    disabled={isLoading}
                    required
                  />
                </div>
              </div>
            </div>

            {/* Password & Confirm Password */}
            <div className="register-form-row">
              <div className="register-form-group">
                <label className="register-label" htmlFor="register-password">
                  Password <span className="required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <Lock size={16} className="register-input-icon" />
                  <input
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    className="register-input register-input-password"
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="register-form-group">
                <label className="register-label" htmlFor="register-confirm-password">
                  Confirm Password <span className="required">*</span>
                </label>
                <div className="register-input-wrapper">
                  <Lock size={16} className="register-input-icon" />
                  <input
                    id="register-confirm-password"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    className="register-input register-input-password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    autoComplete="new-password"
                    disabled={isLoading}
                    required
                  />
                  <button
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="register-btn-submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="spin-loader" />
                  <span>Processing & sending OTP...</span>
                </>
              ) : (
                <>
                  <span>Continue to OTP Verification</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}

        {/* =================================================================
            STEP 2: 6-DIGIT OTP VERIFICATION SCREEN
            ================================================================= */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} className="otp-container" noValidate>
            <div className="otp-icon-glow">
              <ShieldCheck size={36} />
            </div>

            <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 4px 0' }}>
              A 6-digit verification code has been sent to:
            </p>
            <span className="otp-email-badge">{formData.email}</span>

            {/* 6 Digit Inputs */}
            <div className="otp-inputs-row" onPaste={handleOtpPaste}>
              {otpDigits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el) => {
                    otpInputRefs.current[idx] = el;
                  }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  className={`otp-digit-box ${digit ? 'filled' : ''}`}
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                  disabled={isLoading}
                  autoFocus={idx === 0}
                />
              ))}
            </div>

            {/* Resend & Timer */}
            <div className="otp-resend-row">
              {timeLeft > 0 ? (
                <span>Code expires in: <strong style={{ color: '#0f172a' }}>{formatTime(timeLeft)}</strong></span>
              ) : (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>OTP code has expired.</span>
              )}
              <span>•</span>
              <button
                type="button"
                className="otp-btn-resend"
                onClick={handleResendOtp}
                disabled={isLoading || (!canResend && timeLeft > 0)}
              >
                {isLoading ? 'Sending...' : 'Resend Code'}
              </button>
            </div>

            {/* Submit Verification Button */}
            <button
              type="submit"
              className="register-btn-submit"
              disabled={isLoading || otpDigits.join('').length !== 6}
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="spin-loader" />
                  <span>Activating account...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Verify &amp; Activate Account</span>
                </>
              )}
            </button>

            {/* Back to Step 1 Button */}
            <button
              type="button"
              className="otp-back-btn"
              onClick={() => {
                setStep(1);
                setErrorMessage('');
                setSuccessMessage('');
              }}
              disabled={isLoading}
            >
              <ArrowLeft size={15} />
              <span>Back to change information</span>
            </button>
          </form>
        )}

        {/* Footer: Link to Login */}
        <div className="register-footer">
          <span>Already have a TechShare account?</span>
          <Link to={ROUTES.LOGIN} className="register-footer-link">
            Log in now
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
