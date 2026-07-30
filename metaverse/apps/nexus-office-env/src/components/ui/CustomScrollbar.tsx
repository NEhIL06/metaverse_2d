import React from 'react';

/**
 * Advanced_Scroll_Pro component adapted from https://framer.com/m/Advanced-Scroll-Pro-PM3R6r.js@JEjidqzyTNA3WCHmebnk
 * Replaces default browser scrollbar with a smaller, sleeker custom scrollbar.
 */
export interface AdvancedScrollProProps {
  gradientThumb?: boolean;
  thumbColor?: string;
  thumbHoverColor?: string;
  gradientStart?: string;
  gradientEnd?: string;
  hoverStart?: string;
  hoverEnd?: string;
  radius?: number;
  trackColor?: string;
  trackRadius?: number;
  transparentTrack?: boolean;
  hideVertical?: boolean;
  hideHorizontal?: boolean;
  verticalWidth?: number;
  horizontalHeight?: number;
}

export function AdvancedScrollPro({
  gradientThumb = true,
  thumbColor = '#7C3AED',
  thumbHoverColor = '#9333EA',
  gradientStart = '#6366F1',
  gradientEnd = '#EC4899',
  hoverStart = '#818CF8',
  hoverEnd = '#F43F5E',
  radius = 10,
  trackColor = '#0F172A',
  trackRadius = 0,
  transparentTrack = true,
  hideVertical = false,
  hideHorizontal = false,
  verticalWidth = 7,
  horizontalHeight = 7,
}: AdvancedScrollProProps = {}) {
  const verticalThumb = gradientThumb
    ? `linear-gradient(180deg, ${gradientStart}, ${gradientEnd})`
    : thumbColor;
  const verticalHover = gradientThumb
    ? `linear-gradient(180deg, ${hoverStart}, ${hoverEnd})`
    : thumbHoverColor;
  const horizontalThumb = gradientThumb
    ? `linear-gradient(90deg, ${gradientStart}, ${gradientEnd})`
    : thumbColor;
  const horizontalHover = gradientThumb
    ? `linear-gradient(90deg, ${hoverStart}, ${hoverEnd})`
    : thumbHoverColor;
  const trackBackground = transparentTrack ? 'transparent' : trackColor;

  const css = `
::-webkit-scrollbar {
  width: ${hideVertical ? 0 : verticalWidth}px;
  height: ${hideHorizontal ? 0 : horizontalHeight}px;
}

::-webkit-scrollbar-track {
  background: ${trackBackground};
  border-radius: ${trackRadius}px;
}

::-webkit-scrollbar-thumb {
  border-radius: ${radius}px;
}

/* Vertical scrollbar */
::-webkit-scrollbar-thumb:vertical {
  background: ${verticalThumb};
}

::-webkit-scrollbar-thumb:vertical:hover {
  background: ${verticalHover};
}

/* Horizontal scrollbar */
::-webkit-scrollbar-thumb:horizontal {
  background: ${horizontalThumb};
}

::-webkit-scrollbar-thumb:horizontal:hover {
  background: ${horizontalHover};
}

/* Firefox support */
* {
  scrollbar-width: thin;
  scrollbar-color: ${gradientStart} ${trackBackground};
}
`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export default AdvancedScrollPro;
