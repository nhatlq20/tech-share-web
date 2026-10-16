import React, { useState } from 'react';
import { Search, Sparkles, ShieldCheck, Truck, MapPin, ArrowUpRight, CornerDownLeft } from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import './HeroSection.css';

export const HeroSection = ({ onSearch, initialQuery = '', popularSearches = STRINGS.home.hero.popularSearches }) => {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const submit = event => { event.preventDefault(); onSearch?.(searchTerm.trim()); };
  return (
    <section className="tech-hero" aria-labelledby="hero-title">
      <div className="tech-hero-inner">
        <div className="tech-hero-copy">
          <span className="tech-hero-badge"><Sparkles size={16} /> #1 Tech Device Sharing Platform</span>
          <h1 id="hero-title">Rent the Right Tech<br /><span>for Every Need</span></h1>
          <p className="tech-hero-description">Find the perfect tech device for your lifestyle. High-quality gadgets, flexible rentals, and nearby availability.</p>
          <form className="tech-hero-search" role="search" onSubmit={submit}>
            <Search size={21} aria-hidden="true" />
            <input aria-label={STRINGS.home.hero.searchBtn} value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder={STRINGS.home.hero.searchPlaceholder} />
            <button type="submit">Search <ArrowUpRight size={16} /></button>
          </form>
          <div className="tech-hero-popular"><span>Popular searches:</span>{popularSearches.slice(0, 4).map(tag => (
            <button type="button" key={tag} onClick={() => { setSearchTerm(tag); onSearch?.(tag); }}>{tag}</button>
          ))}</div>
          <div className="tech-hero-benefits">
            <div><i><ShieldCheck size={23} /></i><span><strong>Verified Devices</strong><small>Quality assured listings</small></span></div>
            <div><i><Truck size={23} /></i><span><strong>Flexible Rentals</strong><small>Daily, weekly or monthly</small></span></div>
            <div><i><MapPin size={23} /></i><span><strong>Find Nearby</strong><small>Pick up around you</small></span></div>
          </div>
        </div>
        <div className="tech-hero-art">
          <img src="/assets/techshare-hero-cutout.png" alt="Laptop, smartphone, camera, drone and headphones on mint display stands" fetchPriority="high" />
          <span className="tech-hero-note">Great Tech<br />Better Experiences<CornerDownLeft size={30} strokeWidth={1.4} aria-hidden="true" /></span>
        </div>
      </div>
    </section>
  );
};
export default HeroSection;
