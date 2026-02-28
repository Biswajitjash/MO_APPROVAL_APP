// Format currency with Indian number format
export const formatCurrency = (amount, decimals = 2) => {
  if (!amount && amount !== 0) return '0.00';
  
  const num = parseFloat(amount);
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigles: decimals,
    maximumFractionDigits: decimals
  }).format(num);
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(date);
};

// Get status color
export const getStatusColor = (status) => {
  const statusColors = {
    'E0002': '#FF9800', // Orange
    'E0004': '#2196F3', // Blue
    'E0006': '#FFC107', // Amber
    'E0008': '#4CAF50', // Green
    'COAP': '#FFC107',  // Amber
    'MAPP': '#4CAF50'   // Green
  };
  
  return statusColors[status] || '#9E9E9E';
};