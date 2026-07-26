'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  value: number;
  status: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'WON' | 'LOST';
  assignedToId: string | null;
  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  createdAt: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [leadsLoading, setLeadsLoading] = useState(false);

  // View state: 'table' or 'board'
  const [viewMode, setViewMode] = useState<'table' | 'board'>('board');

  // Filters and pagination state
  const [statusFilter, setStatusFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Quick statistics
  const [stats, setStats] = useState({
    totalLeads: 0,
    newLeads: 0,
    totalValue: 0,
    wonValue: 0,
  });

  // Verify auth session
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        if (!res.ok) {
          router.push('/login');
          return;
        }
        const data = await res.json();
        setCurrentUser(data.user);
      } catch (err) {
        console.error('Auth verification error:', err);
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // Fetch users (for filter/assign dropdowns)
  useEffect(() => {
    if (!currentUser) return;

    async function fetchUsers() {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      }
    }
    fetchUsers();
  }, [currentUser]);

  // Fetch leads
  useEffect(() => {
    if (!currentUser) return;

    async function fetchLeads() {
      setLeadsLoading(true);
      try {
        const params = new URLSearchParams();
        // In board view we fetch more items (up to 100) to populate columns, in table we fetch by page limit 8
        const limitVal = viewMode === 'board' ? '100' : '8';
        params.append('page', page.toString());
        params.append('limit', limitVal);
        if (statusFilter) params.append('status', statusFilter);
        if (assigneeFilter) params.append('assignedToId', assigneeFilter);
        if (searchQuery) params.append('q', searchQuery);

        const res = await fetch(`/api/leads?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setLeads(data.data);
          setTotalPages(data.pagination.totalPages);
          setTotalCount(data.pagination.totalCount);
        }
      } catch (err) {
        console.error('Error fetching leads:', err);
      } finally {
        setLeadsLoading(false);
        setLoading(false);
      }
    }

    fetchLeads();
  }, [currentUser, page, statusFilter, assigneeFilter, searchQuery, viewMode]);

  // Load metrics (unfiltered totals)
  useEffect(() => {
    if (!currentUser) return;

    async function fetchMetrics() {
      try {
        const res = await fetch('/api/leads?limit=1000');
        if (res.ok) {
          const data = await res.json();
          const allLeads: Lead[] = data.data;

          const total = allLeads.length;
          const newCount = allLeads.filter((l) => l.status === 'NEW').length;
          const sumValue = allLeads.reduce((acc, l) => acc + l.value, 0);
          const wonSum = allLeads
            .filter((l) => l.status === 'WON')
            .reduce((acc, l) => acc + l.value, 0);

          setStats({
            totalLeads: total,
            newLeads: newCount,
            totalValue: sumValue,
            wonValue: wonSum,
          });
        }
      } catch (err) {
        console.error('Error fetching metrics:', err);
      }
    }
    fetchMetrics();
  }, [currentUser, leads]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
      router.refresh();
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setLeads((prev) => prev.filter((l) => l.id !== leadId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete lead');
      }
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to delete lead');
    }
  };

  const handleQuickAssign = async (leadId: string, userId: string) => {
    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: userId || null }),
      });

      if (res.ok) {
        const updated = await res.json();
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, assignedTo: updated.assignedTo, assignedToId: updated.assignedToId } : l))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign lead');
      }
    } catch (err) {
      console.error('Assign error:', err);
      alert('Failed to assign lead');
    }
  };

  const handleMoveStage = async (leadId: string, currentStatus: Lead['status'], direction: 'left' | 'right') => {
    const statuses: Lead['status'][] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
    const currentIndex = statuses.indexOf(currentStatus);
    let nextIndex = currentIndex + (direction === 'left' ? -1 : 1);

    if (nextIndex < 0 || nextIndex >= statuses.length) return;
    const nextStatus = statuses[nextIndex];

    try {
      const res = await fetch(`/api/leads/${leadId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        const updated = await res.json();
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, status: updated.status } : l))
        );
      } else {
        const data = await res.json();
        alert(data.error || 'Forbidden: You can only move leads assigned to you');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update stage');
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    switch (status) {
      case 'NEW':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'CONTACTED':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
      case 'QUALIFIED':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'PROPOSAL':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/30';
      case 'WON':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'LOST':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/30';
    }
  };

  const getColumnHeaderBg = (status: Lead['status']) => {
    switch (status) {
      case 'NEW': return 'border-t-2 border-t-blue-500';
      case 'CONTACTED': return 'border-t-2 border-t-cyan-500';
      case 'QUALIFIED': return 'border-t-2 border-t-amber-500';
      case 'PROPOSAL': return 'border-t-2 border-t-purple-500';
      case 'WON': return 'border-t-2 border-t-emerald-500';
      case 'LOST': return 'border-t-2 border-t-rose-500';
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-white">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm">Authenticating sales portal...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';

  // Group leads by stage for Kanban Board view
  const stages: Lead['status'][] = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'WON', 'LOST'];
  const columns: Record<Lead['status'], Lead[]> = {
    NEW: leads.filter((l) => l.status === 'NEW'),
    CONTACTED: leads.filter((l) => l.status === 'CONTACTED'),
    QUALIFIED: leads.filter((l) => l.status === 'QUALIFIED'),
    PROPOSAL: leads.filter((l) => l.status === 'PROPOSAL'),
    WON: leads.filter((l) => l.status === 'WON'),
    LOST: leads.filter((l) => l.status === 'LOST'),
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-white">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0e1628]/45 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-9 w-9 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-blue-500/20">
            H
          </span>
          <span className="font-bold text-xl tracking-tight text-white">HeroCRM</span>
          <span className="text-xs px-2 py-0.5 rounded bg-white/5 border border-white/10 text-slate-400 ml-2">
            Sales CRM Dashboard
          </span>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold text-white flex items-center gap-1.5 justify-end">
              {currentUser.name}
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold border ${
                isAdmin ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30'
              }`}>
                {currentUser.role}
              </span>
            </div>
            <div className="text-xs text-slate-400">{currentUser.email}</div>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-white/5 border border-white/10 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-all cursor-pointer"
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {/* Statistics Panels */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111928]/45 border border-white/5 p-5 rounded-xl backdrop-blur-md shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Leads</div>
            <div className="text-2xl md:text-3xl font-extrabold text-white mt-1">{stats.totalLeads}</div>
            <div className="text-[10px] text-blue-400 mt-1">In system database</div>
          </div>

          <div className="bg-[#111928]/45 border border-white/5 p-5 rounded-xl backdrop-blur-md shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">New Inquiries</div>
            <div className="text-2xl md:text-3xl font-extrabold text-blue-400 mt-1">{stats.newLeads}</div>
            <div className="text-[10px] text-slate-500 mt-1">Awaiting contacted</div>
          </div>

          <div className="bg-[#111928]/45 border border-white/5 p-5 rounded-xl backdrop-blur-md shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Value</div>
            <div className="text-2xl md:text-3xl font-extrabold text-amber-500 mt-1">
              ${stats.totalValue.toLocaleString('en-US')}
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Cumulative deal size</div>
          </div>

          <div className="bg-[#111928]/45 border border-white/5 p-5 rounded-xl backdrop-blur-md shadow-xl transition-all hover:scale-[1.02]">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">Won Revenue</div>
            <div className="text-2xl md:text-3xl font-extrabold text-emerald-400 mt-1">
              ${stats.wonValue.toLocaleString('en-US')}
            </div>
            <div className="text-[10px] text-emerald-500/70 mt-1">Closed deals</div>
          </div>
        </div>

        {/* View Mode Toggle & Controls */}
        <div className="bg-[#111928]/30 border border-white/5 rounded-xl backdrop-blur-md p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-6">
            {/* Left side filters */}
            <div className="flex flex-wrap gap-3 flex-1">
              {/* Search */}
              <input
                type="text"
                placeholder="Search leads..."
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
                className="bg-[#1e293b]/45 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 w-full sm:max-w-xs transition-all"
              />

              {/* Status filter (Only for Table View) */}
              {viewMode === 'table' && (
                <select
                  value={statusFilter}
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-[#1e293b]/45 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="">All Statuses</option>
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              )}

              {/* Assignee filter */}
              <select
                value={assigneeFilter}
                onChange={(e) => { setAssigneeFilter(e.target.value); setPage(1); }}
                className="bg-[#1e293b]/45 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer animate-fade-in-up"
              >
                <option value="">All Assignees</option>
                <option value="unassigned">Unassigned</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>

            {/* View Mode Segment Switcher */}
            <div className="flex items-center gap-2 self-start md:self-auto bg-white/5 border border-white/10 p-1 rounded-lg">
              <button
                onClick={() => { setViewMode('board'); setStatusFilter(''); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'board' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                📊 Pipeline Board
              </button>
              <button
                onClick={() => { setViewMode('table'); setPage(1); }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                📋 Table List
              </button>
            </div>
          </div>

          {leadsLoading ? (
            <div className="py-24 text-center text-slate-500">
              <div className="h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
              Loading inquiries...
            </div>
          ) : leads.length === 0 ? (
            <div className="py-24 text-center text-slate-500 space-y-2">
              <div className="text-3xl font-semibold text-slate-400">No inquiries found</div>
              <p className="text-sm">Try adjusting your filters or search query.</p>
            </div>
          ) : viewMode === 'board' ? (
            /* KANBAN BOARD VIEW */
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-4 min-w-[1200px]">
                {stages.map((stage) => {
                  const stageLeads = columns[stage] || [];
                  const colTotalValue = stageLeads.reduce((acc, l) => acc + l.value, 0);

                  return (
                    <div
                      key={stage}
                      className={`flex-1 flex flex-col bg-[#111928]/25 border border-white/5 rounded-xl p-4 space-y-4 max-w-[280px] min-h-[500px] ${getColumnHeaderBg(
                        stage
                      )}`}
                    >
                      {/* Column Header */}
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-300 tracking-wide">{stage}</span>
                        <span className="text-[10px] bg-white/5 border border-white/10 px-1.5 py-0.5 rounded font-semibold text-slate-400">
                          {stageLeads.length}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-amber-500/80">
                        ${colTotalValue.toLocaleString('en-US')}
                      </div>

                      {/* Card Container */}
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[550px] scrollbar-thin">
                        {stageLeads.map((lead) => {
                          const isAssignedToMe = lead.assignedToId === currentUser.id;
                          const canMove = isAdmin || isAssignedToMe;

                          return (
                            <div
                              key={lead.id}
                              className="bg-[#111928]/70 border border-white/10 hover:border-white/20 p-4 rounded-xl space-y-3 transition-all hover:scale-[1.03] hover:shadow-xl group"
                            >
                              <div>
                                <div className="font-bold text-sm text-white group-hover:text-blue-400 transition-colors">
                                  {lead.name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate mt-0.5">{lead.email}</div>
                                {lead.company && (
                                  <div className="text-[10px] text-slate-500 font-medium mt-1">
                                    🏢 {lead.company}
                                  </div>
                                )}
                              </div>

                              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                <span className="font-bold text-xs text-amber-500">
                                  ${lead.value.toLocaleString('en-US')}
                                </span>
                                <span className="text-[9px] text-slate-400">
                                  👤 {lead.assignedTo ? lead.assignedTo.name.split(' ')[0] : 'Unassigned'}
                                </span>
                              </div>

                              {/* Stage movement quick arrows */}
                              <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
                                <Link
                                  href={`/dashboard/leads/${lead.id}`}
                                  className="text-[10px] font-bold text-blue-400 hover:underline"
                                >
                                  View profile
                                </Link>

                                {canMove && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => handleMoveStage(lead.id, lead.status, 'left')}
                                      disabled={stage === 'NEW'}
                                      className="h-5 w-5 bg-white/5 hover:bg-blue-600 disabled:opacity-30 border border-white/10 rounded flex items-center justify-center text-xs transition-colors cursor-pointer"
                                      title="Move stage left"
                                    >
                                      ‹
                                    </button>
                                    <button
                                      onClick={() => handleMoveStage(lead.id, lead.status, 'right')}
                                      disabled={stage === 'LOST'}
                                      className="h-5 w-5 bg-white/5 hover:bg-blue-600 disabled:opacity-30 border border-white/10 rounded flex items-center justify-center text-xs transition-colors cursor-pointer"
                                      title="Move stage right"
                                    >
                                      ›
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {stageLeads.length === 0 && (
                          <div className="py-12 text-center text-slate-600 text-xs italic">
                            Empty stage
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* TABLE LIST VIEW */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/5 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                    <th className="pb-3 pl-3">Lead Contact</th>
                    <th className="pb-3">Company</th>
                    <th className="pb-3">Deal Value</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Assignee</th>
                    <th className="pb-3 pr-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leads.map((lead) => {
                    return (
                      <tr key={lead.id} className="hover:bg-white/5 transition-all text-sm group">
                        <td className="py-4 pl-3">
                          <div className="font-semibold text-white">{lead.name}</div>
                          <div className="text-xs text-slate-400">{lead.email}</div>
                          {lead.phone && <div className="text-[10px] text-slate-500">{lead.phone}</div>}
                        </td>
                        <td className="py-4 text-slate-300 font-medium">
                          {lead.company || <span className="text-slate-600">—</span>}
                        </td>
                        <td className="py-4 font-semibold text-amber-500">
                          ${lead.value.toLocaleString('en-US')}
                        </td>
                        <td className="py-4">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(lead.status)}`}>
                            {lead.status}
                          </span>
                        </td>
                        <td className="py-4 text-xs">
                          {isAdmin ? (
                            <select
                              value={lead.assignedToId || ''}
                              onChange={(e) => handleQuickAssign(lead.id, e.target.value)}
                              className="bg-[#1e293b]/45 border border-white/10 rounded px-2 py-1 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                            >
                              <option value="">Unassigned</option>
                              {users.map((u) => (
                                <option key={u.id} value={u.id}>{u.name}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={lead.assignedTo ? 'text-slate-300' : 'text-slate-500 italic'}>
                              {lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}
                            </span>
                          )}
                        </td>
                        <td className="py-4 pr-3 text-right space-x-2">
                          <Link
                            href={`/dashboard/leads/${lead.id}`}
                            className="px-3 py-1 rounded text-xs font-semibold bg-white/5 hover:bg-blue-600 border border-white/10 hover:border-blue-600 transition-all"
                          >
                            View Details
                          </Link>
                          {isAdmin && (
                            <button
                              onClick={() => handleDeleteLead(lead.id)}
                              className="px-3 py-1 rounded text-xs font-semibold bg-white/5 hover:bg-rose-600 border border-white/10 hover:border-rose-600 transition-all cursor-pointer"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls (Only for Table View) */}
          {viewMode === 'table' && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 pt-6 text-xs text-slate-400">
              <div>
                Showing page <span className="font-semibold text-white">{page}</span> of{' '}
                <span className="font-semibold text-white">{totalPages}</span>
              </div>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Previous
                </button>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 transition-all cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-slate-600 mt-12 bg-[#05080f]">
        Built for Digital Heroes Training Task
      </footer>
    </div>
  );
}
