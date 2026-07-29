import { apiRequest } from '../api/client';
import { ENDPOINTS } from '../api/endpoints';

function mapWallet(item) {
  return {
    id: String(item?.id || item?._id || ''),
    availableBalance: Number(item?.availableBalance || 0),
    holdBalance: Number(item?.holdBalance || 0),
    totalBalance: Number(item?.totalBalance || 0),
    currency: item?.currency || 'VND',
    status: item?.status || 'ACTIVE',
  };
}

function mapTransaction(item) {
  return {
    id: String(item?.id || item?._id || ''),
    type: item?.operationType || item?.type || 'TRANSACTION',
    direction: item?.direction || (Number(item?.availableDelta || 0) < 0 ? 'DEBIT' : 'CREDIT'),
    availableDelta: Number(item?.availableDelta || 0),
    holdDelta: Number(item?.holdDelta || 0),
    balanceAfter: Number(item?.availableAfter ?? item?.balanceAfter ?? 0),
    description: item?.description || item?.note || '',
    createdAt: item?.createdAt || '',
  };
}

function mapWithdrawal(item) {
  return {
    id: String(item?.id || item?._id || ''),
    amount: Number(item?.amount || 0),
    status: item?.status || 'PENDING',
    bankAccount: item?.bankAccount || '',
    bankName: item?.bankName || '',
    accountName: item?.accountName || '',
    note: item?.note || '',
    createdAt: item?.createdAt || '',
  };
}

export const walletService = {
  async getMyWallet() {
    return mapWallet(await apiRequest(ENDPOINTS.wallets.me));
  },

  async listMyTransactions() {
    const items = await apiRequest(ENDPOINTS.wallets.transactions);
    return (Array.isArray(items) ? items : []).map(mapTransaction);
  },

  async listMyWithdrawals() {
    const items = await apiRequest(ENDPOINTS.wallets.withdrawals);
    return (Array.isArray(items) ? items : []).map(mapWithdrawal);
  },

  async createWithdrawal(payload) {
    const idempotencyKey = payload.idempotencyKey || `withdraw-${Date.now()}`;
    return mapWithdrawal(
      await apiRequest(ENDPOINTS.wallets.withdrawals, {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: {
          amount: Number(payload.amount),
          bankAccountNumber: payload.bankAccountNumber,
          bankName: payload.bankName,
          bankAccountName: payload.bankAccountName,
          reason: payload.reason || '',
        },
      }),
    );
  },
};
