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
  LinearProgress
} from '@mui/material';
import {
  VpnKey,
  Visibility,
  VisibilityOff,
  ArrowBack,
  CheckCircle
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const UpdatePassword = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [showPasswords, setShowPasswords] = useState({
    old: false,
    new: false,
    confirm: false
  });

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const getPasswordStrength = (password) => {
    if (!password) return { strength: 0, label: '', color: '' };
    
    let strength = 0;
    if (password.length >= 6) strength += 25;
    if (password.length >= 10) strength += 25;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength += 25;
    if (/\d/.test(password)) strength += 25;
    
    let label = '';
    let color = '';
    if (strength <= 25) { label = 'Weak'; color = 'error'; }
    else if (strength <= 50) { label = 'Fair'; color = 'warning'; }
    else if (strength <= 75) { label = 'Good'; color = 'info'; }
    else { label = 'Strong'; color = 'success'; }
    
    return { strength, label, color };
  };

  const passwordStrength = getPasswordStrength(formData.newPassword);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.userId || !formData.oldPassword || !formData.newPassword || !formData.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (formData.oldPassword === formData.newPassword) {
      setError('New password must be different from old password');
      return;
    }

    setLoading(true);

    try {
      // First, authenticate to get token
      const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
        userId: formData.userId,
        password: formData.oldPassword
      });

      if (!loginResponse.data.success) {
        setError('Invalid username or current password');
        setLoading(false);
        return;
      }

      const token = loginResponse.data.token;

      // Then change password
      const response = await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        {
          oldPassword: formData.oldPassword,
          newPassword: formData.newPassword
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.error || 'Password update failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
        }}
      >
        <Zoom in>
          <Paper
            elevation={24}
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 4,
              maxWidth: 400
            }}
          >
            <CheckCircle sx={{ fontSize: 80, color: '#38ef7d', mb: 2 }} />
            <Typography variant="h4" fontWeight={700} gutterBottom>
              Password Updated!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your password has been changed successfully.
              Redirecting to login...
            </Typography>
            <CircularProgress />
          </Paper>
        </Zoom>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        py: 4
      }}
    >
      <Container maxWidth="sm">
        <Zoom in timeout={800}>
          <Paper
            elevation={24}
            sx={{
              p: { xs: 3, sm: 5 },
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.95)',
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
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(240, 147, 251, 0.3)'
                }}
              >
                <VpnKey sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(45deg, #f093fb, #f5576c)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Update Password
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Change your account password
              </Typography>
            </Box>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="User ID"
                value={formData.userId}
                onChange={handleChange('userId')}
                margin="normal"
                autoFocus
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Current Password"
                type={showPasswords.old ? 'text' : 'password'}
                value={formData.oldPassword}
                onChange={handleChange('oldPassword')}
                margin="normal"
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('old')}
                        edge="end"
                      >
                        {showPasswords.old ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="New Password"
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={handleChange('newPassword')}
                margin="normal"
                disabled={loading}
                helperText="Minimum 6 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('new')}
                        edge="end"
                      >
                        {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 1 }}
              />

              {/* Password Strength Indicator */}
              {formData.newPassword && (
                <Fade in>
                  <Box sx={{ mb: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={0.5}>
                      <Typography variant="caption" color="text.secondary">
                        Password Strength
                      </Typography>
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

              <TextField
                fullWidth
                label="Confirm New Password"
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                margin="normal"
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => togglePasswordVisibility('confirm')}
                        edge="end"
                      >
                        {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 3 }}
              />

              <Box sx={{ display: 'flex', gap: 2 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/login')}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderWidth: 2,
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Cancel
                </Button>

                <Button
                  fullWidth
                  type="submit"
                  variant="contained"
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <VpnKey />}
                  sx={{
                    py: 1.5,
                    background: 'linear-gradient(45deg, #f093fb 30%, #f5576c 90%)',
                    boxShadow: '0 4px 12px rgba(240, 147, 251, .4)',
                    fontWeight: 700,
                    borderRadius: 2,
                    textTransform: 'none',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #d67ce0 30%, #dc4459 90%)',
                      transform: 'translateY(-2px)'
                    },
                    transition: 'all 0.3s ease'
                  }}
                >
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </Box>
            </form>

            {/* Security Tips */}
            <Paper
              elevation={0}
              sx={{
                mt: 4,
                p: 2,
                background: 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                borderRadius: 2
              }}
            >
              <Typography variant="caption" display="block" fontWeight={600} gutterBottom>
                🔒 Password Security Tips:
              </Typography>
              <Typography variant="caption" display="block" color="text.secondary">
                • Use at least 6 characters<br />
                • Mix uppercase and lowercase letters<br />
                • Include numbers and special characters<br />
                • Don't reuse old passwords
              </Typography>
            </Paper>
          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

export default UpdatePassword;