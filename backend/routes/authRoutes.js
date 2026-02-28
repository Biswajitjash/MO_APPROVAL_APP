import express from 'express';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import authManager from '../utils/authManager.js';

const router = express.Router();

// ── JWT config for password-reset tokens ──────────────────────────────────────
const RESET_SECRET = process.env.RESET_TOKEN_SECRET || 'reset-secret-change-in-production';
const RESET_EXPIRY = '10m';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

console.log('FRONTEND_URL:', FRONTEND_URL);
console.log('BREVO_API_KEY set:', !!process.env.BREVO_API_KEY);

// ── Brevo HTTP API (HTTPS:443 — works on Render free tier, no SMTP ports needed)
const sendBrevoEmail = async ({ to, toName, subject, html }) => {
  if (!process.env.BREVO_API_KEY) {
    throw new Error('BREVO_API_KEY is not set in environment variables');
  }
  const response = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender:      { name: 'MO Approval System', email: process.env.BREVO_SENDER_EMAIL || 'biswajitjash@gmail.com' },
      to:          [{ email: to, name: toName }],
      subject,
      htmlContent: html
    },
    {
      headers: {
        'api-key':      process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept':       'application/json'
      },
      timeout: 15000
    }
  );
  return response.data;
};

// =============================================================================
// AUTH ROUTES
// =============================================================================

// Login
router.post('/login', async (req, res) => {
  try {
    const { userId, password } = req.body;
    if (!userId || !password) {
      return res.status(400).json({ success: false, error: 'Username and password are required' });
    }
    console.log('Login attempt: ' + userId);
    const result = await authManager.authenticate(userId, password);
    if (!result.success) return res.status(401).json(result);
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = authManager.logout(token);
    res.json(result);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// Verify session token
router.get('/verify', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = authManager.verifyToken(token);
    if (!result.valid) return res.status(401).json(result);
    res.json(result);
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const result = authManager.verifyToken(token);
    if (!result.valid) return res.status(401).json({ error: 'Unauthorized' });
    res.json({ success: true, user: result.user });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
});

// Change password (authenticated — requires old password)
router.post('/change-password', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const { oldPassword, newPassword } = req.body;
    const verification = authManager.verifyToken(token);
    if (!verification.valid) return res.status(401).json({ error: 'Unauthorized' });
    const result = await authManager.changePassword(verification.user.userId, oldPassword, newPassword);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
});

// Admin: Get all users
router.get('/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const verification = authManager.verifyToken(token);
    if (!verification.valid || verification.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const users = await authManager.getAllUsers();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
});

// Admin: Add user
router.post('/users', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    const verification = authManager.verifyToken(token);
    if (!verification.valid || verification.user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const result = await authManager.addUser(req.body);
    if (!result.success) return res.status(400).json(result);
    res.json(result);
  } catch (error) {
    console.error('Add user error:', error);
    res.status(500).json({ success: false, error: 'Failed to add user' });
  }
});

// Register (public)
router.post('/register', async (req, res) => {
  try {
    const { userId, password, name, email, role, plant } = req.body;
    if (!userId || !password || !name || !email) {
      return res.status(400).json({ success: false, error: 'User ID, password, name, and email are required' });
    }
    console.log('Registration attempt: ' + userId);
    const result = await authManager.addUser({ userId, password, name, email, role: role || 'user', plant: plant || '' });
    if (!result.success) return res.status(400).json(result);
    console.log('User ' + userId + ' registered successfully');
    res.json(result);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// =============================================================================
// PASSWORD RESET ROUTES
// =============================================================================

// ── GET /auth/user/:userId ────────────────────────────────────────────────────
// ResetUserPassword.jsx "Verify" button — checks user exists, returns safe info
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId?.trim()) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }
    console.log('User lookup: ' + userId);
    const user = await authManager.getUserById(userId.trim());
    if (!user) {
      return res.status(404).json({ success: false, error: 'Invalid User ID – no matching user found' });
    }
    if (!user.active) {
      return res.status(403).json({ success: false, error: 'This account is inactive. Please contact an administrator.' });
    }
    res.json({ success: true, user: { userId: user.userId, name: user.name, email: user.email } });
  } catch (error) {
    console.error('User lookup error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch user' });
  }
});

