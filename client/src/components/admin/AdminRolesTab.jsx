import React, { useState, useEffect, useCallback } from 'react';
import {
  KeyRound,
  Users,
  Search,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCw,
  X,
  UserCheck,
  Lock,
} from 'lucide-react';
import {
  getAdminRoles,
  getAdminRoleAccounts,
  updateAdminAccountRole,
} from '../../services/adminService.js';
import { formatDate } from '../../utils/formatters.js';

const ROLE_BADGE = {
  admin: { bg: 'bg-rose-50 text-rose-700 border-rose-200', label: 'Administrator (Admin)' },
  owner: { bg: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Device Owner (Owner)' },
  renter: { bg: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Renter' },
  both: { bg: 'bg-teal-50 text-teal-700 border-teal-200', label: 'Both Roles' },
};

export const AdminRolesTab = () => {
  const [roles, setRoles] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(true);
  const [selectedRole, setSelectedRole] = useState(null);

  // Accounts state
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal: Change Role
  const [targetAccount, setTargetAccount] = useState(null);
  const [newRoleId, setNewRoleId] = useState('');
  const [changeReason, setChangeReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch all roles
  const fetchRoles = useCallback(async () => {
    try {
      setLoadingRoles(true);
      const res = await getAdminRoles();
      if (res && res.data) {
        const roleList = Array.isArray(res.data) ? res.data : [];
        setRoles(roleList);
        if (!selectedRole && roleList.length > 0) {
          setSelectedRole(roleList[0]);
        } else if (selectedRole) {
          const updated = roleList.find((r) => r._id === selectedRole._id);
          if (updated) setSelectedRole(updated);
        }
      }
    } catch (err) {
      console.error('Error loading roles list:', err);
    } finally {
      setLoadingRoles(false);
    }
  }, [selectedRole]);

  useEffect(() => {
    fetchRoles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2. Fetch accounts assigned to selected role
  const fetchAccounts = useCallback(async () => {
    if (!selectedRole) return;
    try {
      setLoadingAccounts(true);
      const res = await getAdminRoleAccounts(selectedRole._id, {
        page,
        limit: 10,
        search,
        status: statusFilter,
      });
      if (res && res.data) {
        setAccounts(Array.isArray(res.data) ? res.data : []);
        setTotalPages(res.pagination?.totalPages || 1);
        setTotalCount(res.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Error loading accounts list:', err);
    } finally {
      setLoadingAccounts(false);
    }
  }, [selectedRole, page, search, statusFilter]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenChangeRole = (acc) => {
    setTargetAccount(acc);
    setNewRoleId(selectedRole?._id || '');
    setChangeReason('');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleRoleChangeSubmit = async (e) => {
    e.preventDefault();
    if (!targetAccount || !newRoleId) return;
    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await updateAdminAccountRole(targetAccount._id, {
        roleId: newRoleId,
        reason: changeReason,
      });

      if (res && res.data) {
        setSuccessMsg(res.message || 'Account role updated successfully.');
        setTimeout(() => {
          setTargetAccount(null);
          fetchRoles();
          fetchAccounts();
        }, 1200);
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'Error assigning account role.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Role Management & Permissions (RBAC)</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Manage access tiers, account assignments, and security privileges
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchRoles();
              fetchAccounts();
            }}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Refresh"
          >
            <RotateCw className={`w-3.5 h-3.5 ${loadingRoles || loadingAccounts ? 'animate-spin' : ''}`} />Refresh</button>
        </div>
      </div>

      {/* 2. Roles Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingRoles
          ? [1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-2xl animate-pulse" />
            ))
          : roles.map((r) => {
              const isSelected = selectedRole?._id === r._id;
              const badge = ROLE_BADGE[r.code] || { bg: 'bg-slate-100 text-slate-700 border-slate-200', label: r.name };

              return (
                <div
                  key={r._id}
                  onClick={() => {
                    setSelectedRole(r);
                    setPage(1);
                  }}
                  className={`p-5 rounded-2xl border transition cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'bg-teal-50/50 border-teal-500 ring-2 ring-teal-500/20 shadow-sm'
                      : 'bg-white border-slate-200 hover:border-teal-300 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${badge.bg}`}>
                      {r.code.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1 font-semibold">
                      <Users className="w-3 h-3 text-slate-400" />
                      {r.accountCount || 0} accounts
                    </span>
                  </div>

                  <h3 className="font-bold text-slate-900 text-sm">{r.name}</h3>
                  <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {r.description || 'No additional description.'}
                  </p>

                  {/* Permissions tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {Array.isArray(r.permissions) && r.permissions.slice(0, 3).map((p, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-mono"
                      >
                        {p}
                      </span>
                    ))}
                    {r.permissions?.length > 3 && (
                      <span className="text-[9px] text-slate-400 self-center">
                        +{r.permissions.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
      </div>

      {/* 3. Accounts Table under Selected Role */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Table Filter Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600" />
            <h4 className="font-bold text-slate-900 text-xs">
              Accounts assigned to role: <span className="text-teal-700">{selectedRole?.name}</span>
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search username, email..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Locked</option>
            </select>
          </div>
        </div>

        {/* Accounts List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/75 border-b border-slate-100 text-slate-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Account</th>
                <th className="py-3.5 px-4">Linked User</th>
                <th className="py-3.5 px-4">Current Role</th>
                <th className="py-3.5 px-4">Created Date</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loadingAccounts ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <RotateCw className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-600" />
                    Loading accounts list...
                  </td>
                </tr>
              ) : accounts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    No accounts assigned to this role.
                  </td>
                </tr>
              ) : (
                accounts.map((acc) => {
                  return (
                    <tr key={acc._id} className="hover:bg-slate-50/50 transition">
                      {/* Tài khoản */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{acc.username}</div>
                        <div className="text-[11px] text-slate-400">{acc.email}</div>
                      </td>

                      {/* Người dùng liên kết */}
                      <td className="py-3.5 px-4">
                        {acc.userId ? (
                          <div>
                            <div className="font-semibold text-slate-800">{acc.userId.name || 'User'}</div>
                            <div className="text-[11px] text-slate-400">
                              {acc.userId.phone || acc.userId.email || 'N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No linked profile</span>
                        )}
                      </td>

                      {/* Vai trò */}
                      <td className="py-3.5 px-4">
                        <span className="inline-block px-2.5 py-1 text-[11px] font-bold rounded-lg border bg-slate-100 text-slate-800 border-slate-200">
                          {acc.roleId?.name || acc.role || selectedRole?.name}
                        </span>
                      </td>

                      {/* Ngày tạo */}
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                        {formatDate(acc.createdAt)}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        {acc.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Locked
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenChangeRole(acc)}
                          className="px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 font-semibold transition"
                          title="Change Role"
                        >Change Role</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!loadingAccounts && accounts.length > 0 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>
              Trang <span className="font-semibold text-slate-800">{page}</span> / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >Prev</button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 4. Modal: Change Account Role */}
      {targetAccount && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Reassign Account Role</h3>
                  <p className="text-xs text-slate-500">{targetAccount.username} ({targetAccount.email})</p>
                </div>
              </div>
              <button
                onClick={() => setTargetAccount(null)}
                className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleRoleChangeSubmit} className="p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Security Warning if target is Admin */}
              {targetAccount.role === 'admin' && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 space-y-1">
                  <div className="font-bold flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-amber-700" />
                    System Security Notice:
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    This account currently holds Administrator privileges. The system will automatically prevent demotion if this is the only active Administrator.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select New Role:</label>
                <select
                  required
                  value={newRoleId}
                  onChange={(e) => setNewRoleId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-semibold text-slate-800"
                >
                  {roles.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.name} ({r.code.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Role Change:</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Enter reason for role change to record in audit log..."
                  value={changeReason}
                  onChange={(e) => setChangeReason(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setTargetAccount(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 font-semibold text-slate-600 transition"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold shadow-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : 'Confirm Role Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminRolesTab;
