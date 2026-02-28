import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Paper,
  MenuItem,
  useTheme,
  useMediaQuery,
  Collapse,
  IconButton,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const FilterBar = ({ onSearch, loading }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [expanded, setExpanded] = useState(!isMobile);

  // Get initial user from localStorage
  const initialUserId = localStorage.getItem('userId') || '';

  const [filters, setFilters] = useState({
    orderNumber: '',
    plant: '',
    location: '',
    user: initialUserId, // Initialize with userId from localStorage
    status: ''
  });

  const statusOptions = [
    { value: '', label: 'All Status' },
    { value: 'E0002', label: 'In-Charge Approval' },
    { value: 'E0004', label: 'Manager Approval' },
    { value: 'E0006', label: 'Co-Ordinator Approval' },
    { value: 'E0008', label: 'GM Approval' }
  ];

  const handleChange = (field) => (event) => {
    setFilters(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSearch = () => {
    console.log('🔍 Sending filters to backend:', filters); // Debug log
    onSearch(filters);
  };

const handleReset = () => {
  const emptyFilters = {
    orderNumber: '',
    plant: '',
    location: '',
    user: initialUserId, // ⭐ Keep user filter when resetting
    status: ''
  };
  setFilters(emptyFilters);
  onSearch(emptyFilters);
};


  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Paper
      elevation={4}
      sx={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        p: 2,
        mb: 3,
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Advanced Filters Toggle (Mobile) */}
      {isMobile && (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems="center"
          mb={expanded ? 2 : 0}
          sx={{
            backgroundColor: 'rgba(255,255,255,0.1)',
            borderRadius: 2,
            p: 1
          }}
        >
          <Typography sx={{ color: 'white', fontWeight: 600 }}>
            Search Filters
          </Typography>
          <IconButton
            onClick={() => setExpanded(!expanded)}
            sx={{ color: 'white' }}
          >
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>
      )}

      <Collapse in={expanded}>
        <Grid container spacing={2}>
          {/* Order Number */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              size="small"
              label="Order Number"
              value={filters.orderNumber}
              onChange={handleChange('orderNumber')}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 000300007296"
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'transparent'
                  }
                }
              }}
            />
          </Grid>

          {/* Plant */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Plant"
              value={filters.plant}
              onChange={handleChange('plant')}
              onKeyPress={handleKeyPress}
              placeholder="e.g., 3117"
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'transparent'
                  }
                }
              }}
            />
          </Grid>

          {/* Location */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="Location"
              value={filters.location}
              onChange={handleChange('location')}
              onKeyPress={handleKeyPress}
              placeholder="Functional Location"
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'transparent'
                  }
                }
              }}
            />
          </Grid>

          {/* User - FIXED */}
          <Grid item xs={12} sm={6} md={2}>
            <TextField
              fullWidth
              size="small"
              label="User"
              value={filters.user} // Use filters.user instead of userid
              onChange={handleChange('user')} // Update filters.user
              onKeyPress={handleKeyPress}
              placeholder="UserID"
              sx={{
                backgroundColor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': {
                    borderColor: 'transparent'
                  }
                }
              }}
            />
          </Grid>

          {/* Action Buttons */}
          <Grid item xs={12}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}
            >
              <Button
                variant="contained"
                size={isMobile ? 'large' : 'medium'}
                startIcon={<SearchIcon />}
                onClick={handleSearch}
                disabled={loading}
                sx={{
                  minWidth: isMobile ? '45%' : 120,
                  background: 'linear-gradient(45deg, #4CAF50 30%, #8BC34A 90%)',
                  boxShadow: '0 3px 5px 2px rgba(76, 175, 80, .3)',
                  fontWeight: 600
                }}
              >
                Search
              </Button>
              <Button
                variant="outlined"
                size={isMobile ? 'large' : 'medium'}
                startIcon={<RefreshIcon />}
                onClick={handleReset}
                disabled={loading}
                sx={{
                  minWidth: isMobile ? '45%' : 120,
                  backgroundColor: 'white',
                  color: '#764ba2',
                  borderColor: 'white',
                  fontWeight: 600,
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.9)',
                    borderColor: 'white'
                  }
                }}
              >
                Reset
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Collapse>
    </Paper>
  );
};

export default FilterBar;
