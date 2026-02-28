import React, { useState } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Container,
  Link,
  Divider,
  Fade,
  Zoom
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Login as LoginIcon,
  PersonAdd,
  VpnKey
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!userId || !password) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);

    const result = await login(userId, password);

    setLoading(false);

    if (result.success) {
      localStorage.setItem('userId', userId);
      
      navigate('/dashboard');
    } else {
      setError(result.error || 'Login failed');
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: '-50%',
          right: '-50%',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
          animation: 'float 6s ease-in-out infinite'
        },
        '@keyframes float': {
          '0%, 100%': { transform: 'translate(0, 0)' },
          '50%': { transform: 'translate(-20px, -20px)' }
        }
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
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '6px',
                background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb, #4facfe)'
              }
            }}
          >
            {/* Logo/Title */}
            <Fade in timeout={1000}>
              <Box textAlign="center" mb={4}>
                <Box
                  sx={{
                    width: 80,
                    height: 80,
                    margin: '0 auto 16px',
                    background: 'linear-gradient(135deg, #f04ba5 0%, #f107d2 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <LoginIcon sx={{ fontSize: 50, color: 'white' }} />
                </Box>
                
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 800,
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    mb: 1,
                    fontSize: { xs: '2rem', sm: '3rem' }
                  }}
                >
                  MO Approval
                </Typography>
                <Typography 
                  variant="subtitle1" 
                  color="text.secondary"
                  sx={{ fontWeight: 500 }}
                >
                  Maintenance Order System
                </Typography>
              </Box>
            </Fade>

            {/* Error Alert */}
            {error && (
              <Fade in>
                <Alert 
                  severity="error" 
                  sx={{ 
                    mb: 3,
                    borderRadius: 2,
                    '& .MuiAlert-icon': {
                      fontSize: 28
                    }
                  }}
                >
                  {error}
                </Alert>
              </Fade>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="User ID"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                margin="normal"
                autoFocus
                disabled={loading}
                sx={{
                  mb: 1,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                      borderWidth: 5
                    }
                  }
                }}
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                disabled={loading}
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
                sx={{
                  mb: 2,
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                    '&:hover fieldset': {
                      borderColor: '#667eea'
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#667eea',
                      borderWidth: 2
                    }
                  }
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                disabled={loading}
                startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <LoginIcon />}
                sx={{
                  py: 1,
                  background: 'linear-gradient(45deg, #fa6ddb 30%, #fffb24 90%)',
                  boxShadow: '0 4px 12px rgba(241, 95, 222, 0.4)',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    background: 'linear-gradient(45deg, #f061f0 30%, #653a8b 90%)',
                    boxShadow: '0 6px 16px rgba(102, 126, 234, .5)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </form>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color='#0348ca' fontWeight={600}>
                OR
              </Typography>
            </Divider>

            {/* Additional Actions */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<PersonAdd />}
                onClick={() => navigate('/create-user')}
                sx={{
                  py: 1,
                  borderWidth: 2,
                  borderColor: '#4facfe',
                  color: '#1c94fd',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: '#4facfe',
                    backgroundColor: 'rgba(79, 172, 254, 0.08)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Create New Account
              </Button>
<div className="password-actions" style={{ display: 'flex', flexDirection: 'row', gap: '16px' }}>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<VpnKey />}
                onClick={() => navigate('/update-password')}
                sx={{
                  py: 1.5,
                  borderWidth: 2,
                  borderColor: '#f093fb',
                  color: '#e9390d',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(240, 147, 251, 0.45)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Update Password
              </Button>
              <Button
                fullWidth
                variant="outlined"
                size="large"
                startIcon={<VpnKey />}
                onClick={() => navigate('/reset-password')}
                sx={{
                  py: 1.5,
                  borderWidth: 2,
                  borderColor: '#f093fb',
                  color: '#4f0de9',
                  fontWeight: 600,
                  borderRadius: 2,
                  textTransform: 'none',
                  '&:hover': {
                    borderWidth: 2,
                    borderColor: '#f093fb',
                    backgroundColor: 'rgba(128, 243, 124, 0.70)',
                    transform: 'translateY(-2px)'
                  },
                  transition: 'all 0.3s ease'
                }}
              >
                Reset Password
              </Button>
</div>
            </Box>

            {/* Info */}
            <Box mt={4} textAlign="center">
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
                  borderRadius: 2
                }}
              >
                <Typography variant="caption" color="text.secondary" display="block" fontWeight={500}>
                  📝 Default Test Credentials
                </Typography>
                <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
                  Username: <span style={{ color: '#667eea' }}>admin</span> | 
                  Password: <span style={{ color: '#667eea' }}> admin123</span>
                </Typography>
              </Paper>
            </Box>
          </Paper>
        </Zoom>
      </Container>
    </Box>
  );
};

export default Login;


// import React, { useState } from 'react';
// import {
//   Box,
//   Paper,
//   TextField,
//   Button,
//   Typography,
//   Alert,
//   CircularProgress,
//   InputAdornment,
//   IconButton,
//   Container,
//   Link,
//   Divider,
//   Fade,
//   Zoom
// } from '@mui/material';
// import {
//   Visibility,
//   VisibilityOff,
//   Login as LoginIcon,
//   PersonAdd,
//   VpnKey
// } from '@mui/icons-material';
// import { useAuth } from '../context/AuthContext';
// import { useNavigate } from 'react-router-dom';

// const Login = () => {
//   const [userId, setUserId] = useState('');
//   const [password, setPassword] = useState('');
//   const [showPassword, setShowPassword] = useState(false);
//   const [error, setError] = useState('');
//   const [loading, setLoading] = useState(false);

//   const { login } = useAuth();
//   const navigate = useNavigate();

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError('');

//     if (!userId || !password) {
//       setError('Please enter both username and password');
//       return;
//     }

//     setLoading(true);

//     const result = await login(userId, password);

//     setLoading(false);

//     if (result.success) {
//       localStorage.setItem('userId', userId);
      
//       navigate('/dashboard');
//     } else {
//       setError(result.error || 'Login failed');
//     }
//   };

//   return (
//     <Box
//       sx={{
//         minHeight: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
//         position: 'relative',
//         overflow: 'hidden',
//         '&::before': {
//           content: '""',
//           position: 'absolute',
//           top: '-50%',
//           right: '-50%',
//           width: '100%',
//           height: '100%',
//           background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
//           animation: 'float 6s ease-in-out infinite'
//         },
//         '@keyframes float': {
//           '0%, 100%': { transform: 'translate(0, 0)' },
//           '50%': { transform: 'translate(-20px, -20px)' }
//         }
//       }}
//     >
//       <Container maxWidth="sm">
//         <Zoom in timeout={800}>
//           <Paper
//             elevation={24}
//             sx={{
//               p: { xs: 3, sm: 5 },
//               borderRadius: 4,
//               background: 'rgba(255, 255, 255, 0.95)',
//               backdropFilter: 'blur(10px)',
//               position: 'relative',
//               overflow: 'hidden',
//               '&::before': {
//                 content: '""',
//                 position: 'absolute',
//                 top: 0,
//                 left: 0,
//                 right: 0,
//                 height: '6px',
//                 background: 'linear-gradient(90deg, #667eea, #764ba2, #f093fb, #4facfe)'
//               }
//             }}
//           >
//             {/* Logo/Title */}
//             <Fade in timeout={1000}>
//               <Box textAlign="center" mb={4}>
//                 <Box
//                   sx={{
//                     width: 80,
//                     height: 80,
//                     margin: '0 auto 16px',
//                     background: 'linear-gradient(135deg, #f04ba5 0%, #f107d2 100%)',
//                     borderRadius: '50%',
//                     display: 'flex',
//                     alignItems: 'center',
//                     justifyContent: 'center',
//                     boxShadow: '0 8px 16px rgba(102, 126, 234, 0.3)'
//                   }}
//                 >
//                   <LoginIcon sx={{ fontSize: 50, color: 'white' }} />
//                 </Box>
                
//                 <Typography
//                   variant="h3"
//                   sx={{
//                     fontWeight: 800,
//                     background: 'linear-gradient(45deg, #667eea, #764ba2)',
//                     WebkitBackgroundClip: 'text',
//                     WebkitTextFillColor: 'transparent',
//                     mb: 1,
//                     fontSize: { xs: '2rem', sm: '3rem' }
//                   }}
//                 >
//                   MO Approval
//                 </Typography>
//                 <Typography 
//                   variant="subtitle1" 
//                   color="text.secondary"
//                   sx={{ fontWeight: 500 }}
//                 >
//                   Maintenance Order System
//                 </Typography>
//               </Box>
//             </Fade>

//             {/* Error Alert */}
//             {error && (
//               <Fade in>
//                 <Alert 
//                   severity="error" 
//                   sx={{ 
//                     mb: 3,
//                     borderRadius: 2,
//                     '& .MuiAlert-icon': {
//                       fontSize: 28
//                     }
//                   }}
//                 >
//                   {error}
//                 </Alert>
//               </Fade>
//             )}

//             {/* Login Form */}
//             <form onSubmit={handleSubmit}>
//               <TextField
//                 fullWidth
//                 label="User ID"
//                 value={userId}
//                 onChange={(e) => setUserId(e.target.value)}
//                 margin="normal"
//                 autoFocus
//                 disabled={loading}
//                 sx={{
//                   mb: 1,
//                   '& .MuiOutlinedInput-root': {
//                     borderRadius: 2,
//                     '&:hover fieldset': {
//                       borderColor: '#667eea'
//                     },
//                     '&.Mui-focused fieldset': {
//                       borderColor: '#667eea',
//                       borderWidth: 5
//                     }
//                   }
//                 }}
//               />

//               <TextField
//                 fullWidth
//                 label="Password"
//                 type={showPassword ? 'text' : 'password'}
//                 value={password}
//                 onChange={(e) => setPassword(e.target.value)}
//                 margin="normal"
//                 disabled={loading}
//                 InputProps={{
//                   endAdornment: (
//                     <InputAdornment position="end">
//                       <IconButton
//                         onClick={() => setShowPassword(!showPassword)}
//                         edge="end"
//                       >
//                         {showPassword ? <VisibilityOff /> : <Visibility />}
//                       </IconButton>
//                     </InputAdornment>
//                   )
//                 }}
//                 sx={{
//                   mb: 2,
//                   '& .MuiOutlinedInput-root': {
//                     borderRadius: 2,
//                     '&:hover fieldset': {
//                       borderColor: '#667eea'
//                     },
//                     '&.Mui-focused fieldset': {
//                       borderColor: '#667eea',
//                       borderWidth: 2
//                     }
//                   }
//                 }}
//               />

//               <Button
//                 fullWidth
//                 type="submit"
//                 variant="contained"
//                 size="large"
//                 disabled={loading}
//                 startIcon={loading ? <CircularProgress size={15} color="inherit" /> : <LoginIcon />}
//                 sx={{
//                   py: 1,
//                   background: 'linear-gradient(45deg, #fa6ddb 30%, #fffb24 90%)',
//                   boxShadow: '0 4px 12px rgba(241, 95, 222, 0.4)',
//                   fontSize: '1.1rem',
//                   fontWeight: 700,
//                   borderRadius: 2,
//                   textTransform: 'none',
//                   '&:hover': {
//                     background: 'linear-gradient(45deg, #f061f0 30%, #653a8b 90%)',
//                     boxShadow: '0 6px 16px rgba(102, 126, 234, .5)',
//                     transform: 'translateY(-2px)'
//                   },
//                   transition: 'all 0.3s ease'
//                 }}
//               >
//                 {loading ? 'Signing In...' : 'Sign In'}
//               </Button>
//             </form>

//             <Divider sx={{ my: 2 }}>
//               <Typography variant="body2" color='#0348ca' fontWeight={600}>
//                 OR
//               </Typography>
//             </Divider>

//             {/* Additional Actions */}
//             <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
//               <Button
//                 fullWidth
//                 variant="outlined"
//                 size="large"
//                 startIcon={<PersonAdd />}
//                 onClick={() => navigate('/create-user')}
//                 sx={{
//                   py: 1,
//                   borderWidth: 2,
//                   borderColor: '#4facfe',
//                   color: '#1c94fd',
//                   fontWeight: 600,
//                   borderRadius: 2,
//                   textTransform: 'none',
//                   '&:hover': {
//                     borderWidth: 2,
//                     borderColor: '#4facfe',
//                     backgroundColor: 'rgba(79, 172, 254, 0.08)',
//                     transform: 'translateY(-2px)'
//                   },
//                   transition: 'all 0.3s ease'
//                 }}
//               >
//                 Create New Account
//               </Button>

//               <Button
//                 fullWidth
//                 variant="outlined"
//                 size="large"
//                 startIcon={<VpnKey />}
//                 onClick={() => navigate('/update-password')}
//                 sx={{
//                   py: 1.5,
//                   borderWidth: 2,
//                   borderColor: '#f093fb',
//                   color: '#e9390d',
//                   fontWeight: 600,
//                   borderRadius: 2,
//                   textTransform: 'none',
//                   '&:hover': {
//                     borderWidth: 2,
//                     borderColor: '#f093fb',
//                     backgroundColor: 'rgba(240, 147, 251, 0.08)',
//                     transform: 'translateY(-2px)'
//                   },
//                   transition: 'all 0.3s ease'
//                 }}
//               >
//                 Update Password
//               </Button>
//             </Box>

//             {/* Info */}
//             <Box mt={4} textAlign="center">
//               <Paper
//                 elevation={0}
//                 sx={{
//                   p: 2,
//                   background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
//                   borderRadius: 2
//                 }}
//               >
//                 <Typography variant="caption" color="text.secondary" display="block" fontWeight={500}>
//                   📝 Default Test Credentials
//                 </Typography>
//                 <Typography variant="body2" fontWeight={600} sx={{ mt: 1 }}>
//                   Username: <span style={{ color: '#667eea' }}>admin</span> | 
//                   Password: <span style={{ color: '#667eea' }}> admin123</span>
//                 </Typography>
//               </Paper>
//             </Box>
//           </Paper>
//         </Zoom>
//       </Container>
//     </Box>
//   );
// };

// export default Login;
