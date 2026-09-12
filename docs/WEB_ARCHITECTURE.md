# 🏗️ TÀI LIỆU KIẾN TRÚC HỆ THỐNG TECHSHARE WEB (WEB ARCHITECTURE SPECIFICATION)
> **Dự án**: Nền tảng Chia sẻ/Cho thuê Thiết bị Công nghệ & Trợ lý Trí tuệ Nhân tạo Google Gemini (TechShare Web)  
> **Kiến trúc**: Monorepo Fullstack MERN (MongoDB Atlas, Express.js, React.js 18+ Vite, Node.js) + Socket.io + Google Gemini AI  
> **Nhóm thực hiện**: An, Cường, Hạo, Kiên, Nhật (Lead)  

---

## 1. TỔNG QUAN HỆ THỐNG & KIẾN TRÚC TỔNG THỂ

TechShare Web được thiết kế theo mô hình **Client-Server kiến trúc 3 tầng (3-Tier Architecture)** kết hợp kênh giao tiếp 2 chiều **WebSockets (Socket.io)** và tích hợp Trợ lý Trí tuệ Nhân tạo **Google Gemini 1.5 Flash**:

```mermaid
flowchart TD
    subgraph Browser["Web Client (React 18+ / Vite / TypeScript)"]
        UI["UI Layer: Tailwind CSS + Lucide Icons"]
        Router["Routing Layer: React Router v6 (4 Master Layouts)"]
        State["State Layer: Redux Toolkit / React Query / LocalStorage"]
        Network["Network Layer: Axios Client (JWT Interceptor) + Socket.io Client"]
        Hardware["Web APIs: Web Geolocation, Webcam (HTML5 Camera), Canvas"]
    end

    subgraph Server["Backend Server (Node.js + Express.js)"]
        Mid["Middlewares: CORS, Helmet, JWT Auth, Multer, RateLimiter"]
        Routers["Express REST API Routers (/api/auth, /api/devices, /api/bookings,...)"]
        Sockets["Socket.io Server (Rooms: User, Booking Chat)"]
        Gemini["Gemini AI Service (@google/generative-ai)"]
    end

    subgraph Data["Persistence Layer"]
        Atlas[("MongoDB Atlas Cloud\nGeoJSON 2dsphere, Users, Devices, Bookings, Reviews, Chats")]
        Media[("Cloudinary / Local Storage\nDevice Photos, Handover Photos, eKYC")]
    end

    Browser <-->|HTTP RESTful JSON / HTTPS| Server
    Browser <-->|WebSockets (ws:// / wss://)| Sockets
    Server --> Atlas
    Server --> Media
    Server --> Gemini
```

---

## 2. BẢNG CÔNG NGHỆ & LÝ DO LỰA CHỌN (TECH STACK MATRIX)

| Thành phần | Công nghệ lựa chọn | Phiên bản | Lý do & Ưu thế vượt trội |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React.js (Vite + TypeScript)** | React 18+ / Vite 5+ | Tốc độ Hot Module Replacement (<50ms), Bundle size siêu nhỏ, kiểm soát kiểu tĩnh an toàn. |
| **Styling & UI Kit** | **Tailwind CSS + Lucide Icons** | Tailwind v3+ | Utility-first styling cực kỳ linh hoạt, tối ưu hóa CSS khi build, hỗ trợ Responsive & Dark Mode dễ dàng. |
| **Bản đồ Web** | **Leaflet + OpenStreetMap (`react-leaflet`)** | Leaflet 1.9+ | Bản đồ mã nguồn mở miễn phí 100%, không yêu cầu thẻ tín dụng, tương thích chuẩn GeoJSON của MongoDB. |
| **Quét & Tạo mã QR** | **`qrcode.react` & `html5-qrcode`** | Latest | Tạo QR đơn hàng nhanh chóng; quét trực tiếp qua Webcam máy tính hoặc camera điện thoại. |
| **Chữ ký số điện tử** | **`react-signature-canvas`** | Latest | Khách và chủ máy có thể ký xác nhận trực tiếp bằng chuột hoặc màn cảm ứng khi bàn giao. |
| **Biểu đồ thống kê** | **Recharts** | Recharts 2+ | Biểu đồ React Native SVG mượt mà, dễ cấu hình cho Owner Dashboard và Admin Analytics. |
| **Quản trị State** | **Redux Toolkit & LocalStorage** | RTK 2+ | Quản lý phiên đăng nhập, giỏ hàng, bộ lọc tìm kiếm và cache dữ liệu ngoại tuyến tức thì. |
| **Backend Framework** | **Node.js + Express.js** | Node 20 LTS, Express 4+ | Hệ sinh thái phong phú, xử lý I/O phi đồng bộ hiệu năng cao, viết chung ngôn ngữ JavaScript/TypeScript. |
| **Cơ sở dữ liệu** | **MongoDB Atlas + Mongoose** | Mongo 7+, Mongoose 8+ | NoSQL Schema linh hoạt, chỉ mục địa lý `2dsphere` phục vụ truy vấn `$nearSphere` theo bán kính. |
| **Realtime Engine** | **Socket.io** | Socket.io 4+ | Kênh giao tiếp 2 chiều độ trễ cực thấp cho Chat 1-1 và chuông thông báo đẩy thời gian thực. |
| **Trí tuệ nhân tạo** | **Google Gemini 1.5 Flash** | `@google/generative-ai` | Mô hình LLM thế hệ mới của Google với tốc độ suy luận nhanh (<2s), chi phí tối ưu, phân tích review và so sánh máy cực tốt. |

---

## 3. KIẾN TRÚC FRONTEND CLIENT (REACTJS)

