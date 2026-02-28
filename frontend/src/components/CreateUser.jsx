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
  MenuItem,
  InputAdornment,
  IconButton,
  Zoom,
  Fade,
  Stepper,
  Step,
  StepLabel
} from '@mui/material';
import {
  PersonAdd,
  Visibility,
  VisibilityOff,
  ArrowBack,
  CheckCircle
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

const CreateUser = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    userId: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    role: 'user',
    plant: ''
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const steps = ['Account Info', 'User Details', 'Review'];

  const roles = [
    { value: 'admin', label: 'Administrator' },
    { value: 'approver', label: 'Approver' },
    { value: 'user', label: 'User' }
  ];

  const plants = [
    { value: '3117', label: 'Plant 3117' },
    { value: '3115', label: 'Plant 3115' },
    { value: 'ALL', label: 'All Plants' }
  ];

  const handleChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
    setError('');
  };

  const validateStep = () => {
    if (activeStep === 0) {
      if (!formData.userId || !formData.password || !formData.confirmPassword) {
        setError('All fields are required');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return false;
      }
    }

    if (activeStep === 1) {
      if (!formData.name || !formData.email) {
        setError('Name and email are required');
        return false;
      }
      if (!/\S+@\S+\.\S+/.test(formData.email)) {
        setError('Please enter a valid email address');
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setActiveStep((prev) => prev + 1);
      setError('');
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
    setError('');
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        {
          userId: formData.userId,
          password: formData.password,
          name: formData.name,
          email: formData.email,
          role: formData.role,
          plant: formData.plant
        }
      );

      if (response.data.success) {
        setSuccess(true);
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        setError(response.data.error || 'User creation failed');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return (
          <Fade in timeout={500}>
            <Box>
              <TextField
                fullWidth
                label="User ID"
                value={formData.userId}
                onChange={handleChange('userId')}
                margin="normal"
                autoFocus
                disabled={loading}
                helperText="Choose a unique username"
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={handleChange('password')}
                margin="normal"
                disabled={loading}
                helperText="Minimum 6 characters"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Confirm Password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={handleChange('confirmPassword')}
                margin="normal"
                disabled={loading}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  )
                }}
              />
            </Box>
          </Fade>
        );

      case 1:
        return (
          <Fade in timeout={500}>
            <Box>
              <TextField
                fullWidth
                label="Full Name"
                value={formData.name}
                onChange={handleChange('name')}
                margin="normal"
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange('email')}
                margin="normal"
                disabled={loading}
                sx={{ mb: 2 }}
              />

              <TextField
                fullWidth
                select
                label="Role"
                value={formData.role}
                onChange={handleChange('role')}
                margin="normal"
                disabled={loading}
                sx={{ mb: 2 }}
              >
                {roles.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                fullWidth
                select
                label="Plant"
                value={formData.plant}
                onChange={handleChange('plant')}
                margin="normal"
                disabled={loading}
              >
                {plants.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Fade>
        );

      case 2:
        return (
          <Fade in timeout={500}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                borderRadius: 2
              }}
            >
              <Typography variant="h6" gutterBottom fontWeight={600} color="primary">
                Review Your Information
              </Typography>
              
              <Box sx={{ mt: 2, display: 'grid', gap: 2 }}>
                <Box>
                  <Typography variant="caption" color="text.secondary">User ID</Typography>
                  <Typography variant="body1" fontWeight={600}>{formData.userId}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">Full Name</Typography>
                  <Typography variant="body1" fontWeight={600}>{formData.name}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body1" fontWeight={600}>{formData.email}</Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">Role</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {roles.find(r => r.value === formData.role)?.label}
                  </Typography>
                </Box>
                
                <Box>
                  <Typography variant="caption" color="text.secondary">Plant</Typography>
                  <Typography variant="body1" fontWeight={600}>
                    {plants.find(p => p.value === formData.plant)?.label || 'Not specified'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Fade>
        );

      default:
        return null;
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
              Success!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your account has been created successfully.
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
        background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        py: 4
      }}
    >
      <Container maxWidth="md">
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
                  background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 8px 16px rgba(79, 172, 254, 0.3)'
                }}
              >
                <PersonAdd sx={{ fontSize: 40, color: 'white' }} />
              </Box>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 800,
                  background: 'linear-gradient(45deg, #4facfe, #00f2fe)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  mb: 1
                }}
              >
                Create New Account
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Join the MO Approval System
              </Typography>
            </Box>

            {/* Stepper */}
            <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Form Content */}
            <Box sx={{ minHeight: 300 }}>
              {renderStepContent()}
            </Box>

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', gap: 2, mt: 4 }}>
              {activeStep === 0 ? (
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ArrowBack />}
                  onClick={() => navigate('/login')}
                  sx={{
                    py: 1.5,
                    borderWidth: 2,
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Back to Login
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={handleBack}
                  disabled={loading}
                  sx={{
                    py: 1.5,
                    borderWidth: 2,
                    fontWeight: 600,
                    borderRadius: 2,
                    textTransform: 'none'
                  }}
                >
                  Back
                </Button>
              )}

              <Button
                fullWidth
                variant="contained"
                onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
                disabled={loading}
                startIcon={loading && <CircularProgress size={20} color="inherit" />}
                sx={{
                  py: 1.5,
                  background: 'linear-gradient(45deg, #4facfe 30%, #00f2fe 90%)',
                  boxShadow: '0 4px 12px rgba(79, 172, 254, .4)',
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #3d8cd3 30%, #00d8e5 90%)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {activeStep === steps.length - 1 ? 'Create Account' : 'Next'}
              </Button>
            </Box>
          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

export default CreateUser;