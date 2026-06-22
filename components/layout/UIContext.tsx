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
  const [isMounted, setIsMounted] = useState(false);

  // Load from localStorage on client mount
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      // Migrate from old kumpulenak_ keys if present
      const migrateKey = (oldKey: string, newKey: string) => {
        const oldVal = localStorage.getItem(oldKey);
        if (oldVal) {
          localStorage.setItem(newKey, oldVal);
          localStorage.removeItem(oldKey);
          return oldVal;
        }
        return localStorage.getItem(newKey);
      };
      const savedLikes = migrateKey("kumpulenak_likes", "lusthub_likes");
      const savedHistory = migrateKey("kumpulenak_history", "lusthub_history");
      if (savedLikes) setLikedVideos(JSON.parse(savedLikes));
      if (savedHistory) setWatchHistory(JSON.parse(savedHistory));
    } catch (e) {
      console.error("Failed to load local settings:", e);
    }
    setIsMounted(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  // Save likedVideos to localStorage on change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("lusthub_likes", JSON.stringify(likedVideos));
    } catch (e) {
      console.error("Failed to save likes:", e);
    }
  }, [likedVideos, isMounted]);

  // Save watchHistory to localStorage on change
  useEffect(() => {
    if (!isMounted) return;
    try {
      localStorage.setItem("lusthub_history", JSON.stringify(watchHistory));
    } catch (e) {
      console.error("Failed to save history:", e);
    }
  }, [watchHistory, isMounted]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((prev) => !prev), []);
  const toggleMobileMenu = useCallback(() => setMobileMenuOpen((prev) => !prev), []);

  const toggleLikeVideo = useCallback((videoId: string) => {
    setLikedVideos((prev) => 
      prev.includes(videoId) 
        ? prev.filter((id) => id !== videoId)
        : [...prev, videoId]
    );
  }, []);

  const addToHistory = useCallback((videoId: string) => {
    setWatchHistory((prev) => {
      const filtered = prev.filter((id) => id !== videoId);
      return [videoId, ...filtered].slice(0, 50);
    });
  }, []);

  const clearHistory = useCallback(() => {
    setWatchHistory([]);
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
