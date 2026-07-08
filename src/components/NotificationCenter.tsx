import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, Trash2, Mail, FileCheck, CheckSquare, ShieldAlert, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Notification {
  id: string;
  userRole: string;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: string;
}

interface NotificationCenterProps {
  activeRole: string;
  userEmail?: string;
}

export default function NotificationCenter({ activeRole, userEmail }: NotificationCenterProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      // Skip if no role is set (user not authenticated)
      if (!activeRole) return;

      const res = await fetch("/api/notifications");

      // If unauthorized (401/403), skip silently — user may not be logged in yet
      if (res.status === 401 || res.status === 403) return;

      // Guard: only parse JSON if the response is actually JSON
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) return;

      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      // Network errors are expected when server is restarting — swallow silently
      console.warn("Notification poll skipped:", (err as Error).message);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll notifications every 10 seconds for real-time responsiveness
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, [activeRole, userEmail]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "PUT"
      });
      if (res.ok) {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const clearAll = async () => {
    try {
      const res = await fetch("/api/notifications/clear-all", {
        method: "POST"
      });
      if (res.ok) {
        setNotifications([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = async (n: Notification) => {
    await markAsRead(n.id);
    setIsOpen(false);
    if (n.link) {
      window.location.hash = n.link;
    }
  };

  const getIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("approved") || t.includes("cleared") || t.includes("finalized")) {
      return <FileCheck className="w-4 h-4 text-emerald-500" />;
    }
    if (t.includes("rejected") || t.includes("failed") || t.includes("warning")) {
      return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    }
    if (t.includes("pending") || t.includes("approval")) {
      return <CheckSquare className="w-4 h-4 text-amber-500" />;
    }
    return <Sparkles className="w-4 h-4 text-sky-500" />;
  };

  const unreadCount = notifications.length;

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Trigger Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition relative cursor-pointer active:scale-95"
      >
        <Bell className="w-4.5 h-4.5" />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.7, opacity: 0 }}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gradient-to-tr from-orange-500 to-amber-500 text-white rounded-full flex items-center justify-center text-[9px] font-black tracking-tighter shadow-lg shadow-orange-500/20 border border-slate-950 font-mono"
            >
              {unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* Dropdown Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 mt-2 w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl overflow-hidden z-[999] flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                Inbox Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[9px] font-black text-rose-400 hover:text-rose-300 uppercase tracking-wider flex items-center gap-1 cursor-pointer transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear All
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60">
              {notifications.length === 0 ? (
                <div className="p-8 text-center text-slate-500 space-y-2">
                  <Mail className="w-8 h-8 mx-auto text-slate-600 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-wider block">
                    No new alerts
                  </span>
                  <span className="text-[9px] text-slate-600 block">
                    You are fully caught up with the corporate workflow
                  </span>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className="p-3.5 hover:bg-slate-800/40 transition cursor-pointer flex gap-3 text-left relative group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-950 flex items-center justify-center shrink-0 border border-slate-800/80">
                      {getIcon(n.title)}
                    </div>
                    
                    <div className="space-y-1 pr-6 flex-1">
                      <span className="text-[10px] font-black text-slate-200 block leading-tight">
                        {n.title}
                      </span>
                      <p className="text-[10px] text-slate-400 font-bold block leading-normal">
                        {n.message}
                      </p>
                      <span className="text-[8px] font-black text-slate-600 font-mono block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <button
                      onClick={(e) => markAsRead(n.id, e)}
                      className="absolute right-3.5 top-3.5 w-6 h-6 rounded-md bg-slate-950 border border-slate-850 opacity-0 group-hover:opacity-100 flex items-center justify-center text-slate-400 hover:text-emerald-400 hover:border-emerald-900 transition cursor-pointer"
                      title="Mark as read"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
