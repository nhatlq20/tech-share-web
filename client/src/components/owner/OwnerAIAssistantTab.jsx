import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  Send,
  TrendingUp,
  DollarSign,
  ShieldCheck,
  FileText,
  RotateCw,
} from 'lucide-react';

const PROMPT_SUGGESTIONS = [
  {
    icon: DollarSign,
    title: 'Gợi ý giá thuê tối ưu',
    prompt: 'Hãy gợi ý mức giá thuê ngày và tiền đặt cọc hợp lý cho máy ảnh Sony A7 IV kèm ống kính 24-70mm GM.',
  },
  {
    icon: FileText,
    title: 'Viết mô tả bài đăng hút khách',
    prompt: 'Viết giúp tôi tiêu đề và phần mô tả bài đăng cho thuê flycam DJI Mini 4 Pro đầy đủ pin và phụ kiện.',
  },
  {
    icon: ShieldCheck,
    title: 'Quy trình giải quyết cọc Escrow',
    prompt: 'Nếu khách thuê làm trầy xước ống kính khi trả máy, quy trình khấu trừ cọc trên TechShare diễn ra như thế nào?',
  },
  {
    icon: TrendingUp,
    title: 'Dự báo thiết bị hot tháng này',
    prompt: 'Những dòng thiết bị nào đang có nhu cầu thuê cao nhất trong dịp lễ và mùa du lịch sắp tới?',
  },
];

const PRESET_ANSWERS = {
  default: `Chào bạn! Tôi là **TechShare AI Assistant** – trợ lý thông minh dành riêng cho Chủ thiết bị. 

Tôi có thể giúp bạn:
- 💡 **Định giá thiết bị thông minh**: Đề xuất mức giá thuê ngày và tỷ lệ cọc hợp lý dựa trên dữ liệu thị trường.
- 📝 **Tối ưu nội dung đăng bài**: Viết tiêu đề, thông số kỹ thuật và quy định bàn giao hấp dẫn.
- 🛡️ **Bảo vệ quyền lợi cọc Escrow**: Hướng dẫn quy trình chụp ảnh hiện trạng và giải quyết bồi thường.
- 📈 **Gia tăng doanh thu**: Phân tích danh mục thiết bị có nhu cầu thuê cao nhất.

Bạn muốn tôi hỗ trợ nội dung nào hôm nay?`,

  price: `### 💡 Đề xuất định giá cho **Sony A7 IV + Lens 24-70mm F2.8 GM**:

1. **Giá thuê đề xuất theo ngày**:
   - Ngày thường: **420.000 đ – 480.000 đ / ngày**
   - Thuê cuối tuần (T7, CN): **520.000 đ / ngày**
   - Giảm giá dài ngày: Giảm **15%** cho gói thuê từ 3 ngày, giảm **25%** cho gói thuê 1 tuần.

2. **Tiền đặt cọc đề xuất (Escrow)**:
   - Khách có CCCD gắn chip & tài khoản đã xác minh: **3.500.000 đ** (kết hợp giữ giấy tờ tùy thân hoặc hợp đồng điện tử).
   - Khách mới chưa xác minh: **8.000.000 đ – 12.000.000 đ**.

3. **Mẹo tăng tỷ lệ chốt đơn**:
   - Tặng kèm 01 pin phụ và thẻ nhớ tốc độ cao 128GB (V90).
   - Bật tính năng chấp nhận giao nhận tận nơi trong bán kính 5km.`,

  post: `### 📝 Mẫu tiêu đề & mô tả bài đăng hút khách:

**Tiêu đề:**  
*[Combo Quay Chụp 4K] Cho thuê DJI Mini 4 Pro Fly More Combo Plus (3 Pin, Màn RC2, Sạc Nhanh)*

**Điểm nổi bật:**
- ✈️ Trọng lượng < 249g, cảm biến tránh vật cản đa hướng 360°.
- 🔋 3 pin dung lượng cao cho thời lượng bay thực tế lên đến hơn 100 phút.
- 📱 Tay điều khiển DJI RC2 có màn hình siêu sáng, không phụ thuộc vào điện thoại.
- 📦 Tặng kèm túi đựng chính hãng, cánh quạt dự phòng và thẻ Sandisk Extreme Pro 128GB U3.

**Điều kiện nhận máy:**
- Kiểm tra trực tiếp khả năng bay và tình trạng gimbal khi bàn giao.
- Hỗ trợ hướng dẫn bay cơ bản cho người mới bắt đầu!`,

  escrow: `### 🛡️ Quy trình khấu trừ cọc khi thiết bị có tổn hại:

1. **Bước 1: Chụp ảnh đối chứng khi hoàn tất giao nhận**
   - Khi giao máy: chụp ảnh độ nét cao tình trạng thấu kính, thân máy và serial number.
   - Khi nhận lại: nếu phát hiện vết xước mới, chụp lại vị trí tổn hại ngay trước mặt khách.

2. **Bước 2: Yêu cầu giữ cọc (Dispute Escrow)**
   - Trong vòng **24 giờ** sau khi nhận máy, vào mục Đơn hàng ➔ Bấm **"Yêu cầu bồi thường hư tổn"**.
   - Tải lên ảnh đối chứng trước/sau và đính kèm báo giá sửa chữa từ trung tâm bảo hành chính hãng.

3. **Bước 3: TechShare can thiệp xử lý**
   - Hệ thống giữ nguyên số tiền cọc trong tài khoản ký quỹ Escrow.
   - Ban quản lý TechShare đối soát trong 48h và giải ngân số tiền bồi thường trực tiếp vào **Ví của bạn**.`,

  trend: `### 📈 Xu hướng thiết bị có nhu cầu thuê cao nhất:

1. **Máy ảnh Mirrorless du lịch**: Sony A7C II, Fujifilm X-T5, Canon R6 Mark II (Tăng **42%** nhu cầu).
2. **Flycam & Action Cam**: DJI Mini 4 Pro, GoPro Hero 12, Insta360 X4 (Tăng **58%** vào các dịp lễ).
3. **Micro thu âm không dây**: DJI Mic 2, Rode Wireless PRO (Cháy hàng vào mùa sự kiện và hội thảo).
4. **Laptop & iPad đồ họa**: Macbook Pro M2/M3, iPad Pro M2 kèm Apple Pencil (Nhu cầu thuê chạy deadline theo tuần).`,
};

