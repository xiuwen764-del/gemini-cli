/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect } from 'vitest';
import {
  detectBlockingOverlays,
  getOverlayFailureHint,
  wasActionBlockedByOverlay,
} from './overlayDetection.js';

describe('overlayDetection', () => {
  describe('detectBlockingOverlays', () => {
    it('should detect dialog role overlays', () => {
      const snapshot = `
        uid=1 document
          uid=2 div role="dialog"
            uid=3 button "Close"
      `;

      const result = detectBlockingOverlays(snapshot);
      expect(result.hasOverlay).toBe(true);
      expect(result.overlayInfo).toContain('dialog');
    });

    it('should detect cookie banners', () => {
      const snapshot = `
        uid=1 document
          uid=2 div "Cookie Consent"
            uid=3 p "We use cookies"
            uid=4 button "Accept All Cookies"
      `;

      const result = detectBlockingOverlays(snapshot);
      expect(result.hasOverlay).toBe(true);
    });

    it('should detect newsletter popups', () => {
      const snapshot = `
        uid=1 document
          uid=2 div class="popup"
            uid=3 h2 "Subscribe to newsletter"
            uid=4 button "No Thanks"
      `;

      const result = detectBlockingOverlays(snapshot);
      expect(result.hasOverlay).toBe(true);
      expect(result.suggestedAction).toContain('No Thanks');
    });

    it('should return no overlay for clean pages', () => {
      const snapshot = `
        uid=1 document
          uid=2 main
            uid=3 h1 "Welcome"
            uid=4 p "Page content"
            uid=5 button "Submit"
      `;

      const result = detectBlockingOverlays(snapshot);
      expect(result.hasOverlay).toBe(false);
      expect(result.overlayInfo).toBe('');
    });

    it('should identify close button options', () => {
      const snapshot = `
        uid=1 document
          uid=2 div role="dialog"
            uid=3 button "×"
            uid=4 button "Dismiss"
      `;

      const result = detectBlockingOverlays(snapshot);
      expect(result.hasOverlay).toBe(true);
      expect(result.suggestedAction).toMatch(/×|Dismiss/);
    });

    it('should detect aria-modal overlays', () => {
      const snapshot = `
        uid=1 document
          uid=2 div aria-modal="true"
            uid=3 h2 "Confirm Action"
      `;

      const result = detectBlockingOverlays(snapshot);
      expect(result.hasOverlay).toBe(true);
    });
  });

  describe('getOverlayFailureHint', () => {
    it('should return hint when overlay is present', () => {
      const snapshot = `
        uid=1 document
          uid=2 div role="dialog"
            uid=3 button "Close"
      `;

      const hint = getOverlayFailureHint('click', snapshot);
      expect(hint).not.toBeNull();
      expect(hint).toContain('click');
      expect(hint).toContain('overlay');
    });

    it('should return null when no overlay', () => {
      const snapshot = `
        uid=1 document
          uid=2 main
            uid=3 button "Submit"
      `;

      const hint = getOverlayFailureHint('click', snapshot);
      expect(hint).toBeNull();
    });
  });

  describe('wasActionBlockedByOverlay', () => {
    it('should detect persistent overlays', () => {
      const before = `
        uid=1 div role="dialog"
          uid=2 button "Close"
      `;
      const after = `
        uid=1 div role="dialog"
          uid=2 button "Close"
      `;

      expect(wasActionBlockedByOverlay(before, after)).toBe(true);
    });

    it('should not flag when overlay was dismissed', () => {
      const before = `
        uid=1 div role="dialog"
          uid=2 button "Close"
      `;
      const after = `
        uid=1 main
          uid=2 h1 "Welcome"
      `;

      expect(wasActionBlockedByOverlay(before, after)).toBe(false);
    });
  });
});
