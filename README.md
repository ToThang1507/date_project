# 💕 Date Planner — Lịch hẹn hò

Web tĩnh (HTML + CSS + JavaScript thuần) để lên lịch đi chơi cùng người thương:
chọn ngày ⏤ chọn giờ & địa điểm ⏤ chọn món ăn ⏤ **vòng quay random món** ⏤ lưu lịch sử.

Tone màu: **hồng · xanh mint · xanh bơ** 🌸🌿🥑

---

## 💗 Trang chủ "Our Time" (`index.html`)

| Nhóm | Chi tiết |
|---|---|
| ⏱️ Bộ đếm | Đếm ngày · giờ · phút · giây kể từ ngày bắt đầu yêu **26/09/2026** (cố định, đổi ở `START_DATE` trong `assets/js/config.js`) |
| 🖼️ Ảnh polaroid | Bấm **✎ Chỉnh sửa** → **Thêm ảnh**, hoặc kéo file ảnh từ máy thả thẳng vào trang (thả lên 1 ảnh có sẵn = đổi ảnh đó) |
| ✋ Kéo thả | Bấm 1 lần để chọn rồi kéo đi bất cứ đâu; nút ↻ để xoay (giữ Shift để bắt góc 15°), nút ⤡ để đổi kích thước |
| 📝 Sticky note | Mỗi ảnh có 1 tờ giấy note lời nhắn bên dưới; thêm ghi chú tự do bằng nút **Ghi chú**; **🎨 Màu giấy** để đổi màu (vàng · hồng · mint · xanh · chữ viết tay không nền) |
| ✏️ Sửa chữ | Ở chế độ chỉnh sửa, bấm vào tiêu đề, dòng phụ, câu quote, chú thích ảnh để sửa trực tiếp |
| 💾 Lưu trữ | Ảnh được nén (≤1280px) rồi lưu IndexedDB trên trình duyệt; có Firebase thì đồng bộ lên Firestore để mọi máy cùng thấy |
| 🌄 Ảnh nền | **⚙ Settings → Chọn ảnh nền**, hoặc ở chế độ chỉnh sửa chọn 1 ảnh → **🌄 Làm nền**; bỏ ở **✕ Bỏ ảnh nền** |
| ⚙️ Settings | Xuất / nhập file sao lưu (.json, gồm cả ảnh), khôi phục mặc định |
| 📱 Mobile | Ảnh & ghi chú xếp thành lưới dưới bộ đếm (vẫn sửa chữ, xoay, đổi ảnh được; kéo tự do chỉ có trên màn hình ≥ 900px) |

> ⚠️ Nếu **chưa cấu hình Firebase**, ảnh chỉ nằm trên trình duyệt của máy đã thêm ảnh.
> Muốn người ấy mở web cũng thấy ảnh → bật Firebase (bên dưới), hoặc Xuất file rồi Nhập ở máy kia.

---

## 🗓️ Trang lên lịch hẹn (`planner.html`)

| Nhóm | Chi tiết |
|---|---|
| 🗓️ Chọn ngày | Lịch tự viết, đánh dấu hôm nay / ngày đang chọn / ngày đã có hẹn, chặn ngày quá khứ |
| ⏰ Chọn giờ | 6 khung giờ gợi ý + chọn giờ tự do |
| 📍 Địa điểm | Nhập tên quán + 8 chip hoạt động (xem phim, cà phê, karaoke…) + lời nhắn |
| 🍜 Món ăn | 60+ món chia 7 nhóm, tìm kiếm, chọn nhiều, tự thêm món mới |
| 🎡 Vòng quay | Canvas có animation, quay từ "món đã chọn" / "tất cả" / "theo nhóm", pháo giấy khi ra kết quả |
| 💾 Lịch sử | Lưu Firebase Firestore (hoặc localStorage), lọc sắp tới / đã qua, dùng lại, xoá, xuất JSON |
| 📊 Thống kê | Số buổi hẹn, số buổi sắp tới, món hay chọn nhất |
| 📱 Responsive | Chạy đẹp trên điện thoại |

---

## 📁 Cấu trúc

