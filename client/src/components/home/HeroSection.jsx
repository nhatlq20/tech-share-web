import React, { useState } from 'react';
import { Search, Sparkles, TrendingUp } from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { COLORS } from '../../constants/colors';

export const HeroSection = ({
  onSearch,
  initialQuery = '',
  popularSearches = STRINGS.home.hero.popularSearches,
}) => {
  const t = STRINGS.home.hero;
  const [searchTerm, setSearchTerm] = useState(initialQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSearch) {
      onSearch(searchTerm.trim());
    }
  };

  const handleTagClick = (tag) => {
    setSearchTerm(tag);
    if (onSearch) {
      onSearch(tag);
    }
  };

  return (
    <section className="relative w-full min-h-[360px] md:min-h-[390px] flex flex-col items-center justify-center text-center overflow-hidden px-4 py-10 sm:py-12 md:py-14 bg-gradient-to-br from-[#67BEC3] via-[#56B3B8] to-[#4CA6AC]">
      {/* ========================================================================
          A. BACKGROUND EFFECTS & PATTERNS (Soft UI Depth & Tech Texture)
          ======================================================================== */}
      
      {/* 1. Subtle Grid Pattern Overlay (Linear Gradient Grid with Radial Mask) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(255, 255, 255, 0.3) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '36px 36px',
          maskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.1) 95%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, rgba(0,0,0,1) 45%, rgba(0,0,0,0.1) 95%)',
        }}
        aria-hidden="true"
      />

      {/* 2. Subtle Micro Dot Grid Texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-10"
        style={{
          backgroundImage: 'radial-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
        aria-hidden="true"
      />

      {/* 3. Ambient Glow Light Blobs (Soft 3D Depth) */}
      <div
        className="absolute -top-24 -left-24 w-72 h-72 bg-white/20 rounded-full blur-3xl pointer-events-none animate-pulse"
        style={{ animationDuration: '7s' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -right-20 w-72 h-72 bg-[#286E74]/30 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[220px] bg-white/10 rounded-full blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      {/* ========================================================================
          B. CENTER CONTENT (Tightened Gaps & Centralized English Strings)
          ======================================================================== */}
      <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col items-center">
        {/* 1. Top Badge Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 border border-white/30 backdrop-blur-md text-white text-[11px] sm:text-xs font-semibold shadow-2xs mb-2.5 transition-transform hover:scale-105 select-none">
          <Sparkles size={12} className="text-amber-200 fill-amber-200" />
          <span>{t.badge}</span>
        </div>

        {/* 2. Main Title (H1) */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-sm mb-2 leading-tight">
          {t.title}
        </h1>

        {/* 3. Subtitle */}
        <p className="text-xs sm:text-sm md:text-base text-white/90 max-w-lg mx-auto mb-4 sm:mb-5 font-normal leading-relaxed drop-shadow-xs">
          {t.subtitle}
        </p>

        {/* ======================================================================
            C. SEARCH BAR (Floating Capsule)
            ====================================================================== */}
        <div className="w-full max-w-xl mx-auto mb-3.5 sm:mb-4">
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-full p-1.5 pl-4 sm:pl-5 shadow-xl border border-white/60 flex items-center gap-2.5 transition-all duration-200 focus-within:ring-4 focus-within:ring-white/40"
            role="search"
          >
            <Search size={18} color={COLORS.primary.DEFAULT} className="shrink-0" aria-hidden="true" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full bg-transparent text-slate-800 placeholder-slate-400 text-xs sm:text-sm font-medium outline-none border-none py-1"
              aria-label={t.searchBtn}
            />
            <button
              type="submit"
              className="px-5 sm:px-6 py-2 bg-brand-500 hover:bg-brand-600 active:scale-95 text-white text-xs sm:text-sm font-bold rounded-full transition-all duration-200 shadow-sm shrink-0 cursor-pointer"
              style={{ backgroundColor: COLORS.primary.DEFAULT }}
              aria-label={t.searchBtn}
            >
              {t.searchBtn}
            </button>
          </form>
        </div>

        {/* ======================================================================
            D. POPULAR / TRENDING SEARCHES
            ====================================================================== */}
        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 text-xs">
          <span className="text-white/85 font-medium mr-0.5 flex items-center gap-1">
            <TrendingUp size={12} className="text-white/80" />
            {t.popularSearchesLabel}
          </span>
          {popularSearches.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => handleTagClick(tag)}
              className="px-3 py-1 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 border border-white/30 backdrop-blur-xs text-white font-medium text-[11px] sm:text-xs transition-all duration-150 cursor-pointer shadow-2xs hover:border-white/50"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
