'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'MEMBER';
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
}

interface Activity {
  id: string;
  action: string;
  details: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    role: string;
  } | null;
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
  notes: Note[];
  activities: Activity[];
  createdAt: string;
}

type Props = {
  params: Promise<{ id: string }>;
};

export default function LeadDetails({ params }: Props) {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [lead, setLead] = useState<Lead | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Note form state
  const [newNoteContent, setNewNoteContent] = useState('');
  const [noteSubmitting, setNoteSubmitting] = useState(false);

  // Edit details form state
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    value: '',
  });

  // Extract params ID
  useEffect(() => {
    params.then((p) => setLeadId(p.id));
  }, [params]);

  // Auth check
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
        console.error(err);
        router.push('/login');
      }
    }
    checkAuth();
  }, [router]);

  // Fetch lead detail and users list
  useEffect(() => {
    if (!currentUser || !leadId) return;

    async function fetchData() {
      try {
        const [leadRes, usersRes] = await Promise.all([
          fetch(`/api/leads/${leadId}`),
          fetch('/api/users'),
        ]);

        if (leadRes.ok) {
          const leadData = await leadRes.json();
          setLead(leadData);
          setEditForm({
            name: leadData.name,
            email: leadData.email,
            phone: leadData.phone || '',
            company: leadData.company || '',
            value: leadData.value.toString(),
          });
        } else {
          router.push('/dashboard');
        }

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setUsers(usersData);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [currentUser, leadId, router]);

  const handleUpdateStatus = async (status: string) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Reload details to get new activity log
        reloadLead();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update status');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update status');
    }
  };

  const handleUpdateAssignee = async (assignedToId: string) => {
    if (!lead) return;
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedToId: assignedToId || null }),
      });

      if (res.ok) {
        reloadLead();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to assign lead');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to assign lead');
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editForm.name,
          email: editForm.email,
          phone: editForm.phone || null,
          company: editForm.company || null,
          value: parseFloat(editForm.value) || 0,
        }),
      });

      if (res.ok) {
        setEditMode(false);
        reloadLead();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to update lead details');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update lead details');
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !newNoteContent.trim()) return;

    setNoteSubmitting(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      });

      if (res.ok) {
        setNewNoteContent('');
        reloadLead();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to add note');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add note');
    } finally {
      setNoteSubmitting(false);
    }
  };

  const reloadLead = async () => {
    if (!leadId) return;
    try {
      const res = await fetch(`/api/leads/${leadId}`);
      if (res.ok) {
        const data = await res.json();
        setLead(data);
      }
    } catch (err) {
      console.error('Error reloading lead:', err);
    }
  };

  if (loading || !currentUser || !lead) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#090d16] text-white">
        <div className="space-y-4 text-center">
          <div className="h-10 w-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-slate-400 text-sm">Loading lead profile...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser.role === 'ADMIN';
  const isAssignedToMe = lead.assignedToId === currentUser.id;
  const canModify = isAdmin || isAssignedToMe;

  // Combine and sort notes and activities for a single unified trail
  const timelineItems: Array<
    | { type: 'note'; id: string; date: string; data: Note }
    | { type: 'activity'; id: string; date: string; data: Activity }
  > = [
    ...lead.notes.map((n) => ({ type: 'note' as const, id: n.id, date: n.createdAt, data: n })),
    ...lead.activities.map((a) => ({ type: 'activity' as const, id: a.id, date: a.createdAt, data: a })),
  ].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

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

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-white">
      {/* Top Header */}
      <header className="border-b border-white/5 bg-[#0e1628]/45 backdrop-blur-md sticky top-0 z-40 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-all text-sm font-semibold">
            <span>←</span> Back to Dashboard
          </Link>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-400">Authenticated as: </span>
          <span className="text-xs font-bold text-blue-400">{currentUser.name} ({currentUser.role})</span>
        </div>
      </header>

      {/* Workspace Wrapper */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 grid md:grid-cols-3 gap-6">
        {/* Left Side: Contact Details Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-[#111928]/45 border border-white/5 rounded-xl backdrop-blur-md p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-lg font-bold text-white">Lead Profile</h2>
              {canModify && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="text-xs font-semibold text-blue-400 hover:underline cursor-pointer"
                >
                  Edit Details
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSaveDetails} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Contact Name</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Phone</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Company</label>
                  <input
                    type="text"
                    value={editForm.company}
                    onChange={(e) => setEditForm({ ...editForm, company: e.target.value })}
                    className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-slate-400">Deal Value ($)</label>
                  <input
                    type="number"
                    value={editForm.value}
                    onChange={(e) => setEditForm({ ...editForm, value: e.target.value })}
                    className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-1.5 rounded text-xs transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditMode(false);
                      setEditForm({
                        name: lead.name,
                        email: lead.email,
                        phone: lead.phone || '',
                        company: lead.company || '',
                        value: lead.value.toString(),
                      });
                    }}
                    className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white font-semibold py-1.5 rounded text-xs transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Contact</div>
                  <div className="text-lg font-bold text-white mt-0.5">{lead.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{lead.email}</div>
                  {lead.phone && <div className="text-xs text-slate-400 mt-0.5">{lead.phone}</div>}
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Company</div>
                  <div className="text-sm font-semibold text-slate-300 mt-0.5">
                    {lead.company || <span className="text-slate-600 italic">No company provided</span>}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Estimated Deal Value</div>
                  <div className="text-lg font-bold text-amber-500 mt-0.5">
                    ${lead.value.toLocaleString('en-US')}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-500">Creation Date</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(lead.createdAt).toLocaleString('en-US')}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions Panel (Status + Assignee) */}
          <div className="bg-[#111928]/45 border border-white/5 rounded-xl backdrop-blur-md p-6 space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-white/5 pb-2">Deal Settings</h3>

            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Lead Status Pipeline</label>
              {canModify ? (
                <select
                  value={lead.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="NEW">New</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="QUALIFIED">Qualified</option>
                  <option value="PROPOSAL">Proposal</option>
                  <option value="WON">Won</option>
                  <option value="LOST">Lost</option>
                </select>
              ) : (
                <div className="flex items-center justify-between bg-[#1e293b]/20 border border-white/5 rounded px-3 py-1.5">
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getStatusColor(lead.status)}`}>
                    {lead.status}
                  </span>
                  <span className="text-[9px] text-slate-500 font-medium">Read Only</span>
                </div>
              )}
            </div>

            {/* Assignee Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold text-slate-400 block">Assigned Sales Agent</label>
              {isAdmin ? (
                <select
                  value={lead.assignedToId || ''}
                  onChange={(e) => handleUpdateAssignee(e.target.value)}
                  className="w-full bg-[#1e293b]/45 border border-white/10 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500 transition-all cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-[#1e293b]/20 border border-white/5 rounded px-3 py-2 text-sm text-slate-300">
                  {lead.assignedTo ? lead.assignedTo.name : 'Unassigned'}
                  <span className="text-[9px] text-slate-500 font-medium block mt-0.5">Only admins can assign accounts</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & Notes */}
        <div className="md:col-span-2 space-y-6 flex flex-col">
          {/* Notes Input Area */}
          <div className="bg-[#111928]/45 border border-white/5 rounded-xl backdrop-blur-md p-6 space-y-4">
            <h3 className="font-bold text-sm text-white border-b border-white/5 pb-2">Add Internal Note</h3>
            
            {canModify ? (
              <form onSubmit={handleAddNote} className="space-y-3">
                <textarea
                  required
                  rows={3}
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  placeholder="Record call logs, notes from meeting, or deal details..."
                  className="w-full bg-[#1e293b]/45 border border-white/10 rounded-lg p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-all"
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={noteSubmitting || !newNoteContent.trim()}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 rounded-lg text-xs shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                  >
                    {noteSubmitting ? 'Posting Note...' : 'Post Internal Note'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="bg-amber-500/5 border border-amber-500/20 text-amber-400 text-xs p-4 rounded-lg text-center">
                ⚠️ You can only add notes to leads that are assigned to you. Contact an administrator to assign this account to you.
              </div>
            )}
          </div>

          {/* Chronological Activity Trail / Notes timeline */}
          <div className="bg-[#111928]/30 border border-white/5 rounded-xl backdrop-blur-md p-6 space-y-6 flex-1">
            <h3 className="font-bold text-sm text-white border-b border-white/5 pb-4">Activity & Notes Timeline</h3>

            {timelineItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                No activity logs or notes on file.
              </div>
            ) : (
              <div className="relative pl-6 border-l-2 border-white/5 space-y-6">
                {timelineItems.map((item) => {
                  const dateStr = new Date(item.date).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  });

                  if (item.type === 'note') {
                    const note = item.data;
                    const isAuthorMe = note.user.id === currentUser.id;

                    return (
                      <div key={item.id} className="relative group">
                        {/* Bullet Icon */}
                        <span className="absolute -left-[31px] top-1.5 h-4.5 w-4.5 rounded-full border border-blue-500 bg-blue-900 flex items-center justify-center text-[9px] font-bold text-blue-300 shadow">
                          💬
                        </span>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-semibold text-white">{note.user.name}</span>
                            <span className="text-[10px] px-1 rounded bg-white/5 border border-white/10 text-slate-400 font-bold uppercase tracking-wider">
                              {note.user.role}
                            </span>
                            <span className="text-slate-500">•</span>
                            <span className="text-slate-500">{dateStr}</span>
                          </div>
                          {/* Note Bubble */}
                          <div className={`p-4 rounded-lg border max-w-xl text-sm ${
                            isAuthorMe 
                              ? 'bg-blue-500/5 border-blue-500/20 text-slate-100' 
                              : 'bg-white/5 border-white/10 text-slate-300'
                          }`}>
                            {note.content}
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    const act = item.data;
                    let actionIcon = '⚙️';
                    let actionColor = 'text-slate-400';

                    if (act.action === 'CREATED') {
                      actionIcon = '📥';
                      actionColor = 'text-blue-400';
                    } else if (act.action === 'ASSIGNED') {
                      actionIcon = '👤';
                      actionColor = 'text-indigo-400';
                    } else if (act.action === 'STATUS_UPDATED') {
                      actionIcon = '⚡';
                      actionColor = 'text-amber-400';
                    } else if (act.action === 'NOTE_ADDED') {
                      actionIcon = '📝';
                      actionColor = 'text-teal-400';
                    }

                    return (
                      <div key={item.id} className="relative flex items-start group">
                        {/* Bullet Icon */}
                        <span className="absolute -left-[30px] top-1 h-4.5 w-4.5 rounded-full border border-white/10 bg-[#1e293b] flex items-center justify-center text-[10px] shadow">
                          {actionIcon}
                        </span>
                        <div className="space-y-0.5">
                          <div className="text-xs text-slate-300">
                            <span className="font-semibold text-white">
                              {act.user ? act.user.name : 'System'}
                            </span>{' '}
                            {act.details}
                          </div>
                          <div className="text-[10px] text-slate-500">{dateStr}</div>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-4 px-6 text-center text-xs text-slate-600 bg-[#05080f]">
        Built for Digital Heroes Training Task
      </footer>
    </div>
  );
}
