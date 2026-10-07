import React from 'react';
import { Wallet, ArrowDownRight, ArrowUpRight, ShieldCheck, CheckCircle } from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';

export const OwnerWalletTab = ({ walletData, transactions = [] }) => {
  const t = STRINGS.owner.wallet;

  const data = walletData || {
    availableBalance: 12450000,
    heldDeposit: 4500000,
    totalEarned: 38900000
  };

  const defaultTx = transactions.length > 0 ? transactions : [
    {
      _id: 'tx_101',
      type: 'rental_income',
      amount: 1250000,
      bookingCode: 'TS-2026-881',
      createdAt: '2026-10-06 14:30',
      status: 'success'
    },
    {
      _id: 'tx_102',
      type: 'deposit_hold',
      amount: 2500000,
      bookingCode: 'TS-2026-882',
      createdAt: '2026-10-05 10:15',
      status: 'pending'
    },
    {
      _id: 'tx_103',
      type: 'withdraw',
      amount: 5000000,
      createdAt: '2026-10-03 09:00',
      status: 'success'
    },
    {
      _id: 'tx_104',
      type: 'rental_income',
      amount: 850000,
      bookingCode: 'TS-2026-764',
      createdAt: '2026-10-01 16:45',
      status: 'success'
    }
  ];

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
            onClick={() => alert('Nạp tiền vào ví Escrow')}
          >
            {t.topupBtn}
          </button>
          <button
            type="button"
            className="owner-btn-primary"
            onClick={() => alert('Đã gửi yêu cầu rút tiền về tài khoản ngân hàng liên kết!')}
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
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.availableBalance)}
            </div>
            <div className="owner-kpi-sub">
              Sẵn sàng rút về tài khoản ngân hàng
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
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.heldDeposit)}
            </div>
            <div className="owner-kpi-sub">
              Bảo vệ bởi hợp đồng Escrow TechShare
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
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(data.totalEarned)}
            </div>
            <div className="owner-kpi-sub">
              Thu nhập tích lũy trọn đời
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
              {defaultTx.map((tx) => {
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
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OwnerWalletTab;

