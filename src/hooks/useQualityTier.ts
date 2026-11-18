import { useMemo } from 'react';

export type QualityTier = 'low' | 'medium' | 'high';

export interface QualityConfig {
  tier: QualityTier;
  dpr: [number, number];
  shadowMapSize: number;
  enableShadows: boolean;
  /** Hệ số mật độ cây cảnh: 0.55 (low), 0.7 (medium), 1.0 (high) */
  foliageDensity: number;
}

export function useQualityTier(): QualityConfig {
  return useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        tier: 'medium',
        dpr: [1, 1.5],
        shadowMapSize: 1024,
        enableShadows: true,
        foliageDensity: 0.7,
      };
    }

    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad|iPod|Mobile/i.test(ua);
    const cores = navigator.hardwareConcurrency || 4;
    const memory = (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4;

    if (isMobile && (cores <= 4 || memory <= 3)) {
      return {
        tier: 'low',
        dpr: [1, 1.25],
        shadowMapSize: 512,
        enableShadows: false,
        foliageDensity: 0.55,
      };
    }

    if (isMobile || cores <= 6 || memory <= 4) {
      return {
        tier: 'medium',
        dpr: [1, 1.5],
        shadowMapSize: 1024,
        enableShadows: true,
        foliageDensity: 0.7,
      };
    }

    return {
      tier: 'high',
      dpr: [1, 2],
      shadowMapSize: 2048,
      enableShadows: true,
      foliageDensity: 1.0,
    };
  }, []);
}
