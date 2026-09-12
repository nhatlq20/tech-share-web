# 🌐 TECHSHARE WEB - HỆ THỐNG THIẾT KẾ & TÀI LIỆU KIẾN TRÚC PHIÊN BẢN WEB
> **Nền tảng Chia sẻ/Cho thuê Thiết bị Công nghệ & Trợ lý Trí tuệ Nhân tạo Google Gemini**  
> **Kiến trúc Công nghệ**: Fullstack MERN (MongoDB Atlas, Express.js, React.js 18+ Vite, Node.js) + Socket.io + Google Gemini AI  
> **Quy mô dự án**: 5 Thành viên (**An, Cường, Hạo, Kiên, Nhật - Lead**) | 9 Phân hệ | 40 GitHub Issues | 4 Milestones Sprint  

---

## 📑 MỤC LỤC BỘ TÀI LIỆU THIẾT KẾ HỆ THỐNG (DOCS DIRECTORY)

Toàn bộ tài liệu phân tích, đặc tả nghiệp vụ, thiết kế cơ sở dữ liệu và kế hoạch phân công đã được thiết kế lại hoàn chỉnh cho phiên bản Web trong thư mục [`docs/`](./docs/):

| STT | Tài liệu | Mô tả chi tiết | Đường dẫn |
| :---: | :--- | :--- | :--- |
| **01** | **WEB_ARCHITECTURE.md** | **Tài liệu Kiến trúc Tổng thể**: Sơ đồ 3 tầng, Tech Stack Matrix, 4 Master Layouts (Public, Dashboard, Admin, Auth), Giao thức Socket.io Events, tích hợp Google Gemini AI và RBAC Security. | 📖 [`docs/WEB_ARCHITECTURE.md`](./docs/WEB_ARCHITECTURE.md) |
| **02** | **FEATURES.md** | **Danh mục 9 Phân hệ Tính năng Web**: Khám phá Catalog, Live Search Debounce 400ms, Bản đồ Leaflet OpenStreetMap, Đặt thuê DateRangePicker, Quản lý kho máy kéo thả ảnh, Trợ lý Gemini AI, Chat Socket.io, eKYC & Ví Escrow. | 📖 [`docs/FEATURES.md`](./docs/FEATURES.md) |
| **03** | **DATABASE_DESIGN.md** | **Thiết kế CSDL MongoDB Atlas**: Đặc tả 6 Schemas (`User`, `Device`, `Booking`, `Review`, `Notification`, `ChatMessage`), chỉ mục địa lý `2dsphere` cho truy vấn `$nearSphere`, giải thuật chống trùng lịch thuê và chữ ký số. | 🗄️ [`docs/DATABASE_DESIGN.md`](./docs/DATABASE_DESIGN.md) |
| **04** | **MEMBER_ASSIGNMENTS.md** | **Bảng Phân công 5 Thành viên**: 40 tính năng Web chi tiết chia đều cho An, Cường, Hạo, Kiên, Nhật (Lead), ma trận phụ thuộc dữ liệu và lộ trình triển khai 4 Sprint. | 👥 [`docs/MEMBER_ASSIGNMENTS.md`](./docs/MEMBER_ASSIGNMENTS.md) |
| **05** | **ISSUES.md** | **Danh sách 40 GitHub Issues**: 40 bài toán kỹ thuật chuẩn mực kèm Objective, Scope of Work, Backend APIs, DB Models và Acceptance Criteria chi tiết cho từng màn hình Web. | 📋 [`docs/ISSUES.md`](./docs/ISSUES.md) |

---

## 🛠️ MA TRẬN CHUYỂN ĐỔI: TỪ MOBILE APP SANG WEB MERN

| Thành phần | Phiên bản Mobile (Tài liệu cũ) | Phiên bản Web (Thiết kế lại chuẩn MERN) |
| :--- | :--- | :--- |
| **Frontend Framework** | React Native (Expo SDK 57) | **React.js 18+ (Vite + TypeScript)** |
| **Hệ thống Routing** | React Navigation (Stack, Drawer, Tabs) | **React Router v6 với 4 Master Layouts** (`PublicLayout`, `DashboardLayout`, `AdminLayout`, `AuthLayout`) |
| **Bản đồ Địa lý** | `react-native-maps` + `expo-location` | **`react-leaflet` (OpenStreetMap) + Web Geolocation API** (Hoàn toàn miễn phí, chuẩn GeoJSON) |
| **Tải ảnh & Album** | `expo-image-picker` | **HTML5 Drag-and-Drop Uploader (`react-dropzone`)** |
| **Bàn giao qua QR** | `expo-barcode-scanner` | **`qrcode.react` (Tạo mã) & `html5-qrcode` (Quét qua Webcam/Camera)** |
| **Hợp đồng & Ký số** | Chụp ảnh camera | **Hợp đồng điện tử ký số chuột/cảm ứng (`react-signature-canvas`)** |
| **Giao tiếp Realtime** | Push Notification cục bộ, Polling | **Socket.io-client + Socket.io Server** (Chat 1-1 & Chuông thông báo tức thì) |
| **Trí tuệ nhân tạo** | Mobile API wrapper | **Google Gemini 1.5 Flash SDK** (`@google/generative-ai`: Tóm tắt review, So sánh đối đầu 2 máy, Chatbot tư vấn) |
| **Bộ nhớ đệm** | `AsyncStorage` | **`localStorage` + Redux Toolkit / React Query Cache** |
| **Dashboard & Báo cáo**| Giao diện di động thu nhỏ | **Desktop Portals chuyên biệt**: Bảng điều khiển tài chính Recharts cho Chủ máy và Cổng Quản trị Admin Toàn sàn |

