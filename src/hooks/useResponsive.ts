"use client";

import { useState, useEffect } from "react";

interface ResponsiveState {
  width: number;
  height: number;
  scale: number;
  isPortrait: boolean;
}

export function useResponsive() {
  const [state, setState] = useState<ResponsiveState>({
    width: typeof window !== "undefined" ? window.innerWidth : 1920,
    height: typeof window !== "undefined" ? window.innerHeight : 1080,
    scale: 1,
    isPortrait: typeof window !== "undefined" ? window.innerHeight > window.innerWidth : false,
  });

  useEffect(() => {
    const updateSize = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isPortrait = height > width;
      
      // 基準尺寸（設計稿尺寸）
      const baseWidth = 1920;
      const baseHeight = 1080;
      
      // 計算縮放比例（保持寬高比）
      const scaleX = width / baseWidth;
      const scaleY = height / baseHeight;
      const scale = Math.min(scaleX, scaleY);

      setState({
        width,
        height,
        scale,
        isPortrait,
      });
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    window.addEventListener("orientationchange", updateSize);

    return () => {
      window.removeEventListener("resize", updateSize);
      window.removeEventListener("orientationchange", updateSize);
    };
  }, []);

  return state;
}



