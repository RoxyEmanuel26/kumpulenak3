"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

interface UIContextType {
  isSidebarCollapsed: boolean;
  isMobileMenuOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileMenuOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  toggleMobileMenu: () => void;
  
  // Localized user state for premium interactions
  likedVideos: string[];
  toggleLikeVideo: (videoId: string) => void;
  watchHistory: string[];
  addToHistory: (videoId: string) => void;
  clearHistory: () => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [likedVideos, setLikedVideos] = useState<string[]>([]);
  const [watchHistory, setWatchHistory] = useState<string[]>([]);

  // Load from localStorage on client mount
  useEffect(() => {
    try {
      const savedLikes = localStorage.getItem("kumpulenak_likes");
      const savedHistory = localStorage.getItem("kumpulenak_history");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedLikes) setLikedVideos(JSON.parse(savedLikes));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Failed to load local settings:", e);
    }
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  const toggleLikeVideo = useCallback((videoId: string) => {
    setLikedVideos((prev) => {
      const next = prev.includes(videoId) 
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId];
      try { localStorage.setItem("kumpulenak_likes", JSON.stringify(next)); } catch (e) { console.error("Failed to save likes:", e); }
      return next;
    });
  }, []);

  const addToHistory = useCallback((videoId: string) => {
    setWatchHistory((prev) => {
      // Avoid duplicates: remove and place at start
      const filtered = prev.filter((id) => id !== videoId);
      const next = [videoId, ...filtered].slice(0, 50); // limit to 50 items
      try { localStorage.setItem("kumpulenak_history", JSON.stringify(next)); } catch (e) { console.error("Failed to save history:", e); }
      return next;
    });
  }, []);

  const clearHistory = useCallback(() => {
    setWatchHistory([]);
    try { localStorage.removeItem("kumpulenak_history"); } catch (e) { console.error("Failed to clear history:", e); }
  }, []);

  return (
    <UIContext.Provider
      value={{
        isSidebarCollapsed,
        isMobileMenuOpen,
        setSidebarCollapsed,
        setMobileMenuOpen,
        toggleSidebar,
        toggleMobileMenu,
        likedVideos,
        toggleLikeVideo,
        watchHistory,
        addToHistory,
        clearHistory,
      }}
    >
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
