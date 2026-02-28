import React, { useState, useEffect } from 'react';
import { Box, Alert, Button, CircularProgress } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import { moApprovalService } from '../services/odataService';

const ConnectionTest = () => {
  const [status, setStatus] = useState('testing');
  const [health, setHealth] = useState(null);
  const [error, setError] = useState(null);

  const testConnection = async () => {
    setStatus('testing');
    setError(null);
    
    try {
      const healthData = await moApprovalService.healthCheck();
      setHealth(healthData);
      setStatus('connected');
      console.log('✅ Backend Health:', healthData);
    } catch (err) {
      setStatus('error');
      setError(err.message);
      console.error('❌ Connection test failed:', err);
    }
  };

  useEffect(() => {
    testConnection();
  }, []);

  if (status === 'testing') {
    return (
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <CircularProgress size={24} />
        <Alert severity="info" sx={{ mt: 2 }}>
          Testing backend connection...
        </Alert>
      </Box>
    );
  }

  if (status === 'error') {
    return (
      <Box sx={{ p: 2 }}>
        <Alert 
          severity="error" 
          action={
            <Button color="inherit" size="small" onClick={testConnection}>
              <RefreshIcon />
            </Button>
          }
        >
          <strong>Backend Connection Failed</strong>
          <br />
          {error}
          <br /><br />
          <strong>Troubleshooting:</strong>
          <ul style={{ marginTop: 8, paddingLeft: 20 }}>
            <li>Ensure backend server is running: <code>cd backend && npm start</code></li>
            <li>Check backend URL: <code>{import.meta.env.VITE_API_BASE_URL}</code></li>
            <li>Verify backend is accessible at: <a href="http://localhost:3001/api/health" target="_blank">http://localhost:3001/api/health</a></li>
          </ul>
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2 }}>
      <Alert 
        severity="success"
        action={
          <Button color="inherit" size="small" onClick={testConnection}>
            <RefreshIcon />
          </Button>
        }
      >
        <strong>Backend Connected Successfully</strong>
        <br />
        Service: {health?.service} v{health?.version}
        <br />
        SAP System: {health?.sapSystem}
        <br />
        CSRF Token: {health?.csrf?.tokenValid ? '✓ Valid' : '✗ Invalid'}
      </Alert>
    </Box>
  );
};

export default ConnectionTest;