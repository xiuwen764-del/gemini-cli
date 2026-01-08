/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Overlay detection for browser agent robustness.
 *
 * Helps the agent detect and handle blocking overlays like
 * cookie banners, popups, and modals that may interfere with
 * page interaction.
 */

import { debugLogger } from '../../utils/debugLogger.js';

/**
 * Result of overlay detection.
 */
export interface OverlayDetectionResult {
  hasOverlay: boolean;
  overlayInfo: string;
  suggestedAction: string;
}

/**
 * Patterns that indicate blocking overlays in accessibility tree.
 */
const OVERLAY_PATTERNS = [
  // Role-based patterns
  /role="dialog"/i,
  /role="alertdialog"/i,
  /role="tooltip"/i,
  /aria-modal="true"/i,

  // Common overlay text patterns
  /cookie\s*(banner|consent|notice|policy)/i,
  /accept\s*all\s*cookies/i,
  /we\s*use\s*cookies/i,
  /privacy\s*settings/i,
  /newsletter\s*(sign\s*up|popup)/i,
  /subscribe\s*to/i,
  /sign\s*up\s*for/i,

  // Modal/popup patterns
  /modal|popup|overlay|lightbox/i,
  /close\s*(button|modal|dialog)/i,
  /dismiss|got\s*it|no\s*thanks|maybe\s*later/i,
];

/**
 * Common close button patterns.
 */
const CLOSE_BUTTON_PATTERNS = [
  /×|✕|✖|⨉|⨯/,
  /\bclose\b/i,
  /\bdismiss\b/i,
  /\bcancel\b/i,
  /\bgot\s*it\b/i,
  /\bno\s*thanks\b/i,
  /\baccept\b/i,
  /\bI\s*agree\b/i,
  /\bcontinue\b/i,
];

/**
 * Detects blocking overlays in an accessibility tree snapshot.
 *
 * @param snapshot The accessibility tree text to analyze
 * @returns Detection result with overlay info and suggested actions
 */
export function detectBlockingOverlays(
  snapshot: string,
): OverlayDetectionResult {
  const overlaysFound: string[] = [];

  // Check for overlay patterns
  for (const pattern of OVERLAY_PATTERNS) {
    if (pattern.test(snapshot)) {
      overlaysFound.push(pattern.source);
    }
  }

  if (overlaysFound.length === 0) {
    return {
      hasOverlay: false,
      overlayInfo: '',
      suggestedAction: '',
    };
  }

  // Look for close button opportunities
  const closeButtons: string[] = [];
  for (const pattern of CLOSE_BUTTON_PATTERNS) {
    const match = snapshot.match(pattern);
    if (match) {
      closeButtons.push(match[0]);
    }
  }

  const overlayInfo = `Detected overlay patterns: ${overlaysFound.slice(0, 3).join(', ')}`;

  let suggestedAction =
    'Look for a close button (×, Close, Dismiss, Got it) and click it to dismiss the overlay.';

  if (closeButtons.length > 0) {
    suggestedAction = `Found potential close buttons: ${closeButtons.slice(0, 3).join(', ')}. Click one to dismiss the overlay.`;
  }

  debugLogger.log(`Overlay detected: ${overlayInfo}`);

  return {
    hasOverlay: true,
    overlayInfo,
    suggestedAction,
  };
}

/**
 * Generates a hint message for the model when an action may have failed
 * due to an overlay.
 */
export function getOverlayFailureHint(
  actionName: string,
  snapshot: string,
): string | null {
  const detection = detectBlockingOverlays(snapshot);

  if (!detection.hasOverlay) {
    return null;
  }

  return `⚠️ Your ${actionName} action may have failed due to a blocking overlay.
${detection.overlayInfo}
${detection.suggestedAction}
Please dismiss the overlay before continuing with your task.`;
}

/**
 * Checks if a click action likely failed due to an overlay.
 *
 * Analyzes the snapshot before and after a click to determine
 * if the click was blocked.
 */
export function wasActionBlockedByOverlay(
  beforeSnapshot: string,
  afterSnapshot: string,
): boolean {
  // If snapshots are very similar and overlay is detected, action was likely blocked
  const beforeDetection = detectBlockingOverlays(beforeSnapshot);
  const afterDetection = detectBlockingOverlays(afterSnapshot);

  // If overlay persists after action, it may have blocked the action
  if (beforeDetection.hasOverlay && afterDetection.hasOverlay) {
    // Simple similarity check - if overlay patterns are the same
    return beforeDetection.overlayInfo === afterDetection.overlayInfo;
  }

  return false;
}
