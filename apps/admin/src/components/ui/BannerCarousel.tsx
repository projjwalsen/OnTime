'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { api } from '../../lib/api';
import { getMediaUrl } from '../../lib/config';
import { Banner } from '@ontime/shared';

export function BannerCarousel() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await api.getBanners(true);
      if (res.success && res.data?.banners) {
        setBanners(res.data.banners);
      }
    } catch {
      // non-blocking
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const handleNext = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const handlePrev = useCallback(() => {
    if (banners.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-play timer
  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, 5000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [banners.length, isPaused, handleNext]);

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  if (!currentBanner) return null;

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      style={{
        position: 'relative',
        borderRadius: '16px',
        overflow: 'hidden',
        marginBottom: '2rem',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
        height: '240px',
        background: '#0f172a',
      }}
    >
      {/* Background Image with Overlay */}
      {currentBanner.imageUrl && (
        <img
          key={currentBanner.id || currentBanner.imageUrl}
          src={getMediaUrl(currentBanner.imageUrl)}
          alt={currentBanner.title}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center',
            transition: 'opacity 0.5s ease-in-out',
            zIndex: 0,
          }}
          onError={(e) => {
            console.warn(`[BannerCarousel] Failed to load banner image: ${currentBanner.imageUrl}`);
            e.currentTarget.style.display = 'none';
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background:
            'linear-gradient(90deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.4) 60%, rgba(15, 23, 42, 0.1) 100%)',
          zIndex: 1,
        }}
      />

      {/* Banner Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '0 3rem',
          maxWidth: '650px',
        }}
      >
        <span
          style={{
            display: 'inline-block',
            backgroundColor: 'rgba(37, 99, 235, 0.9)',
            color: '#ffffff',
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '1px',
            marginBottom: '8px',
            width: 'fit-content',
          }}
        >
          Special Promotion
        </span>
        <h2
          style={{
            color: '#ffffff',
            fontSize: '1.75rem',
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: '6px',
            textShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {currentBanner.title}
        </h2>
        {currentBanner.subtitle && (
          <p
            style={{
              color: '#e2e8f0',
              fontSize: '0.95rem',
              lineHeight: 1.4,
              marginBottom: '1rem',
            }}
          >
            {currentBanner.subtitle}
          </p>
        )}

        {currentBanner.linkUrl && (
          <div>
            <Link
              href={currentBanner.linkUrl}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#ffffff',
                color: '#0f172a',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 700,
                textDecoration: 'none',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                transition: 'transform 0.15s ease',
              }}
            >
              <span>Explore Now</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        )}
      </div>

      {/* Prev / Next Chevrons */}
      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              transition: 'background-color 0.2s',
            }}
            title="Previous banner"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              backgroundColor: 'rgba(15, 23, 42, 0.6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 3,
              transition: 'background-color 0.2s',
            }}
            title="Next banner"
          >
            <ChevronRight size={20} />
          </button>

          {/* Dots Indicator */}
          <div
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '24px',
              display: 'flex',
              gap: '6px',
              zIndex: 3,
            }}
          >
            {banners.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentIndex(idx)}
                style={{
                  width: idx === currentIndex ? '20px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: idx === currentIndex ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  padding: 0,
                }}
                title={`Go to slide ${idx + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