---

## 📊 SƠ ĐỒ KIẾN TRÚC HỆ THỐNG WEB TỔNG THỂ

```mermaid
flowchart TD
    subgraph Client["Web Client (React 18+ / Vite / TypeScript / Tailwind CSS)"]
        UI_Guest["Public Pages: Home, Catalog, Live Search, Map, Device Detail"]
        UI_Renter["Renter Portal: Booking Drawer, Order Timeline, QR Handover, Wishlist"]
        UI_Owner["Owner Dashboard: Post Device, Fleet Management, Calendar, Analytics"]
        UI_Admin["Admin Hub: Governance, Dispute Resolver, eKYC Verification"]
        UI_AI["AI Tech Hub: Review Summarizer, Comparator, Smart Chat Consultant"]
        State["State Management: Redux Toolkit & LocalStorage"]
        SocketClient["Socket.io Client (Real-time Chat & Notifications)"]
    end

    subgraph Server["Backend API (Node.js + Express.js)"]
        AuthMid["JWT Auth Middleware & Role Guard (Renter/Owner/Admin)"]
        Routers["RESTful Routers: Auth, Devices, Bookings, Reviews, AI, Admin, Notifications"]
        SocketServer["Socket.io Server (Rooms: user_<id>, booking_<id>)"]
        GeminiService["Google Gemini 1.5 Flash AI Engine"]
    end

    subgraph Database["Cloud Persistence Layer"]
        MongoDB[("MongoDB Atlas Database\n(Users, Devices, Bookings, Reviews, Notifications, ChatMessages)")]
        GeoIndex[("Chỉ mục Địa lý 2dsphere\n($nearSphere Geospatial Query)")]
    end

    Client <-->|RESTful JSON API (Axios + JWT)| Server
    SocketClient <-->|WebSockets (ws://)| SocketServer
    Server --> MongoDB
    MongoDB --- GeoIndex
    Server --> GeminiService
```

---

## 👥 PHÂN BỔ 40 TÍNH NĂNG CHO 5 THÀNH VIÊN TRÊN WEB

- **An (Web Architect & Security Engineer)**: Routing, 4 Master Layouts, Đăng ký, Đăng nhập JWT, Hồ sơ cá nhân, Landing Hero, Bảo mật Session, eKYC Web (CCCD + Webcam Selfie), Thẻ điểm tín nhiệm Trust Score.
- **Cường (Frontend Engineer - Catalog & Web Maps)**: Trang chủ 6 danh mục, Lưới thiết bị thông minh, Chi tiết thiết bị Lightbox/Specs, Live Search Debounce 400ms, Bộ lọc Sidebar đa tiêu chí, Bản đồ Leaflet GPS, Custom Marker Popover, Gom cụm Marker Cluster.
- **Hạo (Frontend Engineer - Booking & Checkout)**: Đặt thuê DateRangePicker, Bảng tính chi phí & Voucher, Quản lý đơn của tôi 5 tab, Chi tiết đơn & Timeline tiến độ, Đếm ngược thời gian thuê, Mã QR bàn giao `qrcode.react`, Wishlist LocalStorage, Offline Banner.
- **Kiên (Fullstack & AI Engineer)**: Form đăng tin cho thuê (Specs Builder), Kéo thả tải ảnh Drag & Drop, Quản lý kho máy của tôi, Lịch bận cá nhân chủ máy, Báo cáo doanh thu Recharts, Gemini AI Review Summarizer, Gemini AI So sánh 2 máy, Gemini AI Chatbot tư vấn thuê.
- **Nhật (Lead - Operations, Realtime & Admin)**: Chủ máy duyệt/từ chối đơn, Quét QR qua Webcam `html5-qrcode`, Khiếu nại hư hỏng & trừ cọc, Đánh giá 2 chiều 1-5 sao ảnh thật, Socket.io Realtime Chat 1-1, Chuông thông báo thời gian thực, Ví ký quỹ Escrow Mock, Cổng Quản trị Admin Portal.

---

## 📅 LỘ TRÌNH 4 SPRINT TRIỂN KHAI

- **Sprint 0: Nền tảng & Cấu trúc Web (P0)**: Setup Vite React TS, Tailwind CSS, Express Server, Mongoose Models, 4 Master Layouts, Socket.io baseline.
- **Sprint 1: Khám phá, Tìm kiếm & Đăng tin Kéo thả (P0 + P1)**: Auth JWT, Trang chủ 6 danh mục, Live Search Debounce, Bản đồ Leaflet GPS, Form đăng tin kéo thả ảnh.
- **Sprint 2: Vòng đời Đơn thuê, Bàn giao QR & Trợ lý Gemini AI (P0 + P1)**: Đặt thuê DateRangePicker, Xử lý duyệt đơn, Quét QR Webcam, Gemini AI Summarizer & Comparator, Đánh giá 2 chiều.
- **Sprint 3: Realtime, Phân tích Doanh thu & Cổng Admin (P1 + P2)**: Socket.io Chat 1-1, Chuông thông báo realtime, Biểu đồ doanh thu Recharts, eKYC, Admin Portal đối soát giải quyết tranh chấp cọc.
