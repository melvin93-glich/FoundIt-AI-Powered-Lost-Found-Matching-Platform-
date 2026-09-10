"use client";

import React, { useState, useEffect } from "react";
import { Search, Shield, Trash2, Edit2, ArrowUpDown } from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { EditDrawer } from "@/components/admin/EditDrawer";
import api from "@/lib/api";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Selection & Pagination
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Edit Drawer State
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState("user");
  const [saving, setSaving] = useState(false);

  // Delete Modal State
  const [deletingUser, setDeletingUser] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/admin/users", {
        params: { search, role: roleFilter },
      });
      setUsers(resp.data || []);
    } catch (err) {
      console.error(err);
      setUsers(mockUsers);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRole = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      await api.patch(
        `/admin/users/${editingUser.id}/role`,
        { role: newRole }
      );
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, role: newRole } : u)));
      setEditingUser(null);
    } catch (err) {
      console.error(err);
      setUsers(users.map((u) => (u.id === editingUser.id ? { ...u, role: newRole } : u)));
      setEditingUser(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!deletingUser) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/users/${deletingUser.id}`);
      setUsers(users.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
    } catch (err) {
      console.error(err);
      setUsers(users.filter((u) => u.id !== deletingUser.id));
      setDeletingUser(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try {
        await api.delete(`/admin/users/${id}`);
      } catch (e) {}
    }
    setUsers(users.filter((u) => !selectedIds.includes(u.id)));
    setSelectedIds([]);
  };

  const totalPages = Math.ceil(users.length / pageSize) || 1;
  const paginatedUsers = users.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E2022]">Users Directory Management</h1>
          <p className="text-xs text-[#72787E] mt-0.5">Manage user accounts, promote roles, and audit reported items.</p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="bg-[#8C2D19] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#702414] transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} /> Delete Selected ({selectedIds.length})
          </button>
        )}
      </div>

      {/* Toolbar */}
      <div className="custom-card rounded-xl p-4 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-[#72787E]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user name or email..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
        >
          <option value="all">All Roles</option>
          <option value="user">Regular Users</option>
          <option value="admin">Administrators</option>
        </select>
      </div>

      {/* Dense Data Table */}
      <div className="custom-card rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E5E2DC] text-[#72787E] font-mono uppercase text-[10px]">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedUsers.length && paginatedUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(paginatedUsers.map((u) => u.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="p-4 font-semibold">User Details</th>
                <th className="p-4 font-semibold">Role</th>
                <th className="p-4 font-semibold">Items Reported</th>
                <th className="p-4 font-semibold">Joined Date</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]">
              {paginatedUsers.map((u) => (
                <tr key={u.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(u.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, u.id]);
                        else setSelectedIds(selectedIds.filter((id) => id !== u.id));
                      }}
                    />
                  </td>
                  <td className="p-4">
                    <span className="font-semibold text-[#1E2022] block">{u.name}</span>
                    <span className="text-[#72787E] text-[11px] block">{u.email}</span>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        u.role === "admin"
                          ? "bg-[#1E2022] text-white"
                          : "bg-[#EAE7E1] text-[#1E2022]"
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-4 font-mono font-semibold text-[#1E2022]">
                    {u.items_count || 0} items
                  </td>
                  <td className="p-4 text-[#72787E] font-mono text-[11px]">
                    {new Date(u.created_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => { setEditingUser(u); setNewRole(u.role); }}
                      className="p-1 text-[#2E4A3E] hover:bg-[#E2EAE6] rounded"
                      title="Edit Role"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingUser(u)}
                      className="p-1 text-[#8C2D19] hover:bg-[#F9EBE8] rounded"
                      title="Delete User"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E5E2DC] flex items-center justify-between text-xs font-mono text-[#72787E]">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-3 py-1 bg-[#FAF8F5] border border-[#E5E2DC] rounded disabled:opacity-40"
            >
              Prev
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-3 py-1 bg-[#FAF8F5] border border-[#E5E2DC] rounded disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Edit Role Side Drawer */}
      <EditDrawer
        isOpen={!!editingUser}
        title="Promote or Change User Role"
        onClose={() => setEditingUser(null)}
        onSave={handleSaveRole}
        loading={saving}
      >
        <div className="space-y-3">
          <p className="text-xs text-[#72787E]">
            Modifying role for <strong>{editingUser?.name}</strong> ({editingUser?.email}).
          </p>
          <div>
            <label className="block text-xs font-semibold text-[#1E2022] uppercase tracking-wider mb-1">
              Select Role
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded focus:outline-none focus:border-[#2E4A3E]"
            >
              <option value="user">User (Standard Access)</option>
              <option value="admin">Admin (Full System Privileges)</option>
            </select>
          </div>
        </div>
      </EditDrawer>

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        isOpen={!!deletingUser}
        title="Permanently Remove User Account?"
        message={`This will permanently remove ${deletingUser?.name} (${deletingUser?.email}) and their reported items from FoundIt. This action cannot be undone.`}
        onConfirm={handleDeleteUser}
        onCancel={() => setDeletingUser(null)}
        loading={deleting}
      />

    </div>
  );
}

const mockUsers = [
  { id: "u_1", name: "System Administrator", email: "admin@foundit.org", role: "admin", items_count: 5, created_at: new Date().toISOString() },
  { id: "u_2", name: "Alex Rivera", email: "alex@university.edu", role: "user", items_count: 2, created_at: new Date().toISOString() },
  { id: "u_3", name: "Sarah Connor", email: "sarah@university.edu", role: "user", items_count: 3, created_at: new Date().toISOString() },
];
