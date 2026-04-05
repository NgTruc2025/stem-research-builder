# 🔬 STEM Research Builder

**Hệ thống hỗ trợ học sinh THPT xây dựng đề tài nghiên cứu Khoa học Kỹ thuật với trợ lý AI tích hợp.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![React](https://img.shields.io/badge/React-18-61dafb)
![Vite](https://img.shields.io/badge/Vite-6-646cff)

## ✨ Tính năng

| Module | Chức năng |
|--------|-----------|
| 💡 **Idea Generator** | AI gợi ý 6 đề tài theo lĩnh vực, phân loại Dễ/TB/Khó |
| 🔍 **Problem Analyzer** | Phân tích mục tiêu, câu hỏi, giả thuyết nghiên cứu |
| ⚗️ **Method Suggestion** | Đề xuất phương pháp, công cụ, thuật toán |
| 🧪 **Experiment Designer** | Thiết kế biến số, quy trình, bảng dữ liệu |
| 📊 **Data Analyzer** | Hướng dẫn thống kê + code Python mẫu |
| 📄 **Report Generator** | Sinh báo cáo theo chuẩn thi KHKT Quốc gia |
| 🎯 **Presentation Builder** | Kịch bản slide 10-12 trang chuyên nghiệp |

## 🚀 Cài đặt & Chạy

```bash
# Clone repo
git clone https://github.com/NgTruc2025/stem-research-builder.git
cd stem-research-builder

# Cài dependencies
npm install

# Chạy dev server
npm run dev
```

Mở **http://localhost:5173** trên trình duyệt.

## ⚙️ Cấu hình API

1. Truy cập [Google AI Studio](https://aistudio.google.com/apikey) để lấy API Key miễn phí
2. Trong app, click **⚙ Cài đặt** → chọn **Gemini** → dán API Key → **Lưu**
3. Bắt đầu tạo đề tài!

### AI Providers hỗ trợ
- **Google Gemini** (miễn phí) — 5 models với auto-fallback khi hết quota
- **Anthropic Claude** — chất lượng cao (cần API key trả phí)

## 🛠️ Tech Stack

- **Frontend:** React 18 + Vite 6
- **Styling:** Vanilla CSS (Dark Glassmorphism theme)
- **AI:** Google Gemini API / Anthropic Claude API
- **Export:** TXT, HTML, Markdown

## 📁 Cấu trúc dự án

```
stem-research-builder/
├── index.html          # Entry point
├── package.json        # Dependencies
├── vite.config.js      # Vite config
└── src/
    ├── main.jsx        # React mount
    ├── App.jsx         # Main component (~1300 lines)
    └── index.css       # Design system (~860 lines)
```

## 📝 Hướng dẫn sử dụng

1. **Chọn lĩnh vực** nghiên cứu (8 lĩnh vực)
2. **AI gợi ý** 6 đề tài phù hợp
3. **Chọn đề tài** → đi qua 7 modules từng bước
4. **Xuất kết quả** ra file TXT/HTML/Markdown
5. Sử dụng nội dung để viết báo cáo & làm slide

## 📄 License

MIT License © 2025 NgTruc2025
