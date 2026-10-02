import { useState, useRef } from 'react';
import {
  Menu,
  Search,
  Heart,
  Bell,
  MessageCircle,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  Clock,
  User,
  Plus,
  Star,
  Smartphone,
  Laptop,
  Camera,
  Aperture,
  Headphones,
  Gamepad2,
  X,
} from 'lucide-react';
import './HomePage.css';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & MOCK DATA
// ─────────────────────────────────────────────────────────────────────────────

const PRIMARY = '#67BEC3';
const PRIMARY_DARK = '#4CA6AC';

const NAV_LINKS = ['Chợ Tốt', 'Xe cộ', 'Bất động sản', 'Việc làm'];

const REGIONS = ['Toàn quốc', 'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Cần Thơ', 'Hải Phòng', 'Bình Dương'];

const PRODUCTS = [
  {
    id: 1,
    title: 'iPhone 15 Pro Max 256GB - Titan Tự Nhiên, fullbox nguyên seal',
    price: '28.500.000 đ',
    image: 'https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=400&h=400&fit=crop',
    location: 'Quận 10, TP.HCM',
    postedAt: '21 phút trước',
    views: 142,
    isFeatured: true,
    sellerAvatar: 'https://i.pravatar.cc/40?img=1',
  },
  {
    id: 2,
    title: 'Honda SH 125i ABS 2023 - Còn bảo hành chính hãng',
    price: '68.000.000 đ',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&h=400&fit=crop',
    location: 'Cầu Giấy, Hà Nội',
    postedAt: '1 giờ trước',
    views: 89,
    isFeatured: true,
    sellerAvatar: 'https://i.pravatar.cc/40?img=2',
  },
  {
    id: 3,
    title: 'Máy lạnh Daikin 1.5HP Inverter - Mới 100%, chưa qua sử dụng',
    price: '9.800.000 đ',
    image: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=400&fit=crop',
    location: 'Bình Thạnh, TP.HCM',
    postedAt: '2 giờ trước',
    views: 67,
    isFeatured: false,
    sellerAvatar: 'https://i.pravatar.cc/40?img=3',
  },
  {
    id: 4,
    title: 'Bộ sofa góc L Da thật nhập khẩu Ý - Đen sang trọng',
    price: '45.000.000 đ',
    image: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400&h=400&fit=crop',
    location: 'Hoàng Mai, Hà Nội',
    postedAt: '3 giờ trước',
    views: 203,
    isFeatured: true,
    sellerAvatar: 'https://i.pravatar.cc/40?img=4',
  },
  {
    id: 5,
    title: 'MacBook Pro 16" M3 Max 48GB/1TB - Màu Đen Vũ Trụ',
    price: '89.000.000 đ',
    image: 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=400&fit=crop',
    location: 'Đống Đa, Hà Nội',
    postedAt: '5 phút trước',
    views: 518,
    isFeatured: true,
    sellerAvatar: 'https://i.pravatar.cc/40?img=5',
  },
  {
    id: 6,
    title: 'Golden Retriever 3 tháng tuổi - Đực, đã tiêm phòng đầy đủ',
    price: '12.000.000 đ',
    image: 'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop',
    location: 'Quận 7, TP.HCM',
    postedAt: '4 giờ trước',
    views: 394,
    isFeatured: false,
    sellerAvatar: 'https://i.pravatar.cc/40?img=6',
  },
  {
    id: 7,
    title: 'Tủ lạnh Samsung Bespoke 500L - Side by Side, mới 99%',
    price: '22.500.000 đ',
    image: 'https://images.unsplash.com/photo-1571175443880-49e1d25b2bc5?w=400&h=400&fit=crop',
    location: 'Tân Phú, TP.HCM',
    postedAt: '6 giờ trước',
    views: 77,
    isFeatured: false,
    sellerAvatar: 'https://i.pravatar.cc/40?img=7',
  },
  {
    id: 8,
    title: 'Xe đạp thể thao Giant ATX 2024 - Size M, màu Xanh Rêu',
    price: '6.500.000 đ',
    image: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?w=400&h=400&fit=crop',
    location: 'Thủ Đức, TP.HCM',
    postedAt: '8 giờ trước',
    views: 55,
    isFeatured: false,
    sellerAvatar: 'https://i.pravatar.cc/40?img=8',
  },
  {
    id: 9,
    title: 'DJI Mavic 3 Classic Combo - Bay được 46 phút, ảnh 4/3"',
    price: '32.000.000 đ',
    image: 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=400&h=400&fit=crop',
    location: 'Hoàn Kiếm, Hà Nội',
    postedAt: '12 giờ trước',
    views: 287,
    isFeatured: true,
    sellerAvatar: 'https://i.pravatar.cc/40?img=9',
  },
  {
    id: 10,
    title: 'Bộ phòng ngủ Master gỗ sồi Mỹ - Giường + 2 tab đầu giường',
    price: '38.000.000 đ',
    image: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=400&h=400&fit=crop',
    location: 'Long Biên, Hà Nội',
    postedAt: '1 ngày trước',
    views: 131,
    isFeatured: false,
    sellerAvatar: 'https://i.pravatar.cc/40?img=10',
  },
];

