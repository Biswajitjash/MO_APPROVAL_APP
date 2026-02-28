import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Container,
  InputAdornment,
  IconButton,
  Zoom,
  Fade,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  VpnKey,
  Visibility,
  VisibilityOff,
  ArrowBack,
  SaveRounded,
  CheckCircle,
  PersonOutline,
  ErrorOutline
} from '@mui/icons-material';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const getPasswordStrength = (password) => {
  if (!password) return { strength: 0, label: '', color: '' };
  let strength = 0;
  if (password.length >= 6)  strength += 25;
  if (password.length >= 10) strength += 25;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
  if (/\d/.test(password)) strength += 25;

  if (strength <= 25)  return { strength, label: 'Weak',   color: 'error'   };
  if (strength <= 50)  return { strength, label: 'Fair',   color: 'warning' };
  if (strength <= 75)  return { strength, label: 'Good',   color: 'info'    };
  return               { strength, label: 'Strong', color: 'success' };
};

// ─────────────────────────────────────────────────────────────────────────────

const PasswordReset = () => {
  const navigate        = useNavigate();
  const [searchParams]  = useSearchParams();

  // Token comes from the reset link:  /reset-password?token=<jwt>
  const token = searchParams.get('token');

  const [tokenStatus, setTokenStatus] = useState('verifying'); // verifying | valid | invalid
  const [userId, setUserId]           = useState('');

  const [formData, setFormData] = useState({
    newPassword:     '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({ new: false, confirm: false });

  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState('');
  const [success, setSuccess] = useState(false);

  const passwordStrength = getPasswordStrength(formData.newPassword);

  // ── Verify token on mount ──────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setTokenStatus('invalid');
      return;
    }
    const verify = async () => {
      try {
        const res = await axios.post(`${API_BASE_URL}/auth/verify-reset-token`, { token });
        if (res.data.success && res.data.userId) {
          setUserId(res.data.userId);
          setTokenStatus('valid');
        } else {
          setTokenStatus('invalid');
        }
      } catch {
        setTokenStatus('invalid');
      }
    };
    verify();
  }, [token]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleChange = (field) => (e) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  const toggleVisibility = (field) =>
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));

  const handleSave = async () => {
    setError('');

    if (!formData.newPassword || !formData.confirmPassword) {
      setError('Both password fields are required');
      return;
    }
    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        token,
        newPassword: formData.newPassword
      });
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2500);
      } else {
        setError(res.data.error || 'Password reset failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setSaving(false);
    }
  };

  // ── Render: verifying ──────────────────────────────────────────────────────
  if (tokenStatus === 'verifying') {
    return (
      <Box sx={centerFullPage}>
        <CircularProgress size={52} sx={{ color: '#fff' }} />
        <Typography variant="body1" sx={{ color: '#fff', mt: 2 }}>
          Verifying your reset link…
        </Typography>
      </Box>
    );
  }

  // ── Render: invalid / expired token ───────────────────────────────────────
  if (tokenStatus === 'invalid') {
    return (
      <Box sx={centerFullPage}>
        <Zoom in>
          <Paper elevation={24} sx={cardStyle}>
            <ErrorOutline sx={{ fontSize: 70, color: '#ef5350', mb: 2 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom color="error">
              Invalid or Expired Link
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              This password reset link is invalid or has already expired.
              Please request a new one.
            </Typography>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={() => navigate(-1)}
                sx={outlineBtn}
              >
                Go Back
              </Button>
              <Button
                variant="contained"
                onClick={() => navigate('/reset-password')}
                sx={primaryBtn}
              >
                Request New Link
              </Button>
            </Box>
          </Paper>
        </Zoom>
      </Box>
    );
  }

  // ── Render: success ────────────────────────────────────────────────────────
  if (success) {
    return (
      <Box sx={{ ...centerFullPage, background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' }}>
        <Zoom in>
          <Paper elevation={24} sx={cardStyle}>
            <CheckCircle sx={{ fontSize: 80, color: '#11998e', mb: 2 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Password Reset!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
              Your password has been updated successfully.
              Redirecting to login…
            </Typography>
            <CircularProgress size={28} />
          </Paper>
        </Zoom>
      </Box>
    );
  }

  // ── Render: main form ──────────────────────────────────────────────────────
  return (
    <Box sx={centerFullPage}>
      <Container maxWidth="sm">
        <Zoom in timeout={600}>
          <Paper elevation={24} sx={{ ...formCard }}>

            {/* Header */}
            <Box textAlign="center" mb={4}>
              <Box sx={iconCircle}>
                <VpnKey sx={{ fontSize: 38, color: 'white' }} />
              </Box>
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(45deg, #0f2027, #2c5364)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 0.5
                }}
              >
                Set New Password
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Choose a strong password for your account
              </Typography>
            </Box>

            {/* UserId — display only */}
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 3,
                borderRadius: 2,
                background: '#f5f5f5',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                border: '1px solid #e0e0e0'
              }}
            >
              <PersonOutline sx={{ color: '#546e7a' }} />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" lineHeight={1}>
                  Resetting password for
                </Typography>
                <Typography variant="body1" fontWeight={700} color="#263238">
                  {userId}
                </Typography>
              </Box>
              <Chip
                label="Verified"
                size="small"
                color="success"
                variant="outlined"
                sx={{ ml: 'auto', fontWeight: 700, fontSize: '0.65rem' }}
              />
            </Paper>

            {/* Error */}
            {error && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            {/* New Password */}
            <TextField
              fullWidth
              label="New Password"
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={handleChange('newPassword')}
              disabled={saving}
              margin="normal"
              helperText="Minimum 6 characters"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleVisibility('new')} edge="end">
                      {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 1 }}
            />

            {/* Password strength */}
            {formData.newPassword && (
              <Fade in>
                <Box sx={{ mb: 2 }}>
                  <Box display="flex" justifyContent="space-between" mb={0.5}>
                    <Typography variant="caption" color="text.secondary">Password Strength</Typography>
                    <Typography variant="caption" color={`${passwordStrength.color}.main`} fontWeight={600}>
                      {passwordStrength.label}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={passwordStrength.strength}
                    color={passwordStrength.color}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Fade>
            )}

            {/* Confirm Password */}
            <TextField
              fullWidth
              label="Confirm New Password"
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              disabled={saving}
              margin="normal"
              error={
                !!(formData.confirmPassword && formData.newPassword !== formData.confirmPassword)
              }
              helperText={
                formData.confirmPassword && formData.newPassword !== formData.confirmPassword
                  ? 'Passwords do not match'
                  : ''
              }
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => toggleVisibility('confirm')} edge="end">
                      {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 3 }}
            />

            {/* Buttons */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
                disabled={saving}
                sx={outlineBtn}
              >
                Cancel
              </Button>

              <Button
                fullWidth
                variant="contained"
                disabled={saving}
                startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveRounded />}
                onClick={handleSave}
                sx={primaryBtn}
              >
                {saving ? 'Saving…' : 'Save Password'}
              </Button>
            </Box>

          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

// ── Style constants ───────────────────────────────────────────────────────────
const centerFullPage = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
  py: 4
};

