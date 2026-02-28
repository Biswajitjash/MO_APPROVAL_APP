/**
 * App Routing Configuration
 * Routes for MO Approval System with Dashboard
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Components
import MoDashboard from './components/Dashboard/MoDashboard';
import MoApproval from './components/MoApproval/MoApproval';
import MoSelected from './components/MoApproval/MoSelected';

/**
 * Main routing configuration
 */
const AppRoutes = () => {
  return (
    <Routes>
      {/* Dashboard Route */}
      <Route path="/dashboard" element={<MoDashboard />} />

      {/* MO Approval Routes */}
      <Route path="/mo-approval" element={<MoApproval />} />
      <Route path="/mo-selected" element={<MoSelected />} />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Catch-all Route */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
