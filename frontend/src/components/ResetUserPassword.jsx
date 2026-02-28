import React, { useState } from 'react';
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
  Chip
} from '@mui/material';
import {
  LockReset,
  PersonSearch,
  Email,
  ArrowBack,
  SendRounded,
  CheckCircleOutline
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

// Helper: mask email for display  e.g. b***t@ampl.in
const maskEmail = (email) => {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}*@${domain}`;
  return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
};

const ResetUserPassword = () => {
  const navigate = useNavigate();

  const [userId, setUserId]           = useState('');
  const [fetchedUser, setFetchedUser] = useState(null); // { userId, email, name }
  const [fetching, setFetching]       = useState(false);
  const [sending, setSending]         = useState(false);
  const [fetchError, setFetchError]   = useState('');
  const [sendError, setSendError]     = useState('');
  const [mailSent, setMailSent]       = useState(false);

  // ── Step 1: Lookup userId ──────────────────────────────────────────────────
  const handleFetchUser = async () => {
    if (!userId.trim()) {
      setFetchError('Please enter a User ID');
      return;
    }
    setFetchError('');
    setFetchedUser(null);
    setFetching(true);
    try {
      const res = await axios.get(`${API_BASE_URL}/auth/user/${userId.trim()}`);
      if (res.data.success && res.data.user) {
        setFetchedUser(res.data.user);
      } else {
        setFetchError('Invalid User ID – no matching user found');
      }
    } catch (err) {
      setFetchError(
        err.response?.status === 404
          ? 'Invalid User ID – no matching user found'
          : err.response?.data?.error || 'Failed to fetch user details'
      );
    } finally {
      setFetching(false);
    }
  };

  const handleUserIdKeyDown = (e) => {
    if (e.key === 'Enter') handleFetchUser();
  };

  // ── Step 2: Send reset email ───────────────────────────────────────────────
  const handleSendResetMail = async () => {
    setSendError('');
    setSending(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/auth/send-reset-email`, {
        userId: fetchedUser.userId
      });
      if (res.data.success) {
        setMailSent(true);
      } else {
        setSendError(res.data.error || 'Failed to send reset email');
      }
    } catch (err) {
      setSendError(err.response?.data?.error || 'Failed to send reset email');
    } finally {
      setSending(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (mailSent) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)'
        }}
      >
        <Zoom in>
          <Paper
            elevation={24}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: 420,
              background: 'rgba(255,255,255,0.97)'
            }}
          >
            <CheckCircleOutline sx={{ fontSize: 80, color: '#43e97b', mb: 2 }} />
            <Typography variant="h5" fontWeight={800} gutterBottom>
              Reset Email Sent!
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              A password reset link has been sent to
            </Typography>
            <Chip
              icon={<Email fontSize="small" />}
              label={maskEmail(fetchedUser?.email)}
              color="primary"
              variant="outlined"
              sx={{ mb: 3, fontWeight: 600 }}
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mb: 3 }}>
              Please check your inbox and follow the link to reset your password.
              The link will expire in 30 minutes.
            </Typography>
            <Button
              variant="outlined"
              startIcon={<ArrowBack />}
              onClick={() => navigate('/login')}
              sx={{ textTransform: 'none', fontWeight: 600, borderRadius: 2 }}
            >
              Back to Login
            </Button>
          </Paper>
        </Zoom>
      </Box>
    );
  }

  // ── Main form ──────────────────────────────────────────────────────────────
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Zoom in timeout={600}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(10px)'
            }}
          >
            {/* Header */}
            <Box textAlign="center" mb={4}>
              <Box
                sx={{
                  width: 80,
                  height: 80,
                  margin: '0 auto 16px',
                  background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 24px rgba(15,32,39,0.35)'
                }}
              >
                <LockReset sx={{ fontSize: 40, color: 'white' }} />
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
                Reset Password
              </Typography>
              <Typography variant="subtitle2" color="text.secondary">
                Enter your User ID to receive a reset link
              </Typography>
            </Box>

            {/* Step 1 — User ID lookup */}
            <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
              <TextField
                fullWidth
                label="User ID"
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setFetchError('');
                  setFetchedUser(null);
                }}
                onKeyDown={handleUserIdKeyDown}
                disabled={fetching || sending}
                autoFocus
                size="medium"
                placeholder="e.g. AMPLCONS"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <PersonSearch color="action" />
                    </InputAdornment>
                  )
                }}
              />
              <Button
                variant="contained"
                onClick={handleFetchUser}
                disabled={fetching || !userId.trim()}
                sx={{
                  minWidth: 100,
                  background: 'linear-gradient(135deg, #0f2027 0%, #2c5364 100%)',
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  whiteSpace: 'nowrap',
                  boxShadow: '0 4px 12px rgba(15,32,39,0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #1a3a4a 0%, #3a6a80 100%)',
                    transform: 'translateY(-1px)'
                  },
                  transition: 'all 0.2s ease'
                }}
              >
                {fetching ? <CircularProgress size={20} color="inherit" /> : 'Verify'}
              </Button>
            </Box>

            {/* Fetch error */}
            {fetchError && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {fetchError}
                </Alert>
              </Fade>
            )}

            {/* User found — show masked email */}
            {fetchedUser && (
              <Fade in>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2.5,
                    mb: 3,
                    borderRadius: 2,
                    background: 'linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%)',
                    border: '1px solid #80deea',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2
                  }}
                >
                  <CheckCircleOutline sx={{ color: '#00897b', fontSize: 28, flexShrink: 0 }} />
                  <Box>
                    <Typography variant="body2" fontWeight={700} color="#004d40">
                      User found: {fetchedUser.name}
                    </Typography>
                    <Typography variant="caption" color="#00695c" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Email sx={{ fontSize: 13 }} />
                      Reset link will be sent to&nbsp;<strong>{maskEmail(fetchedUser.email)}</strong>
                    </Typography>
                  </Box>
                </Paper>
              </Fade>
            )}

            {/* Send error */}
            {sendError && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                  {sendError}
                </Alert>
              </Fade>
            )}

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: fetchedUser ? 0 : 2 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<ArrowBack />}
                onClick={() => navigate(-1)}
                disabled={sending}
                sx={{
                  py: 1.5,
                  borderWidth: 2,
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  borderColor: '#546e7a',
                  color: '#546e7a',
                  '&:hover': { borderColor: '#263238', color: '#263238' }
                }}
              >
                Cancel
              </Button>

              <Button
                fullWidth
                variant="contained"
                disabled={!fetchedUser || sending}
                startIcon={sending ? <CircularProgress size={20} color="inherit" /> : <SendRounded />}
                onClick={handleSendResetMail}
                sx={{
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
                }}
              >
                {sending ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Box>

            {/* Info note */}
            <Paper
              elevation={0}
              sx={{
                mt: 4,
                p: 2,
                background: 'linear-gradient(135deg, #fff8e1 0%, #ffe082 100%)',
                borderRadius: 2
              }}
            >
              <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                ℹ️ How it works:
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                • Enter your User ID and click <strong>Verify</strong> to confirm your account<br />
                • Click <strong>Send Reset Link</strong> to receive an email with a secure reset link<br />
                • The link expires in <strong>30 minutes</strong> for your security
              </Typography>
            </Paper>
          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

export default ResetUserPassword;