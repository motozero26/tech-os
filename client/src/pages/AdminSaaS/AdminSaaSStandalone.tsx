import React from 'react';
import { AdminSaaS } from './AdminSaaS.tsx';

interface AdminSaaSStandaloneProps {
  onBackToStore?: () => void;
}

export const AdminSaaSStandalone: React.FC<AdminSaaSStandaloneProps> = ({ onBackToStore }) => {
  return <AdminSaaS onBackToStore={onBackToStore} isStandalone={true} />;
};

export default AdminSaaSStandalone;
