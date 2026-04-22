"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/AuthContext";
import ConnectionsManager from "../components/ConnectionsManager";

export default function EditProfilePage() {
  const { user, isAuthenticated, isLoading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  const [formData, setFormData] = useState({
    username: "",
    avatar: "",
    favoriteTeam: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Protected route check
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login"); // Redirect to login if not authenticated
    }
  }, [authLoading, isAuthenticated, router]);

  // Pre-populate form when user data is available
  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || "",
        avatar: user.avatar || "",
        favoriteTeam: user.favoriteTeam || "",
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setToastMessage(null);

    try {
      const payload = {
        username: formData.username,
        avatar: formData.avatar,
        favoriteTeamId: formData.favoriteTeam || null,
      };

      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      // Update global context without requiring a hard refresh
      updateUser({
        username: formData.username,
        avatar: formData.avatar,
        favoriteTeam: formData.favoriteTeam,
      });

      setToastMessage({ type: "success", text: "Profile updated successfully!" });
      
      // Auto-hide the toast after 3 seconds
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      setToastMessage({ type: "error", text: err.message || "An unexpected error occurred." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Sample array for the dropdown options
  const TEAMS = [
    "Manchester United", "Real Madrid", "FC Barcelona", "Bayern Munich",
    "Arsenal", "Liverpool", "Chelsea", "Manchester City", "Juventus",
    "AC Milan", "Paris Saint-Germain", "Other",
  ];

  if (authLoading || (!isAuthenticated && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-400 font-medium tracking-wide">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-extrabold mb-2 text-indigo-700 dark:text-indigo-300 drop-shadow-lg">
          Profile Settings
        </h1>
        <p className="text-zinc-700 dark:text-zinc-300 text-lg max-w-xl mx-auto">
          Update your personal information and preferences.
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 p-6 sm:p-10 mb-10">
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Preview & URL Input */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="flex-shrink-0 relative group">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 flex items-center justify-center">
                {formData.avatar ? (
                  <img
                    src={formData.avatar}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                       (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${formData.username || 'User'}&backgroundColor=3730a3`;
                    }}
                  />
                ) : (
                  <span className="text-3xl font-bold text-zinc-500 uppercase">
                    {(formData.username || user?.email || "?")[0]}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-grow w-full space-y-2">
              <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                Avatar URL
              </label>
              <input
                type="url"
                name="avatar"
                value={formData.avatar}
                onChange={handleChange}
                placeholder="https://example.com/avatar.png"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-500 mt-1">Provide a direct link to a public image.</p>
            </div>
          </div>

          {/* Username */}
          <div className="space-y-2 group">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Username
            </label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="cool_user_123"
              className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Favorite Team */}
          <div className="space-y-2 group">
            <label className="block text-sm font-semibold text-zinc-700 dark:text-zinc-300">
              Favorite Team
            </label>
            <div className="relative">
              <select
                name="favoriteTeam"
                value={formData.favoriteTeam}
                onChange={handleChange}
                className="appearance-none w-full px-4 py-2 border border-zinc-300 dark:border-zinc-600 rounded bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="" disabled className="text-zinc-500">
                  Select a team...
                </option>
                {TEAMS.map((team) => (
                  <option key={team} value={team} className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
                    {team}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-zinc-500">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full font-medium bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded shadow transition disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {isSubmitting ? (
                  <>
                    <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving Changes...
                  </>
                ) : (
                  "Save Profile"
                )}
              </span>
            </button>
          </div>
        </form>
      </div>

      {/* Connections Section */}
      <div className="mt-8">
        <ConnectionsManager />
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 p-4 rounded shadow-lg flex items-center gap-3 transition-opacity duration-300 z-50 ${
            toastMessage.type === "success"
              ? "bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400"
              : "bg-red-100 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          }`}
        >
          {toastMessage.type === "success" ? (
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
             <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span className="font-medium text-sm">{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}