export const OwnerAIAssistantTab = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: PRESET_ANSWERS.default,
      timestamp: 'Vừa xong',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const handleSendPrompt = (textToSend) => {
    const prompt = (textToSend || inputPrompt).trim();
    if (!prompt) return;

    // Tin nhắn của user
    const userMsg = {
      sender: 'user',
      text: prompt,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsTyping(true);

    // Tìm câu trả lời phù hợp
    setTimeout(() => {
      let reply = PRESET_ANSWERS.default;
      const lower = prompt.toLowerCase();

      if (lower.includes('giá') || lower.includes('tiền') || lower.includes('định giá') || lower.includes('sony')) {
        reply = PRESET_ANSWERS.price;
      } else if (lower.includes('mô tả') || lower.includes('bài đăng') || lower.includes('flycam') || lower.includes('dji')) {
        reply = PRESET_ANSWERS.post;
      } else if (lower.includes('cọc') || lower.includes('hư') || lower.includes('trầy') || lower.includes('escrow') || lower.includes('bồi thường')) {
        reply = PRESET_ANSWERS.escrow;
      } else if (lower.includes('hot') || lower.includes('nhu cầu') || lower.includes('dự báo') || lower.includes('xu hướng')) {
        reply = PRESET_ANSWERS.trend;
      } else {
        reply = `Cảm ơn bạn đã hỏi về: **"${prompt}"**.\n\nTheo thuật toán tối ưu của TechShare, để tối đa hóa tỷ lệ lấp đầy lịch thuê của thiết bị, bạn nên:\n1. Bổ sung ít nhất 4 hình ảnh sắc nét góc chụp thực tế.\n2. Cập nhật lịch bận chính xác trên **Lịch cho thuê** để không bỏ lỡ khách đặt tức thì.\n3. Duy trì Trust Score trên 90 điểm để được ưu tiên hiển thị ở trang chủ Catalog.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: reply,
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 700);
  };

  return (
    <div className="w-full flex flex-col gap-5 p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-140px)]">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-800 text-white p-5 sm:p-6 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0 border border-white/25">
            <Sparkles size={24} className="text-teal-100" />
          </div>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span>TechShare AI Assistant</span>
              <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full bg-emerald-400 text-emerald-950">
                PRO AI
              </span>
            </h1>
            <p className="text-xs text-teal-100 mt-1">
              Trợ lý ảo hỗ trợ tối ưu doanh thu, định giá thuê thông minh và giải quyết khiếu nại cho Chủ thiết bị.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold bg-white/10 px-3.5 py-2 rounded-xl border border-white/15">
          <Bot size={16} className="text-teal-200" />
          <span>Mô hình: Gemini 1.5 Flash (Optimized for Rentals)</span>
        </div>
      </div>

      {/* Suggested Quick Prompts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {PROMPT_SUGGESTIONS.map((item, idx) => {
          const Icon = item.icon;
          return (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPrompt(item.prompt)}
              className="text-left p-3.5 bg-white rounded-xl border border-slate-200 hover:border-teal-400 hover:shadow-sm transition-all flex flex-col justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center group-hover:bg-teal-600 group-hover:text-white transition">
                  <Icon size={16} />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-teal-700 transition">
                  {item.title}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>

      {/* Chat Area */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col overflow-hidden min-h-[440px]">
        {/* Messages List */}
        <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-4">
          {messages.map((m, index) => {
            const isAI = m.sender === 'ai';
            return (
              <div
                key={index}
                className={`flex items-start gap-3 ${isAI ? '' : 'flex-row-reverse'}`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold shadow-2xs ${
                    isAI
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-800 text-white'
                  }`}
                >
                  {isAI ? <Sparkles size={16} /> : 'Tôi'}
                </div>

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-[13px] leading-relaxed shadow-2xs ${
                    isAI
                      ? 'bg-slate-50 text-slate-800 border border-slate-200/80 rounded-tl-xs whitespace-pre-wrap'
                      : 'bg-teal-600 text-white rounded-tr-xs whitespace-pre-wrap'
                  }`}
                >
                  {m.text}
                  <div
                    className={`text-[10px] mt-2 select-none ${
                      isAI ? 'text-slate-400' : 'text-teal-200 text-right'
                    }`}
                  >
                    {m.timestamp}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2 animate-pulse">
              <RotateCw size={14} className="animate-spin text-teal-600" />
              <span>TechShare AI đang suy nghĩ câu trả lời tối ưu...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50/70 flex items-center gap-2">
          <input
            type="text"
            value={inputPrompt}
            onChange={(e) => setInputPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSendPrompt();
            }}
            placeholder="Hỏi AI Assistant về cách định giá, viết mô tả bài đăng hoặc chính sách cọc Escrow..."
            className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition text-slate-800 placeholder-slate-400"
          />
          <button
            type="button"
            onClick={() => handleSendPrompt()}
            disabled={!inputPrompt.trim() || isTyping}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs flex items-center gap-1.5 transition disabled:opacity-40 cursor-pointer shadow-sm active:scale-95 shrink-0"
          >
            <span>Gửi</span>
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OwnerAIAssistantTab;

