import React from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';

export const OwnerWalletTab = ({ kpi, bookings = [], walletData, transactions = [] }) => {
  const t = STRINGS.owner.wallet;

  const availableBalance = walletData?.availableBalance ?? kpi?.monthlyRevenue ?? 0;
  const heldDeposit = walletData?.heldDeposit ?? kpi?.escrowHolding ?? 0;
  const totalEarned = walletData?.totalEarned ?? kpi?.monthlyRevenue ?? 0;

  // Derive transactions from real bookings if custom transactions list is not provided
  const txList = transactions.length > 0 ? transactions : bookings.map((b) => {
    const isCompleted = b.status === 'completed';
    const isActive = b.status === 'active' || b.status === 'approved';
    return {
      _id: b._id || b.id,
      type: isCompleted ? 'rental_income' : isActive ? 'deposit_hold' : 'deposit_refund',
      amount: isCompleted ? (b.totalPrice || b.totalRentalPrice || 0) : (b.depositAmount || 0),
      bookingCode: b.bookingCode || b.id,
      createdAt: (b.createdAt || '').split('T')[0] || '2026-10-08',
      status: isCompleted ? 'success' : 'pending',
    };
  });

  return (
    <div className="owner-wallet-container">
      {/* Header */}
      <div className="owner-page-header">
        <div>
          <h1 className="owner-page-title">{t.title}</h1>
          <p className="owner-page-subtitle">{t.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="owner-btn-outline"
            onClick={() => alert('Escrow top-up request initiated.')}
          >
            {t.topupBtn}
          </button>
          <button
            type="button"
            className="owner-btn-primary"
            onClick={() => alert('Withdrawal request submitted to linked bank account!')}
          >
            {t.withdrawBtn}
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="owner-kpi-grid">
        <div className="owner-kpi-card">
          <div>
            <div className="owner-kpi-label">{t.availableBalance}</div>
            <div className="owner-kpi-value text-emerald-600">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(availableBalance)}
            </div>
            <div className="owner-kpi-sub">
              Available for bank withdrawal
            </div>
          </div>
          <div className="owner-kpi-icon-wrap" style={{ background: COLORS.status.success.bg, color: COLORS.status.success.DEFAULT }}>
            <Wallet size={24} />
          </div>
        </div>

        <div className="owner-kpi-card">
          <div>
            <div className="owner-kpi-label">{t.heldDeposit}</div>
            <div className="owner-kpi-value text-sky-600">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(heldDeposit)}
            </div>
            <div className="owner-kpi-sub">
              Protected by TechShare Escrow contract
            </div>
          </div>
          <div className="owner-kpi-icon-wrap" style={{ background: COLORS.status.info.bg, color: COLORS.status.info.DEFAULT }}>
            <ShieldCheck size={24} />
          </div>
        </div>

        <div className="owner-kpi-card">
          <div>
            <div className="owner-kpi-label">{t.totalEarned}</div>
            <div className="owner-kpi-value">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(totalEarned)}
            </div>
            <div className="owner-kpi-sub">
              Total lifetime earned revenue
            </div>
          </div>
          <div className="owner-kpi-icon-wrap">
            <CheckCircle size={24} />
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="owner-card p-0 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-800">{t.transactionsTitle}</h3>
        </div>

        <div className="owner-table-container border-0">
          <table className="owner-table">
            <thead>
              <tr>
                <th>{t.table.colId}</th>
                <th>{t.table.colType}</th>
                <th>{t.table.colAmount}</th>
                <th>{t.table.colBooking}</th>
                <th>{t.table.colDate}</th>
                <th>{t.table.colStatus}</th>
              </tr>
            </thead>
            <tbody>
              {txList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-slate-500">
                    No transactions recorded in wallet yet.
                  </td>
                </tr>
              ) : (
                txList.map((tx) => {
                  const isIncome = tx.type === 'rental_income';
                  const isWithdraw = tx.type === 'withdraw';
                  return (
                    <tr key={tx._id}>
                      <td>
                        <span className="font-semibold text-xs text-slate-600">#{tx._id}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1.5 text-xs font-medium">
                          {isIncome && <ArrowDownRight size={14} className="text-emerald-500" />}
                          {isWithdraw && <ArrowUpRight size={14} className="text-rose-500" />}
                          <span>{t.types[tx.type] || tx.type}</span>
                        </div>
                      </td>
                      <td>
                        <span className={`text-sm font-bold ${isIncome ? 'text-emerald-600' : isWithdraw ? 'text-rose-600' : 'text-slate-800'}`}>
                          {isIncome ? '+' : isWithdraw ? '-' : ''}
                          {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(tx.amount)}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-600">
                          {tx.bookingCode ? `#${tx.bookingCode}` : '—'}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs text-slate-500">{tx.createdAt}</span>
                      </td>
                      <td>
                        <span className={`owner-badge ${tx.status === 'success' ? 'owner-badge-available' : 'owner-badge-pending'}`}>
                          {tx.status === 'success' ? t.status.success : t.status.pending}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerWalletTab;
