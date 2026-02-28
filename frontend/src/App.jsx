import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import Login from './components/Login';
import CreateUser from './components/CreateUser';
import UpdatePassword from './components/UpdatePassword';
import MoApproval from './components/MoApproval';
import MoDashboard from './components/MoDashboard';
import MoSelected from './components/MoSelected';
import ProtectedRoute from './components/ProtectedRoute';
import ResetUserPassword from './components/ResetUserPassword';
import PasswordReset from './components/PasswordReset';

const theme = createTheme({
  palette: {
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/create-user" element={<CreateUser />} />
 
 
            <Route path="/update-password" element={<UpdatePassword />} />
            <Route path="/reset-password" element={<ResetUserPassword />} />
            <Route path="/change-password" element={<PasswordReset />} />



            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <MoDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mo-approval" 
              element={
                <ProtectedRoute>
                  <MoApproval />
                </ProtectedRoute>
              }
            />
            <Route
              path="/mo-selected"
              element={
                <ProtectedRoute>
                  <MoSelected/>
                </ProtectedRoute>
              }
            />

            {/* Default Route - Redirect to Login */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            
            {/* Catch All - Redirect to Dashboard if authenticated, else Login */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;