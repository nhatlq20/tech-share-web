# 🌐 TECHSHARE WEB - DANH MỤC TOÀN DIỆN CÁC TÍNH NĂNG HỆ THỐNG
> **Nền tảng Chia sẻ/Cho thuê Thiết bị Công nghệ & Trợ lý Trí tuệ Nhân tạo Google Gemini (Phiên bản Web)**  
> **Kiến trúc**: Fullstack MERN (MongoDB Atlas, Express.js, React.js 18+ Vite, Node.js) + Socket.io + Google Gemini AI  
> **Quy mô nhóm**: 5 Thành viên (An, Cường, Hạo, Kiên, Nhật - Lead)  

---

## 📑 MỤC LỤC PHÂN HỆ TÍNH NĂNG WEB

| STT | Phân hệ (Module) | Nhóm người dùng | Điểm nhấn công nghệ Web cốt lõi |
| :---: | :--- | :--- | :--- |
| **01** | [Khách vãng lai & Khám phá](#1-phân-hệ-1-khách-vãng-lai--khám-phá-nền-tảng-guest--discovery) | Guest / Người dùng mới | Responsive Landing Hero, Live Search Debounce 400ms, Bản đồ Web Leaflet/OpenStreetMap, JWT Auth |
| **02** | [Người thuê thiết bị (Renter)](#2-phân-hệ-2-người-thuê-thiết-bị-renter---booking--experience) | Renter (Creator, Studio, Dev) | Date Range Picker, Bảng tính chi phí động, Mã QR bàn giao `qrcode.react`, Chụp ảnh biên bản Webcam, Hủy & Gia hạn |
| **03** | [Chủ sở hữu thiết bị (Owner)](#3-phân-hệ-3-chủ-sở-hữu-thiết-bị-owner---monetization--fleet-management) | Owner (Chủ máy, Studio) | Kéo thả tải ảnh Drag & Drop, Gắn tọa độ bản đồ, Lịch bận cá nhân, Biểu đồ doanh thu Recharts, Khiếu nại hư hỏng |
| **04** | [Trí tuệ nhân tạo Gemini AI](#4-phân-hệ-4-trợ-lý-trí-tuệ-nhân-tạo-google-gemini-ai-ai-tech-hub) | Toàn bộ người dùng | Google Gemini 1.5 Flash SDK, Tóm tắt Review (Pros/Cons/BestFor), Bảng so sánh đối đầu 2 máy, Chatbot tư vấn thuê thông minh |
| **05** | [Giao tiếp thời gian thực](#5-phân-hệ-5-giao-tiếp-thời-gian-thực--chăm-sóc-khách-hàng-communication) | Renter ⇋ Owner | In-App Real-time Chat qua Socket.io, Gửi ảnh & Vị trí, Quick message templates, Chuông thông báo Realtime |
| **06** | [Bảo mật, Định danh & eKYC](#6-phân-hệ-6-bảo-mật-định-danh--tín-nhiệm-trust-security--ekyc) | Toàn hệ thống | eKYC tải 2 mặt CCCD và chụp chân dung qua Webcam, Tích xanh `isVerified`, Điểm tín nhiệm Trust Score, Hợp đồng ký số Canvas |
| **07** | [Ví nội bộ, Voucher & Loyalty](#7-phân-hệ-7-ví-nội-bộ-khuyến-mãi--gamification-finance--loyalty) | Renter & Owner | Ví ký quỹ Escrow Mock, Quản lý Voucher khuyến mãi, Mã giới thiệu Referral, Huy hiệu thành viên |
| **08** | [Kỹ thuật Web & Hiệu năng](#8-phân-hệ-8-nền-tảng-kỹ-thuật-web--tối-ưu-hiệu-năng-performance--pwa) | Hệ thống Web Client | Responsive đa thiết bị (Desktop/Tablet/Mobile), Lưu đệm LocalStorage, Skeleton Loading, Code Splitting, Dark Mode |
| **09** | [Quản trị hệ thống (Admin Hub)](#9-phân-hệ-9-quản-trị-viên-hệ-thống-admin--platform-governance) | Quản trị viên (Admin) | Desktop Admin Portal, Thống kê số liệu toàn sàn, Kiểm duyệt bài đăng, Đối soát ảnh 2 bên xử lý tranh chấp cọc, Duyệt eKYC |

---

## 1. PHÂN HỆ 1: KHÁCH VÃNG LAI & KHÁM PHÁ NỀN TẢNG (GUEST & DISCOVERY)
*Dành cho người dùng truy cập website chưa đăng nhập:*

### 1.1. Khám phá Danh mục Thiết bị (Catalog Explorer)
- **Giao diện Landing Page hiện đại**: Hero banner quảng bá tính năng nổi bật, cam kết chất lượng máy, số lượng giao dịch thành công.
- **Lướt 6 danh mục chuẩn dạng lưới & thẻ icon**: Smartphone, Laptop, Camera & Lens, Drone & Gimbal, Audio (Loa/Tai nghe), Gaming & Phụ kiện.
- **Danh sách nổi bật (Featured / Hot Devices)**: Các dòng máy cao cấp được thuê nhiều nhất trên nền tảng với nhãn "HOT".
- **Danh sách máy mới đăng (Newly Listed)**: Cập nhật liên tục từ các chủ máy xung quanh.
- **Carousel Banner Khuyến mãi**: Hiển thị các gói giảm giá cuối tuần và chương trình ưu đãi máy mới.

### 1.2. Tìm kiếm & Bộ lọc Nâng cao (Live Search & Multi-criteria Filter)
- **Tìm kiếm tức thì (Live Search Debounce 400ms)**: Tìm nhanh theo tên máy, thương hiệu, từ khóa thông số mà không cần tải lại trang.
- **Gợi ý tìm kiếm & Từ khóa thịnh hành**: Dropdown hiển thị các từ khóa hot ("Sony FX3", "MacBook M3 Max", "DJI Mini 4 Pro") và lịch sử tìm kiếm gần nhất.
- **Bộ lọc Sidebar đa tiêu chí**:
  - **Khoảng giá thuê/ngày**: Thanh kéo Dual Slider chọn chính xác mức giá từ 50.000đ đến 5.000.000đ/ngày.
  - **Thương hiệu**: Apple, Sony, Canon, DJI, Dell, Asus, Fujifilm, Samsung, Rode...
  - **Bán kính GPS**: Tìm máy trong phạm vi 2km, 5km, 10km, 20km quanh vị trí thực tế của người dùng.
  - **Sắp xếp đa chiều**: Giá tăng/giảm, đánh giá sao cao nhất, khoảng cách gần nhất, lượt thuê nhiều nhất.

### 1.3. Chi tiết Thiết bị Toàn diện (Device Transparency Detail Page)
- **Thư viện ảnh sản phẩm (Image Gallery & Lightbox)**: Thẻ ảnh lớn kèm các ảnh thumbnail xem trước, nhấp chuột để mở modal phóng to ảnh độ phân giải cao.
- **Bảng thông số kỹ thuật động (Dynamic Specs Sheet)**: Hiển thị CPU, RAM, Cảm biến, Độ phân giải, Pin, Phụ kiện đi kèm dưới dạng bảng so sánh rõ ràng.
- **Chính sách cọc & Giấy tờ minh bạch**: Công khai giá trị cọc bảo đảm, yêu cầu CCCD hoặc giữ lại giấy tờ tùy thân.
- **Hồ sơ Chủ sở hữu (Owner Profile Card)**: Avatar, Tên, Huy hiệu uy tín (`isVerified`), Điểm rating trung bình, Tỷ lệ phản hồi tin nhắn.
- **Đánh giá cộng đồng**: Danh sách nhận xét, chấm điểm 1 - 5 sao và hình ảnh chụp thật từ khách thuê trước.

### 1.4. Bản đồ Không gian Địa lý Web (Interactive Geospatial Map)
- Tích hợp thư viện bản đồ mã nguồn mở **`react-leaflet`** (OpenStreetMap) tương thích hoàn hảo chuẩn GeoJSON `2dsphere` của MongoDB.
- Tự động lấy vị trí hiện tại của trình duyệt qua **Web Geolocation API**.
- Các **Ghim bản đồ tùy biến (Custom Category Markers)** tương ứng với từng dòng sản phẩm.
- Nhấp vào Marker mở **Popup Card tóm tắt**: Tên máy, ảnh thumbnail, giá thuê/ngày, khoảng cách (km) và nút "Xem chi tiết & Thuê".
- **Gom cụm Marker (Marker Clustering)**: Tự động gom nhóm các ghim gần nhau thành vòng tròn số lượng khi zoom out bản đồ.

### 1.5. Trải nghiệm Trợ lý Gemini AI Dùng thử
- Cho phép khách vãng lai dùng thử tính năng **AI Tóm tắt Review** (Ưu điểm, Nhược điểm, Lời khuyên mục đích thuê) ngay trên trang chi tiết máy.
- Dùng thử tính năng **So sánh 2 thiết bị công nghệ** đối đầu mà không bắt buộc đăng nhập.

### 1.6. Xác thực & Đăng nhập Người dùng (Authentication & Session)
- **Đăng ký tài khoản**: Họ tên, Email, Mật khẩu, Số điện thoại, Địa chỉ giao hàng mặc định; tự động gán role kép `both` (vừa có thể thuê, vừa có thể cho thuê).
- **Đăng nhập bảo mật**: Xác thực mật khẩu với `bcryptjs`, cấp phát JWT Token (hạn 30 ngày), lưu trữ an toàn trong `localStorage` hoặc `httpOnly cookie`.
- **Ghi nhớ đăng nhập (Remember Me)**: Tự động khôi phục phiên đăng nhập khi mở lại trình duyệt.
- **Axios Interceptor**: Tự động đính kèm `Authorization: Bearer <token>` cho mọi HTTP request yêu cầu bảo mật.

---

## 2. PHÂN HỆ 2: NGƯỜI THUÊ THIẾT BỊ (RENTER - BOOKING & EXPERIENCE)
*Dành cho Reviewer, Creator, Nhiếp ảnh gia, Sinh viên cần máy phục vụ công việc và dự án ngắn hạn:*

### 2.1. Yêu thích & Bộ sưu tập Cá nhân (Wishlist & Collections)
- Nút thả tim lưu nhanh thiết bị yêu thích vào danh sách cá nhân.
- Đồng bộ Wishlist tức thì với MongoDB khi đăng nhập và lưu đệm vào `localStorage`.

### 2.2. Quy trình Đặt thuê Trực tuyến (Online Booking Flow)
- **Bộ chọn khoảng ngày thuê trực quan (Date Range Picker)**: Chọn ngày nhận và ngày trả máy trực quan trên giao diện lịch.
- **Trực quan hóa lịch bận**: Tự động đánh dấu xám và vô hiệu hóa các ngày máy đã có người đặt thuê hoặc chủ máy bận (chống trùng lịch hoàn toàn).
- **Tự động tính toán chi phí minh bạch**:
  - `Số ngày thuê thực tế = Ngày trả - Ngày nhận`.
  - `Tiền thuê cơ bản = Giá thuê/ngày * Số ngày`.
  - **Chiết khấu thuê dài ngày**: Giảm 10% khi thuê từ 3 ngày, giảm 20% khi thuê từ 7 ngày trở lên.
  - **Tiền cọc bảo đảm (Deposit Fee)**: Tùy theo giá trị của từng dòng thiết bị (giảm thêm tới 50% nếu tài khoản có điểm tín nhiệm cao hoặc đã eKYC).
  - **Áp dụng Voucher**: Nhập mã khuyến mãi (ví dụ: `WELCOME50`, `WEEKEND10`).
  - `Tổng thanh toán cuối cùng = Tiền thuê - Chiết khấu - Khuyến mãi + Tiền cọc`.
- **Hình thức nhận máy**: Nhận trực tiếp tại địa chỉ chủ máy hoặc Giao hàng tận nơi (nhập form địa chỉ giao nhận có xác thực).

### 2.3. Theo dõi Vòng đời Đơn thuê (My Bookings Hub)
- **Giao diện phân tab tiến trình 5 trạng thái**:
  - `Chờ duyệt (pending)`: Đang chờ chủ máy xem xét yêu cầu.
  - `Đã duyệt (approved)`: Chủ máy đã đồng ý, chuẩn bị gặp giao nhận.
  - `Đang thuê (active)`: Khách đang cầm máy sử dụng.
  - `Đã hoàn tất (completed)`: Đã trả máy, chủ máy kiểm tra và hoàn cọc xong.
  - `Đã hủy / Từ chối (cancelled/rejected)`.
- **Sơ đồ Timeline đơn hàng**: Hiển thị trực quan từng mốc thời gian (Thời điểm đặt, Thời điểm duyệt, Thời điểm nhận máy, Hạn trả).
- **Đồng hồ đếm ngược thời gian thuê (Countdown Timer)**: Hiển thị số ngày/giờ/phút còn lại của gói thuê trên giao diện chi tiết đơn.
- **Hủy đơn thuê**: Cho phép người thuê chủ động hủy đơn khi đơn còn ở trạng thái `pending`.
- **Yêu cầu gia hạn (Request Rental Extension)**: Gửi đề xuất gia hạn thêm ngày thuê trực tiếp tới chủ máy.

### 2.4. Biên bản Bàn giao Điện tử (Digital Handover Protocol)
- **Mã QR bàn giao**: Người thuê mở modal hiển thị mã QR đơn hàng (`qrcode.react`) để chủ máy quét xác nhận khi gặp mặt.
- **Chụp ảnh nhận máy (`handoverPhotos.beforeRental`)**: Tải ảnh chụp 4 góc máy và phụ kiện kèm theo lúc nhận bàn giao (hỗ trợ kéo thả ảnh hoặc chụp trực tiếp qua Webcam).
- **Ghi chú hiện trạng ban đầu**: Ghi nhận mức pin ban đầu, vết trầy xước có sẵn để phòng tránh tranh chấp khi trả.
- **Hợp đồng điện tử ký số Canvas**: Ký tay xác nhận trực tiếp trên màn hình web qua `react-signature-canvas`.

### 2.5. Trả máy, Chấm sao & Hoàn cọc (Return, Review & Refund)
- Chuông thông báo nhắc hạn trả máy trước 6 tiếng và 2 tiếng.
- Tải ảnh bàn giao trả máy (`handoverPhotos.afterRental`).
- Nhận lại 100% tiền cọc bảo đảm vào Ví cá nhân sau khi chủ máy xác nhận hoàn tất.
- **Đánh giá 1 - 5 sao kèm ảnh chụp thật**: Nhận xét chất lượng thiết bị và độ nhiệt tình của chủ máy.

---

## 3. PHÂN HỆ 3: CHỦ SỞ HỮU THIẾT BỊ (OWNER - MONETIZATION & FLEET MANAGEMENT)
*Dành cho cá nhân, Studio hoặc cửa hàng có thiết bị nhàn rỗi muốn gia tăng thu nhập:*

### 3.1. Đăng tin Cho thuê Chuyên nghiệp (Post Device Suite)
- **Kéo thả tải album ảnh (Drag & Drop Uploader)**: Tải lên tối đa 8 ảnh thực tế, xem trước thumbnail, đổi thứ tự ảnh thuận tiện.
- **Định vị vị trí đặt máy trên Bản đồ**: Tự động điền địa chỉ hoặc nhấp chọn ghim trực tiếp trên bản đồ con, lưu toạ độ GeoJSON `Point [kinh độ, vĩ độ]` vào MongoDB.
- Nhập thông tin chi tiết: Tên máy, Thương hiệu, Năm sản xuất, Tình trạng (Mới 99%, 95%, Có vết xước nhẹ).
- Thiết lập giá thuê theo ngày, tiền cọc bảo đảm và khai báo danh sách phụ kiện đi kèm.
- Nhập bảng thông số kỹ thuật tùy biến dạng Key-Value (Specs Builder).
- **Trợ lý AI Đăng tin**: Gemini AI tự động gợi ý mô tả sản phẩm hấp dẫn và bảng thông số chuẩn dựa vào tên máy.

### 3.2. Quản lý Kho máy của tôi (Fleet Management Dashboard)
- Danh sách toàn bộ thiết bị đang sở hữu dạng bảng / lưới với bộ lọc trạng thái nhanh.
- **Công tắc trạng thái nhanh (Quick Status Switch)**:
  - `available`: Sẵn sàng cho thuê (hiển thị công khai).
  - `maintenance`: Đang bảo trì, vệ sinh máy (tạm ẩn).
  - `hidden`: Tạm ẩn khi chủ máy có nhu cầu tự sử dụng máy.
- **Lịch bận cá nhân (Availability Calendar)**: Chủ động nhấp chọn và chặn các ngày cá nhân cần dùng máy để khách không thể đặt.
- Chỉnh sửa thông tin, giá thuê và phụ kiện bất kỳ lúc nào.

### 3.3. Xử lý Đơn thuê & Vận hành Giao nhận (Order Processing Hub)
- Nhận thông báo thời gian thực qua Socket.io khi có khách đặt thuê máy mới.
- **Xem hồ sơ tín nhiệm khách thuê**: Xem Điểm uy tín (Trust Score), số đơn đã hoàn tất, nhận xét từ các chủ máy khác trước khi duyệt.
- Nút bấm phê duyệt: **Duyệt đơn (`approved`)** hoặc **Từ chối (`rejected`)** kèm lý do.
- **Quét mã QR bàn giao qua Webcam/Camera**: Sử dụng thư viện `html5-qrcode` trên trình duyệt để quét mã QR của khách thuê, kích hoạt đơn sang `active`.
- **Đối soát nhận lại máy**: Tải ảnh hiện trạng máy sau khi khách hoàn trả (`handoverPhotos.afterRental`).
- **Xác nhận hoàn tất đơn (`completed`)**: Kích hoạt hoàn tiền cọc tự động cho khách.
- **Yêu cầu trừ cọc khi có hư hỏng (Damage Dispute)**: Nếu máy bị nứt vỡ, trầy xước nặng, chủ máy gửi biên bản khiếu nại đính kèm ảnh đối chiếu trước/sau để Admin phân xử.

### 3.4. Báo cáo Doanh thu & Dòng tiền (Financial Dashboard)
- **Biểu đồ trực quan hóa (Recharts)**: Biểu đồ doanh thu theo Tuần, Tháng, Quý.
- Thống kê tỷ lệ lấp đầy thiết bị (Utilization Rate %).
- Quản lý số dư tiền thuê nhận được và tiền cọc đang giữ trong ví ký quỹ.
- Tạo yêu cầu rút tiền về tài khoản ngân hàng cá nhân.

---

## 4. PHÂN HỆ 4: TRỢ LÝ TRÍ TUỆ NHÂN TẠO GOOGLE GEMINI AI (AI TECH HUB)
*Ứng dụng mô hình Google Gemini 1.5 Flash hỗ trợ người dùng ra quyết định thuê máy chính xác:*

### 4.1. Tóm tắt Đánh giá Chuyên sâu (AI Review Summarizer)
- Tự động phân tích các đánh giá và thông số kỹ thuật của thiết bị.
- Trích xuất định dạng JSON thành 3 khối giao diện thẻ trực quan:
  - **Thẻ Xanh (Ưu điểm - Pros)**: 3 - 5 điểm mạnh vượt trội nhất của dòng máy.
  - **Thẻ Đỏ (Nhược điểm - Cons)**: 2 - 3 điểm hạn chế cần lưu ý khi sử dụng.
  - **Lời khuyên (Best For)**: Gợi ý máy này phù hợp nhất cho đối tượng/nhu cầu nào (Quay đêm, Chụp thể thao, Đồ họa 3D...).

### 4.2. So sánh Đối đầu Thiết bị (AI Device Comparator)
- Chọn 2 thiết bị bất kỳ từ kho máy (ví dụ: *Sony A7 IV vs Canon R6 Mark II*, hoặc *MacBook M3 Max vs Dell XPS 16*).
- Gemini AI lập bảng phân tích so sánh đối đầu chi tiết:
  - So sánh cảm biến / vi xử lý đồ họa.
  - So sánh thời lượng pin và trọng lượng thực tế.
  - So sánh hiệu năng trên giá tiền thuê (Price-to-Performance).
  - Kết luận và đề xuất sản phẩm tối ưu hơn cho từng mục đích cụ thể.

### 4.3. Chatbot Tư vấn Thuê máy Thông minh (AI Smart Rental Consultant)
- Người dùng trò chuyện với Trợ lý AI bằng ngôn ngữ tự nhiên ngay trên thanh widget nổi của website:
  *"Mình cần quay MV ca nhạc ngoài trời lúc hoàng hôn với ngân sách dưới 600k/ngày thì nên thuê máy nào?"*
- Gemini AI phân tích nhu cầu, quét danh sách thiết bị phù hợp trong CSDL và phản hồi kèm thẻ liên kết trực tiếp tới trang thuê.

### 4.4. Trợ lý Soạn tin Đăng máy (AI Listing Assistant)
- Chủ máy chỉ cần nhập tên model máy, bấm nút *"Tạo mô tả bằng AI"*, Gemini AI tự động sinh bài viết mô tả sản phẩm hấp dẫn, chuyên nghiệp và tự động điền bảng thông số kỹ thuật chuẩn.

---

## 5. PHÂN HỆ 5: GIAO TIẾP THỜI GIAN THỰC & CHĂM SÓC KHÁCH HÀNG (COMMUNICATION)
*Cầu nối tương tác trực tiếp, nhanh chóng và an toàn giữa hai bên:*

### 5.1. Nhắn tin Trao đổi Nội bộ Thời gian thực (Web In-App Real-time Chat)
- Khung chat trực tiếp 1-1 gắn liền theo từng mã đơn thuê qua **Socket.io**.
- Hỗ trợ gửi tin nhắn văn bản, chia sẻ vị trí, tải ảnh chụp tình trạng máy.
- **Mẫu tin nhắn nhanh (Quick Reply Templates)**:
  - *"Chào bạn, máy đã được sạc đầy pin và kèm thẻ nhớ chưa ạ?"*
  - *"Mình đã tới điểm hẹn giao máy rồi nhé!"*
  - *"Bạn hướng dẫn mình cách lắp ống kính / pin với."*
- Hiển thị trạng thái tin nhắn thời gian thực: *Đã gửi*, *Đã xem*.

### 5.2. Trung tâm Thông báo Đẩy Web (Web Notification Hub)
- Biểu tượng chuông thông báo trên thanh Header với chấm đỏ hiển thị số lượng chưa đọc.
- Dropdown thông báo thời gian thực khi:
  - Có yêu cầu thuê mới hoặc đơn thuê được duyệt / từ chối.
  - Chủ máy xác nhận bàn giao máy.
  - Nhắc nhở hạn trả máy (trước 6 tiếng và 2 tiếng).
  - Nhận được tin nhắn hoặc đánh giá mới.
- Nút "Đánh dấu tất cả là đã đọc".

---

## 6. PHÂN HỆ 6: BẢO MẬT, ĐỊNH DANH & TÍN NHIỆM (TRUST, SECURITY & E-KYC)
*Thiết lập môi trường giao dịch tin cậy, phòng chống gian lận và hư hỏng tài sản:*

### 6.1. Xác minh Danh tính Điện tử Web (Web eKYC Verification)
- Tải lên ảnh 2 mặt Căn cước công dân (CCCD) và chụp ảnh chân dung trực tiếp qua Webcam máy tính.
- Admin đối soát phê duyệt và cấp **Huy hiệu Tích xanh Uy tín (`isVerified: true`)**.
- Khách thuê có tích xanh được hưởng quyền lợi giảm 20% - 50% tiền cọc bảo đảm.

### 6.2. Hệ thống Điểm Tín nhiệm (Trust Score System)
- Mỗi tài khoản khởi điểm với 100 điểm tín nhiệm.
- **Cộng điểm**: Hoàn tất đơn đúng hạn (+5 điểm), nhận đánh giá 5 sao (+3 điểm), giữ gìn máy sạch đẹp (+2 điểm).
- **Trừ điểm**: Trả máy trễ hẹn (-10 điểm), hủy đơn sau khi đã duyệt (-15 điểm), làm trầy xước/hỏng máy (-30 điểm).
- Tài khoản có điểm tín nhiệm cao được ưu tiên hiển thị bài đăng và mở khóa quyền thuê các thiết bị đắt tiền.

### 6.3. Biên bản Hợp đồng Thuê Ký số (Electronic Agreement & Canvas Sign)
- Tự động sinh biên bản thỏa thuận quyền và nghĩa vụ cho từng đơn thuê.
- Hỗ trợ ký xác nhận điện tử trực tiếp bằng chuột hoặc màn cảm ứng qua `react-signature-canvas`.
- Cho phép xuất hoặc in hợp đồng định dạng PDF.

---

## 7. PHÂN HỆ 7: VÍ NỘI BỘ, KHUYẾN MÃI & GAMIFICATION (FINANCE & LOYALTY)

### 7.1. Ví Điện tử Nội bộ TechShare (Mock Escrow Wallet)
- Hiển thị hai tài khoản số dư: **Số dư khả dụng** và **Số dư cọc đang đóng băng (Escrow)**.
- Dòng tiền cọc được giữ an toàn trong ví ký quỹ trong suốt thời gian thuê máy; tự động mở khóa hoàn cọc ngay khi đơn hoàn tất.
- Bảng lịch sử biến động số dư chi tiết: Nạp tiền, Thanh toán thuê máy, Tạm giữ cọc, Nhận hoàn cọc, Nhận tiền cho thuê máy.
- Tạo lệnh rút tiền về tài khoản ngân hàng.

### 7.2. Trung tâm Khuyến mãi & Voucher (Promo & Voucher Center)
- Kho Voucher phong phú:
  - `WELCOME50`: Giảm 50.000đ cho đơn thuê đầu tiên.
  - `WEEKEND10`: Giảm 10% khi thuê vào thứ Bảy và Chủ Nhật.
  - `CREATOR20`: Giảm 20% cho đơn thuê từ 5 ngày trở lên.
- Sao chép mã chỉ với 1 click và tự động áp dụng mã có lợi nhất tại bước thanh toán.

### 7.3. Giới thiệu Bạn bè & Huy hiệu Thành viên (Referral & Badges)
- Mỗi người dùng sở hữu 1 mã giới thiệu (Referral Code) riêng; cả hai cùng nhận voucher khi bạn bè đăng ký qua mã.
- Hệ thống danh hiệu thành viên: *Tân binh*, *Reviewer kỳ cựu*, *Siêu chủ máy (Super Owner)*.

---

## 8. PHÂN HỆ 8: NỀN TẢNG KỸ THUẬT WEB & HIỆU NĂNG (PERFORMANCE & PWA)

### 8.1. Thiết kế Giao diện Thích ứng (Responsive Web Design)
- Tương thích tối ưu 100% trên màn hình Máy tính để bàn (Desktop 1920x1080, Laptop 1366x768), Máy tính bảng (Tablet) và Điện thoại di động (Mobile Web).
- Hỗ trợ chế độ Giao diện Sáng / Tối (Light Mode / Dark Mode) tùy biến theo sở thích người dùng.

### 8.2. Tối ưu hóa Tốc độ & Bộ nhớ Cục bộ
- **LocalStorage Cache**: Lưu trữ nhanh danh sách yêu thích và lịch sử tìm kiếm gần nhất.
- **Skeleton Loading & Lazy Loading**: Tránh layout shift, tải chậm hình ảnh (Image Lazy Loading) và phân tách gói mã nguồn (Code Splitting với `React.lazy`).

---

## 9. PHÂN HỆ 9: QUẢN TRỊ VIÊN HỆ THỐNG (ADMIN & PLATFORM GOVERNANCE)
*Dành cho ban quản trị nền tảng kiểm soát chất lượng dịch vụ và bảo vệ người dùng trên Desktop Portal:*

### 9.1. Bảng điều khiển Tổng quan Toàn sàn (Admin Analytical Dashboard)
- Biểu đồ thống kê tổng quan: Tổng số người dùng, tổng số thiết bị, số đơn đang chạy, tổng doanh thu toàn sàn.
- Biểu đồ phân bổ danh mục được thuê nhiều nhất và bản đồ mật độ thiết bị.

### 9.2. Kiểm duyệt & Quản trị Nội dung
- Phê duyệt bài đăng mới hoặc gỡ bỏ các bài đăng sai danh mục, thông tin giả mạo.
- Khóa tạm thời hoặc vĩnh viễn các tài khoản gian lận hoặc vi phạm quy tắc cộng đồng.
- Quản lý và xóa các bài đánh giá spam hoặc tiêu cực.

### 9.3. Phân xử Tranh chấp & Quản lý Ký quỹ (Dispute & Escrow Resolution)
- **Màn hình đối chiếu song song 2 ảnh**: Xem ảnh lúc nhận bàn giao (`beforeRental`) cạnh ảnh lúc trả (`afterRental`) trên giao diện màn hình rộng.
- Xem toàn bộ nhật ký tin nhắn Socket.io trao đổi và timeline đơn hàng của 2 bên.
- Đưa ra phán quyết xử lý tiền cọc: Hoàn trả 100% cho người thuê, hoặc trích một phần/toàn bộ cọc đền bù cho chủ máy khi có hư hỏng xác thực.

### 9.4. Duyệt Hồ sơ eKYC & Cấu hình Hệ thống
- Duyệt ảnh CCCD 2 mặt và ảnh chân dung webcam do người dùng gửi lên để cấp tích xanh uy tín.
- Tạo mới, gia hạn hoặc tạm dừng các chương trình mã giảm giá trên toàn hệ thống.
- Theo dõi nhật ký kiểm toán hệ thống (Audit Logs).
