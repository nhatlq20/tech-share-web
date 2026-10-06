import React from 'react';
import { EkycApprovalTab, EkycApprovalTabProps } from './EkycApprovalTab';

export const AdminEkycTab: React.FC<EkycApprovalTabProps> = (props) => {
  return <EkycApprovalTab {...props} />;
};

export { EkycApprovalTab };
export default AdminEkycTab;
