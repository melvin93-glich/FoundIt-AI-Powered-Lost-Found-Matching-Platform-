"use client";

import React, { useState, useEffect } from "react";
import { Search, Trash2, Edit2, Tag, MapPin, Calendar, CheckCircle } from "lucide-react";
import { ConfirmModal } from "@/components/admin/ConfirmModal";
import { EditDrawer } from "@/components/admin/EditDrawer";
import api from "@/lib/api";

export default function AdminFoundItemsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;

  // Drawer edit state
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [deletingItem, setDeletingItem] = useState<any | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFoundItems();
  }, []);

  const fetchFoundItems = async () => {
    setLoading(true);
    try {
      const resp = await api.get("/admin/found");
      setItems(resp.data || []);
    } catch (err) {
      console.error(err);
      setItems(mockFound);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditLocation(item.location);
    setEditStatus(item.status);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setSaving(true);
    const updates = {
      title: editTitle,
      category: editCategory,
      location: editLocation,
      status: editStatus,
    };

    try {
      await api.patch(`/admin/found/${editingItem.id}`, updates);
      setItems(items.map((i) => (i.id === editingItem.id ? { ...i, ...updates } : i)));
      setEditingItem(null);
    } catch (err) {
      console.error(err);
      setItems(items.map((i) => (i.id === editingItem.id ? { ...i, ...updates } : i)));
      setEditingItem(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await api.delete(`/admin/found/${deletingItem.id}`);
      setItems(items.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
    } catch (err) {
      console.error(err);
      setItems(items.filter((i) => i.id !== deletingItem.id));
      setDeletingItem(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    for (const id of selectedIds) {
      try {
        await api.delete(`/admin/found/${id}`);
      } catch (e) {}
    }
    setItems(items.filter((i) => !selectedIds.includes(i.id)));
    setSelectedIds([]);
  };

  const filteredItems = items.filter((i) => {
    if (categoryFilter !== "All" && i.category !== categoryFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.title.toLowerCase().includes(q) || i.location.toLowerCase().includes(q);
    }
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
  const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E2DC] pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-[#1E2022]">Found Items Inventory</h1>
          <p className="text-xs text-[#72787E] mt-0.5">Admin management for all turned-in found items.</p>
        </div>

        {selectedIds.length > 0 && (
          <button
            onClick={handleBulkDelete}
            className="bg-[#8C2D19] text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-[#702414] transition-colors flex items-center gap-1"
          >
            <Trash2 size={14} /> Bulk Delete ({selectedIds.length})
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
            placeholder="Search by title, location..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
        >
          <option value="All">All Categories</option>
          <option value="Electronics">Electronics</option>
          <option value="Wallets & Bags">Wallets & Bags</option>
          <option value="Personal Belongings">Personal Belongings</option>
        </select>
      </div>

      {/* Data Table */}
      <div className="custom-card rounded-xl bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#FAF8F5] border-b border-[#E5E2DC] text-[#72787E] font-mono uppercase text-[10px]">
              <tr>
                <th className="p-4 w-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === paginatedItems.length && paginatedItems.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedIds(paginatedItems.map((i) => i.id));
                      else setSelectedIds([]);
                    }}
                  />
                </th>
                <th className="p-4 font-semibold">Found Item</th>
                <th className="p-4 font-semibold">Category</th>
                <th className="p-4 font-semibold">Location</th>
                <th className="p-4 font-semibold">Turned-in By</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E2DC]">
              {paginatedItems.map((item) => (
                <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                  <td className="p-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds([...selectedIds, item.id]);
                        else setSelectedIds(selectedIds.filter((id) => id !== item.id));
                      }}
                    />
                  </td>
                  <td className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-[#EAE7E1] overflow-hidden shrink-0">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <Tag size={16} className="m-auto text-[#72787E]" />
                      )}
                    </div>
                    <div>
                      <span className="font-semibold text-[#1E2022] block">{item.title}</span>
                      <span className="text-[#72787E] text-[11px] block line-clamp-1">{item.description}</span>
                    </div>
                  </td>
                  <td className="p-4 font-medium text-[#4A5056]">{item.category}</td>
                  <td className="p-4 text-[#72787E]">{item.location}</td>
                  <td className="p-4 font-semibold text-[#1E2022]">{item.user_name}</td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                        item.status === "matched"
                          ? "bg-amber-100 text-amber-900 border border-amber-300"
                          : "bg-emerald-100 text-emerald-900 border border-emerald-300"
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(item)}
                      className="p-1 text-[#2E4A3E] hover:bg-[#E2EAE6] rounded"
                      title="Edit Item"
                    >
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => setDeletingItem(item)}
                      className="p-1 text-[#8C2D19] hover:bg-[#F9EBE8] rounded"
                      title="Delete Item"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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

      {/* Edit Drawer */}
      <EditDrawer
        isOpen={!!editingItem}
        title="Edit Found Item Details"
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEdit}
        loading={saving}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1E2022] mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded focus:outline-none focus:border-[#2E4A3E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1E2022] mb-1">
              Category
            </label>
            <input
              type="text"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded focus:outline-none focus:border-[#2E4A3E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1E2022] mb-1">
              Location
            </label>
            <input
              type="text"
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded focus:outline-none focus:border-[#2E4A3E]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1E2022] mb-1">
              Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded focus:outline-none focus:border-[#2E4A3E]"
            >
              <option value="active">Active (Open)</option>
              <option value="matched">Matched</option>
              <option value="resolved">Resolved / Claimed</option>
            </select>
          </div>
        </div>
      </EditDrawer>

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={!!deletingItem}
        title="Delete Found Item Report?"
        message={`This will permanently delete this found item report ("${deletingItem?.title}"). This cannot be undone.`}
        onConfirm={handleDeleteItem}
        onCancel={() => setDeletingItem(null)}
        loading={deleting}
      />

    </div>
  );
}

const mockFound = [
  { id: "found_102", title: "Found Black Leather Bifold Wallet", category: "Wallets & Bags", location: "Central Library", user_name: "Sarah Connor", status: "active", image_url: "https://images.unsplash.com/photo-1627123424574-724758594e93?w=500&q=80" },
  { id: "found_104", title: "Matte Black Wireless Earbuds Case", category: "Electronics", location: "Student Union Plaza", user_name: "Alex Rivera", status: "active", image_url: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&q=80" },
];