### 3.1. Hệ thống 4 Master Layouts
Cấu hình React Router v6 với cấu trúc lồng nhau (Nested Routes qua `<Outlet />`):

1. **`PublicLayout`**: Dành cho khách vãng lai và duyệt sản phẩm công khai.
   - Header cố định (Sticky Topbar) với Logo, Thanh tìm kiếm Debounce, Menu 6 danh mục, Nút Yêu thích, Chuông thông báo, Dropdown tài khoản và Chuyển chế độ Dark/Light.
   - Nội dung chính (`Outlet`).
   - Footer đầy đủ liên kết chính sách bảo hiểm, điều khoản thuê, thông tin bản quyền TechShare.
2. **`AuthLayout`**: Dành cho trang Đăng nhập (`/login`) và Đăng ký (`/register`).
   - Giao diện chia đôi màn hình (Split-screen) hiện đại: Một bên là hình ảnh thiết bị công nghệ cao cấp, một bên là Form nhập liệu.
3. **`DashboardLayout`**: Dành cho Quản lý cá nhân của Renter và Owner (`/dashboard/*`).
   - Sidebar bên trái có thể thu gọn (Collapsible), danh mục điều hướng theo vai trò (Đơn thuê của tôi, Thiết bị của tôi, Lịch bận, Ví ký quỹ, Phân tích doanh thu).
   - Topbar hiển thị tên người dùng, điểm tín nhiệm Trust Score và số dư ví.
4. **`AdminLayout`**: Dành riêng cho Quản trị viên sàn (`/admin/*`).
   - Sidebar quản trị: Báo cáo phân tích toàn sàn, Kiểm duyệt bài đăng, Xử lý tranh chấp cọc (Dispute Resolver), Duyệt hồ sơ eKYC.

---

## 4. GIAO THỨC THỜI GIAN THỰC (SOCKET.IO PROTOCOL SPECIFICATION)

### 4.1. Danh sách Rooms
- `user_<userId>`: Phòng riêng của từng người dùng để nhận thông báo đẩy tức thì (đơn được duyệt, có đánh giá mới, nhắc hạn trả máy).
- `booking_<bookingId>`: Phòng chat trực tiếp giữa Renter và Owner gắn liền với mã đơn thuê cụ thể.

### 4.2. Danh mục Sự kiện Realtime (Socket Events)

| Sự kiện (Event) | Hướng | Dữ liệu truyền (Payload) | Mô tả |
| :--- | :---: | :--- | :--- |
| `join_user_room` | Client ➔ Server | `{ userId }` | Người dùng kết nối và tham gia phòng thông báo cá nhân. |
| `join_booking_chat` | Client ➔ Server | `{ bookingId, userId }` | Tham gia phòng chat của đơn thuê cụ thể. |
| `send_message` | Client ➔ Server | `{ bookingId, receiverId, content, messageType }` | Gửi tin nhắn mới trong phòng chat. |
| `receive_message` | Server ➔ Client | `{ _id, bookingId, sender, content, messageType, createdAt }` | Phát tin nhắn tức thì tới người nhận trong phòng. |
| `push_notification` | Server ➔ Client | `{ _id, title, body, type, data, createdAt }` | Đẩy thông báo chuông và tăng chấm đỏ badge unread. |
| `order_status_updated` | Server ➔ Client | `{ bookingId, newStatus, timelineStep }` | Cập nhật tiến trình đơn hàng trên giao diện mà không cần reload. |

---

## 5. TÍCH HỢP TRỢ LÝ TRÍ TUỆ NHÂN TẠO GOOGLE GEMINI AI

Sử dụng SDK chính thức `@google/generative-ai` với model `gemini-1.5-flash`:

```javascript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 1. Phân tích tóm tắt Review thiết bị thành 3 khối: Pros, Cons, BestFor
export const summarizeDeviceReviews = async (deviceTitle, specs, reviewsText) => {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const prompt = `Bạn là chuyên gia công nghệ của nền tảng TechShare. Hãy phân tích thiết bị: "${deviceTitle}".
Thông số kỹ thuật: ${JSON.stringify(specs)}.
Đánh giá thực tế từ người dùng: "${reviewsText}".
Trả về duy nhất định dạng JSON thuần (không markdown) với cấu trúc sau:
{
  "summary": "Tóm tắt ngắn gọn 2 câu về thiết bị",
  "pros": ["Điểm mạnh 1", "Điểm mạnh 2", "Điểm mạnh 3"],
  "cons": ["Hạn chế 1", "Hạn chế 2"],
  "rentalRecommendation": "Lời khuyên máy này phù hợp nhất cho ai và mục đích gì"
}`;

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
};
```

---

## 6. CƠ CHẾ BẢO MẬT & PHÂN QUYỀN (SECURITY & RBAC)

1. **Mã hóa mật khẩu**: Sử dụng `bcryptjs` với 10 vòng muối (salt rounds).
2. **Cấp phát & Xác thực JWT**:
   - Access Token có thời hạn 30 ngày, payload chứa `{ id: user._id, role: user.role }`.
   - Middleware `protect`: Bắt buộc token hợp lệ trong header `Authorization: Bearer <token>`.
   - Middleware `authorize('admin')`: Chặn các request không có quyền Admin truy cập các route quản trị sàn.
3. **CORS & Bảo vệ chống tấn công**:
   - Cấu hình `cors({ origin: process.env.CLIENT_URL, credentials: true })`.
   - Cấu hình `helmet()` bảo vệ HTTP headers.
   - Cấu hình `express-rate-limit` ngăn ngừa tấn công brute force hoặc spam request vào endpoint đăng nhập/đăng ký.