```
date-planner/
├── index.html          ← trang chủ Our Time (bộ đếm + bảng ảnh)
├── planner.html        ← trang lên lịch hẹn
├── assets/
│   ├── css/
│   │   ├── home.css    ← giao diện trang chủ
│   │   └── style.css   ← giao diện trang lên lịch
│   └── js/
│       ├── config.js   ← CHỈ CẦN SỬA FILE NÀY
│       ├── home.js     ← trang chủ: bộ đếm, kéo thả ảnh, sticky note
│       ├── board-store.js ← lưu ảnh/ghi chú: IndexedDB + Firestore
│       ├── foods.js    ← danh sách món ăn
│       ├── store.js    ← lịch sử hẹn: Firestore + localStorage
│       ├── wheel.js    ← vòng quay
│       └── app.js      ← logic trang lên lịch
├── firestore.rules     ← dán vào Firebase Console → Firestore → Rules
├── .github/workflows/deploy.yml
└── README.md
```

---

## 🚀 Chạy thử ở máy

Vì dùng ES modules nên **không mở trực tiếp file `index.html`** (lỗi CORS). Chạy 1 server nhỏ:

```bash
# Python
python3 -m http.server 8080

# hoặc Node
npx serve .
```

Rồi mở http://localhost:8080

---

## 🔥 Bật Firebase Firestore (lưu lịch sử lên cloud)

1. Vào <https://console.firebase.google.com> → **Add project** (miễn phí).
2. Trong project, bấm icon **`</>`** (Web) → đặt tên app → **Register app**.
3. Copy đoạn `firebaseConfig` hiện ra.
4. Mở `assets/js/config.js`, dán các giá trị vào:

```js
export const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "xxx.firebaseapp.com",
  projectId: "xxx",
  storageBucket: "xxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc"
};
```

5. Menu trái → **Build → Firestore Database → Create database** → chọn region `asia-southeast1`.
6. Xong! Reload web, badge góc phải sẽ hiện **Firebase ☁️**.

> **Nếu chưa cấu hình gì**, web vẫn chạy 100% và lưu lịch sử vào trình duyệt (badge hiện **Lưu trên máy 💾**).

### 🛡️ Rules (bắt buộc)

Không cần đăng nhập: **ai có link cũng xem, thêm, sửa, xoá** ảnh và lịch hẹn được.
File `firestore.rules` chỉ chặn dữ liệu rác (sai collection, sai field, ảnh quá 1MB) và thay cho test mode
(test mode sẽ khoá hết sau 30 ngày).

Mở `firestore.rules` → copy toàn bộ → **Firestore Database → Rules** → dán đè → **Publish**.

> ⚠️ Vì không có đăng nhập, người lạ có link cũng xoá được ảnh. Thỉnh thoảng vào **⚙ Settings → Xuất file sao lưu**
> để giữ một bản dự phòng, và đừng đăng link lên chỗ công khai.

---

## 🌐 Deploy lên GitHub Pages

### Cách 1 — Nhanh nhất (không cần Actions)

```bash
cd date-planner
git init
git add .
git commit -m "feat: date planner web"
git branch -M main
git remote add origin https://github.com/<username>/date-planner.git
git push -u origin main
```

Vào repo trên GitHub → **Settings → Pages**:
- **Source**: `Deploy from a branch`
- **Branch**: `main` · thư mục `/ (root)` → **Save**

Đợi ~1 phút, web sẽ ở: `https://<username>.github.io/date-planner/`

### Cách 2 — Dùng GitHub Actions (đã có sẵn `.github/workflows/deploy.yml`)

Vào **Settings → Pages → Source: GitHub Actions**. Từ đó mỗi lần `git push` lên
`main` là web tự động deploy lại.

---

## 🍲 Thêm / sửa món ăn

Mở `assets/js/foods.js`:

```js
{ emoji: "🍜", name: "Phở bò", cat: "vn" },
```

`cat` chọn 1 trong: `vn`, `asian`, `western`, `hotpot`, `street`, `dessert`, `drink`.
(Hoặc bấm nút **+ Thêm món** ngay trên web để thêm nhanh trong lúc dùng.)

---

## 📬 Gửi thông báo về mail / tin nhắn (chưa bật)

Phần này tạm bỏ qua theo yêu cầu. Khi cần bật, có 3 hướng dễ nhất cho web tĩnh:

- **EmailJS** — gửi email thẳng từ trình duyệt, free 200 mail/tháng.
- **Telegram Bot** — `https://api.telegram.org/bot<TOKEN>/sendMessage`, free không giới hạn.
- **Discord Webhook** — `POST` vào URL webhook, setup nhanh nhất.

Chỗ cần gắn: hàm `saveBtn` trong `assets/js/app.js` (trang `planner.html`), ngay sau `await store.add(record)`.

---

Made with 💗 & 🥑
