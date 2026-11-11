import api from './api';
import { createResourceService, downloadFile } from './resourceService';

const unwrap = (p) => p.then((r) => r.data.data);

export const donationApi = {
  ...createResourceService('/donations'),
  stats: (params) => unwrap(api.get('/donations/stats', { params })),
  campaigns: () => unwrap(api.get('/donations/campaigns')),
  donorHistory: (id) => unwrap(api.get(`/donations/${id}/donor-history`)),
  downloadReceipt: (donation) => downloadFile(`/donations/${donation._id}/receipt`, { fallbackName: `receipt-${donation.receiptNumber}.pdf` }),
  // Same filters as the list the person is looking at, minus paging and sorting.
  exportCsv: (params) => {
    const { page, limit, sortBy, order, ...filters } = params;
    return downloadFile('/donations/export', { params: filters, fallbackName: 'donations.csv' });
  },
};