// ── POST /auth/send-reset-email ───────────────────────────────────────────────
// ResetUserPassword.jsx "Send Reset Link" — signs JWT, sends email via Brevo API
router.post('/send-reset-email', async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId?.trim()) {
      return res.status(400).json({ success: false, error: 'User ID is required' });
    }

    const user = await authManager.getUserById(userId.trim());
    if (!user || !user.active) {
      console.log('Reset email requested for unknown/inactive user: ' + userId);
      return res.json({ success: true, message: 'If the account exists, a reset email has been sent.' });
    }

    const token = jwt.sign(
      { userId: user.userId, purpose: 'password-reset' },
      RESET_SECRET,
      { expiresIn: RESET_EXPIRY }
    );

    const resetLink = `${FRONTEND_URL}/change-password?token=${token}`;
    console.log('Reset link generated:', resetLink);

    await sendBrevoEmail({
      to:      user.email,
      toName:  user.name,
      subject: 'Password Reset Request – MO Approval System',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:540px;margin:auto;
                    padding:36px;border:1px solid #e0e0e0;border-radius:10px;background:#ffffff;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="width:64px;height:64px;background:linear-gradient(135deg,#0f2027,#2c5364);
                        border-radius:50%;display:inline-flex;align-items:center;justify-content:center;">
              <span style="font-size:28px;">&#128273;</span>
            </div>
          </div>
          <h2 style="color:#1a3a4a;margin:0 0 8px;text-align:center;">Password Reset Request</h2>
          <p style="color:#555;text-align:center;margin:0 0 24px;font-size:14px;">MO Approval System</p>
          <p style="color:#333;">Hello <strong>${user.name}</strong>,</p>
          <p style="color:#555;line-height:1.6;">
            We received a request to reset the password for your account
            (<strong>${user.userId}</strong>). Click the button below to create a new password.
          </p>
          <p style="color:#e53935;font-size:13px;">This link will expire in <strong>10 minutes</strong>.</p>
          <div style="text-align:center;margin:32px 0;">
            <a href="${resetLink}"
               style="background:linear-gradient(135deg,#0f2027,#2c5364);color:#ffffff;
                      padding:14px 36px;border-radius:8px;text-decoration:none;
                      font-weight:bold;font-size:15px;display:inline-block;">
              Reset My Password
            </a>
          </div>
          <p style="color:#999;font-size:12px;">
            If you did not request this, you can safely ignore this email.
          </p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
          <p style="color:#bbb;font-size:11px;">
            Or copy this link:<br>
            <a href="${resetLink}" style="color:#2c5364;word-break:break-all;">${resetLink}</a>
          </p>
        </div>
      `
    });

    console.log('Password reset email sent via Brevo to ' + user.email + ' for user ' + user.userId);
    res.json({ success: true, message: 'Reset email sent successfully' });

  } catch (error) {
    console.error('Send reset email error DETAIL:', error.message);
    console.error('Brevo API response:', error.response?.data || 'No response');
    console.error('BREVO_API_KEY set:', !!process.env.BREVO_API_KEY);
    console.error('BREVO_SENDER_EMAIL:', process.env.BREVO_SENDER_EMAIL || 'NOT SET');
    res.status(500).json({ success: false, error: 'Failed to send reset email: ' + error.message });
  }
});

// ── POST /auth/verify-reset-token ─────────────────────────────────────────────
// PasswordReset.jsx on mount — validates the JWT token from URL, returns userId
router.post('/verify-reset-token', (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({ success: false, error: 'Token is required' });
    }
    const payload = jwt.verify(token, RESET_SECRET);
    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, error: 'Invalid token purpose' });
    }
    res.json({ success: true, userId: payload.userId });
  } catch (error) {
    console.warn('Reset token verification failed:', error.message);
    res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
  }
});

// ── POST /auth/reset-password ─────────────────────────────────────────────────
// PasswordReset.jsx "Save Password" — re-verifies JWT, updates password in users.json
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    let payload;
    try {
      payload = jwt.verify(token, RESET_SECRET);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid or expired reset link' });
    }
    if (payload.purpose !== 'password-reset') {
      return res.status(400).json({ success: false, error: 'Invalid token purpose' });
    }
    const result = await authManager.resetPassword(payload.userId, newPassword);
    if (!result.success) return res.status(400).json(result);
    console.log('Password reset successfully for user: ' + payload.userId);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

export default router;