const cardStyle = {
  p: 5,
  borderRadius: 4,
  textAlign: 'center',
  maxWidth: 420,
  background: 'rgba(255,255,255,0.97)'
};

const formCard = {
  p: { xs: 3, sm: 5 },
  borderRadius: 4,
  background: 'rgba(255,255,255,0.97)',
  backdropFilter: 'blur(10px)'
};

const iconCircle = {
  width: 80,
  height: 80,
  margin: '0 auto 16px',
  background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
  borderRadius: '50%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 8px 24px rgba(15,32,39,0.35)'
};

const primaryBtn = {
  py: 1.5,
  background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
  fontWeight: 700,
  borderRadius: 2,
  textTransform: 'none',
  boxShadow: '0 4px 12px rgba(15,32,39,0.3)',
  '&:hover': {
    background: 'linear-gradient(135deg, #1a3a4a 0%, #3a6a80 100%)',
    transform: 'translateY(-2px)'
  },
  transition: 'all 0.3s ease'
};

const outlineBtn = {
  py: 1.5,
  borderWidth: 2,
  fontWeight: 600,
  borderRadius: 2,
  textTransform: 'none',
  borderColor: '#546e7a',
  color: '#546e7a',
  '&:hover': { borderColor: '#263238', color: '#263238' }
};

export default PasswordReset;