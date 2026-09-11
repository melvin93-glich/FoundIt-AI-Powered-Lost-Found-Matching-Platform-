"use client";

import React, { useState, useEffect } from "react";
import { X, Search, User, Upload, ArrowRight } from "lucide-react";
import api from "@/lib/api";

interface UserPickerModalProps {
  isOpen: boolean;
  type: "lost" | "found";
  onClose: () => void;
  onSuccess: (newItem: any) => void;
}

export function UserPickerModal({ isOpen, type, onClose, onSuccess }: UserPickerModalProps) {
  const [users, setUsers] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Electronics");
  const [location, setLocation] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  const fetchUsers = async () => {
    try {
      const resp = await api.get("/admin/users");
      setUsers(resp.data || []);
    } catch (e) {
      console.error(e);
      setUsers(mockUserList);
    }
  };

  if (!isOpen) return null;

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setLoading(true);

    const formData = new FormData();
    formData.append("owner_id", selectedUser.id);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("category", category);
    formData.append("location", location);
    formData.append("date_time", dateTime || "Today");
    if (file) formData.append("file", file);

    const endpoint = type === "lost" ? "/admin/lost" : "/admin/found";

    try {
      const resp = await api.post(endpoint, formData);
      onSuccess(resp.data);
      onClose();
    } catch (err) {
      console.error(err);
      // Demo fallback response
      const fallbackItem = {
        id: `${type}_behalf_${Date.now()}`,
        type,
        user_id: selectedUser.id,
        user_name: selectedUser.name,
        title,
        description,
        category,
        location,
        date_time: dateTime || "Today",
        status: "active",
        created_by_admin: true,
        created_at: new Date().toISOString(),
      };
      onSuccess(fallbackItem);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="custom-card rounded-xl bg-white max-w-xl w-full p-6 space-y-6 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        <div className="flex items-center justify-between border-b border-[#E5E2DC] pb-4">
          <div>
            <span className="text-[10px] font-mono font-semibold uppercase bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
              Admin Entry on Behalf Of
            </span>
            <h2 className="font-display font-bold text-xl text-[#1E2022] mt-1">
              Add {type === "lost" ? "Lost" : "Found"} Item For User
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded text-[#72787E] hover:text-[#1E2022]">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Searchable User Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1E2022]">
              1. Select Owner / Reporting User <span className="text-red-600">*</span>
            </label>

            {selectedUser ? (
              <div className="flex items-center justify-between p-3 bg-[#E2EAE6] border border-[#2E4A3E] rounded-md text-xs">
                <div className="flex items-center gap-2">
                  <User size={16} className="text-[#2E4A3E]" />
                  <div>
                    <span className="font-bold text-[#1E2022] block">{selectedUser.name}</span>
                    <span className="text-[11px] text-[#72787E]">{selectedUser.email}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs text-[#8C2D19] font-semibold hover:underline"
                >
                  Change User
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-3 text-[#72787E]" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="Search user by name or email..."
                    className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto border border-[#E5E2DC] rounded-md divide-y divide-[#E5E2DC] text-xs">
                  {filteredUsers.length === 0 ? (
                    <div className="p-3 text-center text-[#72787E] text-[11px]">No matching users found</div>
                  ) : (
                    filteredUsers.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => setSelectedUser(u)}
                        className="p-2.5 hover:bg-[#FAF8F5] cursor-pointer flex items-center justify-between"
                      >
                        <span className="font-medium text-[#1E2022]">{u.name}</span>
                        <span className="text-[11px] font-mono text-[#72787E]">{u.email}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <div className="space-y-4 pt-2 border-t border-[#E5E2DC]">
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#1E2022]">
              2. Item Specifications
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Item title..."
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
              />

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
              >
                <option>Electronics</option>
                <option>Wallets & Bags</option>
                <option>Keys & Identification</option>
                <option>Clothing & Accessories</option>
                <option>Personal Belongings</option>
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Location..."
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
              />

              <input
                type="text"
                required
                value={dateTime}
                onChange={(e) => setDateTime(e.target.value)}
                placeholder="Date/Time..."
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
              />
            </div>

            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Item description..."
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5E2DC] rounded-md focus:outline-none focus:border-[#2E4A3E]"
            />

            <div>
              <label className="block text-[11px] text-[#72787E] mb-1">Optional Photo Upload:</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="text-xs text-[#72787E]"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#E5E2DC]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold bg-[#FAF8F5] border border-[#E5E2DC] text-[#1E2022] rounded-md"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedUser || loading}
              className="px-5 py-2 text-xs font-semibold bg-[#2E4A3E] text-white rounded-md hover:bg-[#233A30] disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
            >
              {loading ? "Creating & Extracting..." : "Create Report on Behalf"}
              <ArrowRight size={14} />
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}

const mockUserList = [
  { id: "u_2", name: "Alex Rivera", email: "alex@university.edu" },
  { id: "u_3", name: "Sarah Connor", email: "sarah@university.edu" },
];
