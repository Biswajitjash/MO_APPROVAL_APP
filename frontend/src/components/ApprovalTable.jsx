import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Checkbox,
  Chip,
  Box,
  Typography,
  useTheme,
  useMediaQuery,
  Card,
  CardContent,
  Divider,
  Stack,
  Avatar
} from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import BuildIcon from '@mui/icons-material/Build';
import EventIcon from '@mui/icons-material/Event';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { formatCurrency, getStatusColor } from '../utils/formatters';

const ApprovalTable = ({
  orders,
  selectedOrders,
  // onSelectAll,
  // onSelectOrder,
  onRowClick
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));

  // Mobile Card View
  if (isMobile) {
    return (
      <Stack spacing={2}>
        {orders.length === 0 ? (
          <Paper
            elevation={3}
            sx={{
              p: 6,
              textAlign: 'center',
              background: 'linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%)'
            }}
          >
            <Typography variant="h6" color="text.secondary">
              No orders found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Try adjusting filters Selections
            </Typography>
          </Paper>
        ) : (

          orders.map((order) => {
            const isSelected = selectedOrders.includes(order.OrderNumber);

            return (
              <Card
                key={order.OrderNumber}
                elevation={isSelected ? 8 : 3}
                onClick={() => onRowClick?.(order)}
                sx={{
                  background: isSelected
                    ? 'linear-gradient(135deg, #2571a7 0%, #BBDEFB 100%)'
                    : 'linear-gradient(135deg, #f3f17a 0%, #f5f5f5 100%)',
                  border: isSelected ? '2px solid #21f333' : 'none',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  '&:active': {
                    transform: 'scale(0.98)'
                  },
                  '&:hover': {
                    boxShadow: 6,
                    transform: 'translateY(-10px)'
                  }
                }}
              >
                <CardContent sx={{ p: 2 }}>
                  {/* Header Row */}
                  <Box display="flex" justifyContent="space-between" alignItems="start" mb={1}>
                    <Box flex={1}>
                      <Typography
                        variant="h6"
                        sx={{
                          color: '#0318cc',
                          fontWeight: 700,
                          fontSize: '1.1rem'
                        }}
                      >
                        {order.OrderNumber} ({order.OrderType})
                      </Typography>

                    </Box>
                    <Box display="flex" gap={1} alignItems="center">

                      <ChevronRightIcon sx={{ color: '#1976d2' }} />
                    </Box>
                  </Box>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#FF6B35',
                      fontWeight: 600,
                      mb: 1.5,
                      lineHeight: 1.4
                    }}
                  >
                    {order.OrderDescription}
                  </Typography>

                  <Divider sx={{ mb: 1.5 }} />

                  {/* Info Grid */}
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 1,
                      mb: 1.5
                    }}
                  >
                    <Box
                      sx={{
                        backgroundColor: '#F3E5F5',
                        borderRadius: 2,
                        p: 1,
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" color="blue" display="block">
                        Plant
                      </Typography>

                      <Typography variant="body2" fontWeight={700} color="#600488">
                        {order.Plant}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        backgroundColor: '#E8F5E9',
                        borderRadius: 2,
                        p: 1,
                        textAlign: 'center'
                      }}
                    >
                      <Typography variant="caption" color="red" display="block">
                        Equipment
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#388E3C">
                        {order.Equipment || '-'}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Cost Section */}
                  <Box
                    sx={{
                      background: 'linear-gradient(135deg, #b5f7a3 0%, #FFE0B2 100%)',
                      borderRadius: 2,
                      p: 1.5,
                      mb: 1.5
                    }}
                  >
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
                      {/* <AttachMoneyIcon sx={{ color: '#F57C00', fontSize: 20 }} /> */}
                      <Typography variant="caption" color="red" fontSize={18} textAlign='left'>
                        Total Cost
                      </Typography>
                    <Typography variant="h5" fontWeight={700} color="#1030e7" >
                      ₹ {formatCurrency(order.TotalCost)}
                    </Typography>
                    </Box>
                  </Box>

                  {/* Status Chip */}
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Chip
                      label={order.StatusShortText}
                      sx={{
                        backgroundColor: getStatusColor(order.StatusShortText),
                        color: 'white',
                        fontWeight: 600,
                        fontSize: '0.75rem',
                        px: 1
                      }}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {order.ApproverUsername}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            );
          })
        )}
      </Stack>
    );
  }

  // Tablet & Desktop Table View
  return (
    <TableContainer
      component={Paper}
      elevation={6}
      sx={{
        borderRadius: 3,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)'
      }}
    >
      <Table size={isTablet ? 'small' : 'medium'}>
        <TableHead>
          <TableRow
            sx={{
              background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
            }}
          >

            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Order No.</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Description</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Plant</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Equipment</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700, textAlign: 'right' }}>
              Total Cost
            </TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>Status</TableCell>
            <TableCell sx={{ color: 'white', fontWeight: 700 }}>User</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {orders.length === 0 ? (
            <TableRow>
              <TableCell colSpan={9} align="center">
                <Box py={6}>
                  <Typography variant="h6" color="text.secondary">
                    No orders found
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Try adjusting your filters
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            orders.map((order, index) => {
              const isSelected = selectedOrders.includes(order.OrderNumber);

              return (
                <TableRow
                  key={order.OrderNumber}
                  hover
                  selected={isSelected}
                  onClick={() => onRowClick?.(order)}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: index % 2 === 0 ? '#fafafa' : 'white',
                    '&.Mui-selected': {
                      backgroundColor: '#E3F2FD !important'
                    },
                    '&:hover': {
                      backgroundColor: '#f5f5f5 !important'
                    }
                  }}
                >

                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary">
                      {order.OrderNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.OrderType}
                      size="small"
                      sx={{
                        backgroundColor: '#E3F2FD',
                        color: '#1976d2',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ maxWidth: isTablet ? 150 : 250 }}>
                    <Typography variant="body2" noWrap>
                      {order.OrderDescription}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {order.Plant}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {order.Equipment || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={700} color="#E65100">
                      ₹ {formatCurrency(order.TotalCost)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={order.StatusShortText}
                      size="small"
                      sx={{
                        backgroundColor: getStatusColor(order.StatusShortText),
                        color: 'white',
                        fontWeight: 600
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {order.ApproverUsername}
                    </Typography>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default ApprovalTable;