const TABS = ['Dành cho bạn', 'Mới nhất', 'Video'];

const TECH_CATEGORIES = [
  { id: 'smartphone', label: 'Smartphone', sub: 'iPhone, Samsung, Pixel', icon: Smartphone },
  { id: 'laptop', label: 'Laptop & Đồ họa', sub: 'MacBook, ThinkPad, Surface', icon: Laptop },
  { id: 'camera', label: 'Máy ảnh & Lens', sub: 'Sony, Canon, Fujifilm', icon: Camera },
  { id: 'drone', label: 'Drone & Gimbal', sub: 'DJI, Autel, Insta360', icon: Aperture },
  { id: 'audio', label: 'Audio & Mic', sub: 'Rode, Sennheiser, Sony', icon: Headphones },
  { id: 'gaming', label: 'Gaming & Phụ kiện', sub: 'PS5, Xbox, Gaming Gear', icon: Gamepad2 },
];

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 1 — TOP NAVIGATION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function Header() {
  const [notifCount] = useState(4);
  const [msgCount] = useState(7);
  const [sellerOpen, setSellerOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);

  return (
    <header className="top-header">
      <div className="header-inner">
        {/* Left cluster */}
        <button className="header-menu-btn" aria-label="Menu">
          <Menu size={20} />
        </button>

        {/* Logo */}
        <a href="#" className="header-logo-link">
          <img src="/assets/logo.svg" alt="TechShare Logo" className="header-logo-img" />
          <div className="header-logo-brand">
            <div className="header-brand-title">
              <span className="brand-tech">Tech</span>
              <span className="brand-share">Share</span>
            </div>
            <span className="header-brand-sub">
              Thuê thiết bị công nghệ dễ dàng
            </span>
          </div>
        </a>

        {/* Seller dropdown */}
        <div className="seller-dropdown-wrap">
          <button
            onMouseEnter={() => setSellerOpen(true)}
            onMouseLeave={() => setSellerOpen(false)}
            className="seller-dropdown-btn"
          >
            Dành cho người bán
            <ChevronDown
              size={14}
              style={{
                color: '#9ca3af',
                transform: sellerOpen ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </button>
          {sellerOpen && (
            <div
              onMouseEnter={() => setSellerOpen(true)}
              onMouseLeave={() => setSellerOpen(false)}
              className="seller-dropdown-menu"
            >
              {['Đăng tin bán hàng', 'Quản lý tin đăng', 'Gói tin nổi bật', 'Thống kê shop'].map((item) => (
                <a key={item} href="#" className="seller-menu-item">
                  <ChevronRight size={13} style={{ color: '#9ca3af' }} />
                  {item}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Center nav links */}
        <nav className="header-nav-center">
          {NAV_LINKS.map((link) => (
            <a key={link} href="#" className="header-nav-link">
              {link}
            </a>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="header-actions-right">
          <button className="header-icon-btn wishlist" title="Yêu thích">
            <Heart size={18} />
          </button>

          <button className="header-icon-btn" title="Thông báo">
            <Bell size={18} />
            {notifCount > 0 && <span className="header-badge">{notifCount}</span>}
          </button>

          <button className="header-icon-btn" title="Tin nhắn">
            <MessageCircle size={18} />
            {msgCount > 0 && <span className="header-badge">{msgCount}</span>}
          </button>

          <button className="header-btn-login">Đăng nhập</button>

          <button className="header-btn-post">
            <Plus size={14} strokeWidth={3} />
            Đăng tin
          </button>

          <div style={{ position: 'relative' }}>
            <button
              onMouseEnter={() => setUserOpen(true)}
              onMouseLeave={() => setUserOpen(false)}
              className="header-user-btn"
            >
              <User size={18} />
            </button>
            {userOpen && (
              <div
                onMouseEnter={() => setUserOpen(true)}
                onMouseLeave={() => setUserOpen(false)}
                className="seller-dropdown-menu"
                style={{ right: 0, left: 'auto', minWidth: '180px' }}
              >
                {['Tài khoản của tôi', 'Tin đăng của tôi', 'Tin nhắn', 'Đăng xuất'].map((item) => (
                  <a key={item} href="#" className="seller-menu-item">
                    {item}
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 2 — HERO BANNER & FLOATING SEARCH BAR
// ─────────────────────────────────────────────────────────────────────────────
function HeroSection() {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('Toàn quốc');
  const [regionOpen, setRegionOpen] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-pill-badge">
            <Star size={12} style={{ fill: 'currentColor' }} /> Nền tảng chia sẻ thiết bị công nghệ #1
          </span>
          <h1 className="hero-title">
            Giá tốt, gần bạn, <span style={{ color: '#fef08a' }}>chốt nhanh!</span>
          </h1>
          <p className="hero-subtitle">
            Hàng triệu tin đăng mua bán và cho thuê thiết bị công nghệ uy tín trên toàn quốc.
          </p>

          {/* Floating Sticker Badges */}
          <div className="floating-badge badge-left">
            <span>📷</span> Máy ảnh Sony A7 IV
          </div>
          <div className="floating-badge badge-right">
            <span>🎮</span> PS5 Slim 1TB
          </div>
        </div>
      </section>

      {/* Floating Search Bar */}
      <div className="hero-search-wrapper">
        <div className="hero-search-bar">
          <div className="search-input-field">
            <Search size={18} style={{ color: PRIMARY, flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm sản phẩm, xe cộ, thiết bị công nghệ..."
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ color: '#9ca3af', padding: '4px' }}>
                <X size={15} />
              </button>
            )}
          </div>

          <div className="search-divider" />

          <div className="search-location-box">
            <button
              type="button"
              onClick={() => setRegionOpen(!regionOpen)}
              className="search-location-btn"
            >
              <MapPin size={15} style={{ color: PRIMARY }} />
              <span>{region}</span>
              <ChevronDown
                size={13}
                style={{
                  color: '#9ca3af',
                  transform: regionOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s',
                }}
              />
            </button>
            {regionOpen && (
              <div className="search-location-menu">
                {REGIONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRegion(r);
                      setRegionOpen(false);
                    }}
                    className={`search-location-item ${region === r ? 'selected' : ''}`}
                  >
                    {region === r ? `✓ ${r}` : r}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button type="button" className="search-submit-btn">
            Tìm kiếm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 3 — CATEGORY HORIZONTAL SCROLL
// ─────────────────────────────────────────────────────────────────────────────
function CategoryBar() {
  const scrollRef = useRef(null);
  const [activeId, setActiveId] = useState(null);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir === 'left' ? -240 : 240, behavior: 'smooth' });
  };

  return (
    <div className="category-section">
      <div className="category-inner">
        <button
          onClick={() => scroll('left')}
          className="category-scroll-btn"
          aria-label="Cuộn trái"
        >
          <ChevronLeft size={16} />
        </button>

        <div ref={scrollRef} className="category-scroll-list">
          {TECH_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeId === cat.id;

            return (
              <button
                key={cat.id}
                onClick={() => setActiveId(isActive ? null : cat.id)}
                className={`category-item-btn ${isActive ? 'active' : ''}`}
              >
                <div className="category-icon-box">
                  <Icon size={24} strokeWidth={1.75} />
                </div>
                <span className="category-label">{cat.label}</span>
              </button>
            );
          })}
        </div>

        <button
          onClick={() => scroll('right')}
          className="category-scroll-btn"
          aria-label="Cuộn phải"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK 4 & 5 — TABS & PRODUCT GRID (5 COLUMNS) + SIDE BANNER
// ─────────────────────────────────────────────────────────────────────────────

function ProductCard({ product }) {
  const [favorited, setFavorited] = useState(false);

  return (
    <div className="product-card">
      <div className="product-thumb-container">
        <img
          src={product.image}
          alt={product.title}
          className="product-thumb-img"
          loading="lazy"
        />

        {product.isFeatured && (
          <span className="product-featured-badge">Tin tiêu biểu</span>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            setFavorited(!favorited);
          }}
          className={`product-wishlist-btn ${favorited ? 'active' : ''}`}
          aria-label="Lưu tin"
        >
          <Heart size={14} />
        </button>

        <div className="product-views-tag">
          <Eye size={10} />
          <span>{product.views}</span>
        </div>
      </div>

      <div className="product-card-body">
        <h3 className="product-card-title">{product.title}</h3>
        <p className="product-card-price">{product.price}</p>
        <div className="product-card-footer">
          <div className="product-seller-meta">
            <img src={product.sellerAvatar} alt="seller" className="product-seller-avatar" />
            <span>{product.location}</span>
          </div>
          <div className="product-location-time">
            <Clock size={9} style={{ color: '#9ca3af' }} />
            <span>{product.postedAt}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function SideAdBanner() {
  return (
    <div>
      <div className="side-ad-card">
        <span className="side-ad-tag">ỨNG DỤNG</span>
        <h4 className="side-ad-title">Tải App TechShare Nhận Ngay 50k</h4>
        <div className="side-ad-qr-box">
          <div className="side-ad-qr-inner">📲</div>
        </div>
        <p className="side-ad-subtext">Quét mã QR để tải</p>
        <div className="side-ad-buttons">
          <button className="side-ad-app-btn">
            <span>🍎</span> App Store
          </button>
          <button className="side-ad-app-btn">
            <span>▶</span> Google Play
          </button>
        </div>
      </div>

      <div className="side-ad-promo-box">
        <h5 className="promo-title">Bạn có thiết bị nhàn rỗi?</h5>
        <p className="promo-desc">Cho thuê kiếm thêm thu nhập đến 15tr/tháng an toàn và dễ dàng.</p>
        <button className="promo-btn">+ Đăng tin ngay</button>
      </div>
    </div>
  );
}

function ProductSection() {
  const [activeTab, setActiveTab] = useState(TABS[0]);

  return (
    <section className="product-section">
      <div className="product-container">
        {/* Tabs Bar */}
        <div className="tabs-row">
          <div className="tabs-group">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`tab-nav-btn ${activeTab === tab ? 'active' : ''}`}
              >
                {tab}
              </button>
            ))}
          </div>
          <span className="tab-meta-count">
            Hiển thị <strong>{PRODUCTS.length}</strong> tin đăng
          </span>
        </div>

        {/* Layout: Grid 5 Columns + Side Banner */}
        <div className="product-layout">
          <div className="product-grid-wrap">
            <div className="product-grid">
              {PRODUCTS.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>

            <div className="load-more-wrap">
              <button className="load-more-btn">
                Xem thêm sản phẩm
              </button>
            </div>
          </div>

          <div className="side-banner-column">
            <div className="side-banner-sticky">
              <SideAdBanner />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export function HomePage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      {/* Block 1 – Top Navigation Header */}
      <Header />

      {/* Block 2 – Hero Banner & Floating Search Bar */}
      <HeroSection />

      {/* Block 3 – Category Horizontal Scroll */}
      <CategoryBar />

      {/* Blocks 4 & 5 – Tabs + 5-Col Product Grid + Side Banner */}
      <ProductSection />
    </div>
  );
}

export default HomePage;
