import nodemailer from 'nodemailer';

/**
 * Service gửi email thông báo và mã xác thực OTP qua Gmail App Password
 */
const createTransporter = () => {
  const user = process.env.EMAIL_USER || 'phainon33m5@gmail.com';
  // Loại bỏ khoảng trắng trong App Password nếu có
  const pass = (process.env.EMAIL_PASS || 'bxol fmco phiy bftm').replace(/\s+/g, '');

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Gửi email chứa mã OTP 6 số cho người dùng khi đăng ký tài khoản
 * @param {string} toEmail - Email nhận mã
 * @param {string} otpCode - Mã OTP 6 chữ số
 * @param {string} name - Tên người đăng ký
 */
export const sendOtpEmail = async (toEmail, otpCode, name = '') => {
  const transporter = createTransporter();

  const displayName = name || 'Bạn';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TechShare Account Verification Code</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
        .wrapper { width: 100%; max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 30px; text-align: center; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .logo span { color: #67BEC3; }
        .content { padding: 40px 32px; text-align: center; }
        .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .desc { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 28px; }
        .otp-box { background: #f8fafc; border: 2px dashed #67BEC3; border-radius: 12px; padding: 20px 24px; margin: 0 auto 28px auto; display: inline-block; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0891b2; margin: 0; text-indent: 8px; }
        .expiry { font-size: 13px; color: #94a3b8; margin-top: 8px; font-weight: 500; }
        .notice { font-size: 13px; color: #94a3b8; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: left; }
        .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo">Tech<span>Share</span></div>
        </div>
        <div class="content">
          <div class="greeting">Verify Your Account</div>
          <p class="desc">
            Hello <strong>${displayName}</strong>,<br>
            Thank you for creating an account on TechShare. Please use the following 6-digit OTP verification code to activate your account:
          </p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
            <div class="expiry">This code is valid for 5 minutes</div>
          </div>
          <div class="notice">
            ⚠️ <strong>Security Notice:</strong> Never share this code with anyone, including TechShare staff. If you did not make this request, please disregard this email.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 TechShare Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"TechShare Platform" <${process.env.EMAIL_USER || 'phainon33m5@gmail.com'}>`,
    to: toEmail,
    subject: `[TechShare] ${otpCode} is your verification code`,
    text: `Hello ${displayName},\n\nYour TechShare account verification code is: ${otpCode}.\nThis code is valid for 5 minutes.\n\nIf you did not request this code, please ignore this email.`,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

/**
 * Gửi email chứa mã OTP 6 số để xác nhận đặt lại mật khẩu
 * @param {string} toEmail - Email nhận mã
 * @param {string} otpCode - Mã OTP 6 chữ số
 * @param {string} name - Tên người dùng hoặc username
 */
export const sendResetPasswordOtpEmail = async (toEmail, otpCode, name = '') => {
  const transporter = createTransporter();

  const displayName = name || 'User';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>TechShare Password Reset Code</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; }
        .wrapper { width: 100%; max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.03); }
        .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 36px 30px; text-align: center; }
        .logo { font-size: 26px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff; }
        .logo span { color: #67BEC3; }
        .content { padding: 40px 32px; text-align: center; }
        .greeting { font-size: 20px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .desc { font-size: 15px; color: #64748b; line-height: 1.6; margin-bottom: 28px; }
        .otp-box { background: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 20px 24px; margin: 0 auto 28px auto; display: inline-block; }
        .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #0f766e; margin: 0; text-indent: 8px; }
        .expiry { font-size: 13px; color: #64748b; margin-top: 8px; font-weight: 500; }
        .notice { font-size: 13px; color: #dc2626; line-height: 1.5; border-top: 1px solid #f1f5f9; padding-top: 24px; text-align: left; background-color: #fef2f2; padding: 16px; border-radius: 8px; margin-top: 12px; }
        .footer { background: #f8fafc; padding: 20px 30px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <div class="logo">Tech<span>Share</span></div>
        </div>
        <div class="content">
          <div class="greeting">Password Reset Request</div>
          <p class="desc">
            Hello <strong>${displayName}</strong>,<br>
            We received a request to reset the password for your TechShare account. Please use the following 6-digit verification code to proceed:
          </p>
          <div class="otp-box">
            <div class="otp-code">${otpCode}</div>
            <div class="expiry">This code will expire in 5 minutes</div>
          </div>
          <div class="notice">
            ⚠️ <strong>Security Notice:</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged, and your account remains safe.
          </div>
        </div>
        <div class="footer">
          &copy; 2026 TechShare Platform. All rights reserved.
        </div>
      </div>
    </body>
    </html>
  `;

  const mailOptions = {
    from: `"TechShare Platform" <${process.env.EMAIL_USER || 'phainon33m5@gmail.com'}>`,
    to: toEmail,
    subject: `[TechShare] ${otpCode} is your password reset code`,
    text: `Hello ${displayName},\n\nWe received a request to reset your TechShare password.\nYour verification code is: ${otpCode}.\nThis code is valid for 5 minutes.\n\nIf you did not request a password reset, please ignore this email.`,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  return info;
};

export default {
  sendOtpEmail,
  sendResetPasswordOtpEmail,
};
