# 💕 Date Planner — Lịch hẹn hò

Web tĩnh (HTML + CSS + JavaScript thuần) để lên lịch đi chơi cùng người thương:
chọn ngày ⏤ chọn giờ & địa điểm ⏤ chọn món ăn ⏤ **vòng quay random món** ⏤ lưu lịch sử.

Tone màu: **hồng · xanh mint · xanh bơ** 🌸🌿🥑

---

## ✨ Tính năng

| Nhóm | Chi tiết |
|---|---|
| 🗓️ Chọn ngày | Lịch tự viết, đánh dấu hôm nay / ngày đang chọn / ngày đã có hẹn, chặn ngày quá khứ |
| ⏰ Chọn giờ | 6 khung giờ gợi ý + chọn giờ tự do |
| 📍 Địa điểm | Nhập tên quán + 8 chip hoạt động (xem phim, cà phê, karaoke…) + lời nhắn |
| 🍜 Món ăn | 53 món chia 6 nhóm, tìm kiếm, **chọn đúng 1 món**, tự thêm món mới |
| 🧋 Nước uống | Danh sách riêng, **chọn đúng 1 ly**, tự thêm loại mới |
| 🎯 Bảng chọn | Bấm 🎡 ở góc món để bỏ vào bảng chọn — vòng quay sẽ random đúng trong những món mình đang phân vân |
| 🎡 Vòng quay | Canvas có animation, **2 chế độ: quay món ăn / quay nước uống**, 2 nguồn: **bảng chọn** / cả danh sách; chốt kết quả là **thay thế** lựa chọn cũ; pháo giấy khi ra kết quả |
| 💾 Lịch sử | Lưu Firebase Firestore (hoặc localStorage), lọc sắp tới / đã qua, dùng lại, xoá, xuất JSON |
| 📊 Thống kê | Số buổi hẹn, số buổi sắp tới, món hay chọn nhất |
| 📷 Ảnh chung | Trang `gallery.html`: kéo-thả tải ảnh lên **Google Drive**, tự nén ảnh, gắn ảnh với buổi hẹn, xem lớn (lightbox), sửa cần chú, xoá |
| 📱 Responsive | Chạy đẹp trên điện thoại |

---

## 📁 Cấu trúc

```
date-planner/
├── index.html          ← trang lên lịch
├── gallery.html        ← trang ảnh chung
├── assets/
│   ├── css/style.css
│   └── js/
│       ├── config.js   ← CHỈ CẦN SỬA FILE NÀY
│       ├── foods.js    ← danh sách món ăn
│       ├── store.js    ← Firestore + localStorage
│       ├── wheel.js    ← vòng quay
│       ├── drive.js    ← đăng nhập & upload Google Drive
│       ├── photos.js   ← nén ảnh + kho ảnh offline (IndexedDB)
│       ├── gallery.js  ← logic trang ảnh
│       └── app.js      ← logic trang chính
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

5. Menu trái → **Build → Firestore Database → Create database** → chọn **Start in test mode** → chọn region `asia-southeast1`.
6. Xong! Reload web, badge góc phải sẽ hiện **Firebase ☁️**.

> **Nếu chưa cấu hình gì**, web vẫn chạy 100% và lưu lịch sử vào trình duyệt (badge hiện **Lưu trên máy 💾**).

### Rules nên dùng sau khi test xong

Test mode sẽ hết hạn sau 30 ngày. Vào **Firestore → Rules** và dán:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /dates/{doc} {
      allow read, write: if true;   // web riêng tư, không có đăng nhập
    }
  }
}
```

⚠️ Rule này cho phép mọi người biết `projectId` đều ghi được. Đây là web cá nhân
nhỏ nên chấp nhận được; nếu muốn chặt hơn thì bật **Firebase Authentication
(Anonymous / Google)** rồi đổi thành `if request.auth != null;`.

---

## 📷 Bật Google Drive cho trang Ảnh chung

Trang `gallery.html` chạy được ngay mà không cần cấu hình gì — ảnh sẽ lưu trong
trình duyệt (badge hiện **Chế độ offline 💾**). Muốn ảnh lên Drive và xem được
từ mọi thiết bị thì làm 5 bước sau:

1. Vào <https://console.cloud.google.com> → tạo project mới (hoặc chọn luôn
   project Firebase đã tạo ở trên).
2. **APIs & Services → Library** → tìm **Google Drive API** → **Enable**.
3. **APIs & Services → OAuth consent screen**
   - User type: **External** → Create
   - Điền App name + email hỗ trợ + email liên hệ
   - Ở bước **Test users**, bấm **+ Add users** và thêm email Google của anh
     *và của bạn gái*. (Không thêm thì đăng nhập sẽ bị chặn.)
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**
   - Application type: **Web application**
   - **Authorized JavaScript origins** — thêm cả hai dòng:
     ```
     http://localhost:8080
     https://<username>.github.io
     ```
     (chỉ phần gốc, KHÔNG có `/date-planner` phía sau)
   - Bấm **Create** rồi copy **Client ID**.
5. Mở `assets/js/config.js`, dán vào:

```js
export const GOOGLE_CLIENT_ID = "1234567890-abcxyz.apps.googleusercontent.com";
export const DRIVE_FOLDER_NAME = "Date Planner Photos";
export const DRIVE_PUBLIC_LINK = true;   // ảnh được share "ai có link đều xem"
```

Xong! Vào trang Ảnh, bấm **Kết nối Google Drive**, đăng nhập một lần là upload được.

**Vài điều nên biết:**

- App dùng quyền `drive.file` — quyền hẹp nhất có thể. Nó **chỉ nhìn thấy được
  những file do chính nó tạo ra**, không đọc được phần còn lại trong Drive của anh.
- `DRIVE_PUBLIC_LINK = true` nghĩa là mỗi ảnh sau khi upload được đặt "ai có link
  đều xem được" — nhờ vậy bạn gái mở web là thấy ảnh ngay mà không cần đăng nhập.
  Đổi thành `false` nếu muốn ảnh hoàn toàn riêng tư (khi đó ai xem cũng phải đăng nhập Google).
- Ảnh được **tự động nén xuống cạnh dài 1600px** trước khi upload cho nhẹ và nhanh.
- Chỉ người đăng nhập Google mới **tải ảnh lên** được. Người xem chỉ cần mở web.
- Phiên đăng nhập Google hết hạn sau khoảng 1 tiếng, đăng nhập lại là xong.

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

## 🍽️ Quy tắc chọn món

Mỗi buổi hẹn giữ **đúng 1 món ăn + đúng 1 nước uống** — cho gọn và dễ quyết:

- **Bấm vào thân món** = chọn luôn cho buổi hẹn. Bấm món khác là **tự đổi**, không
  cộng dồn; bấm lại đúng món đang chọn thì bỏ chọn.
- **Bấm nút 🎡 ở góc món** = bỏ món đó vào **bảng chọn** (không chốt gì cả). Bỏ vào
  bao nhiêu món cũng được — đây là danh sách "đang phân vân".
- Nút **×** trên ô "Đã chọn cho buổi hẹn" để xoá nhanh một ô.
- Vòng quay có 2 tab: **🍜 Món ăn** và **🧋 Nước uống**, và 2 nguồn:
  - **🎯 Bảng chọn** — chỉ quay trong những món mình vừa bỏ vào bảng chọn (cần ≥ 2 món)
  - **🌈 Cả danh sách** — quay trong toàn bộ, có thể lọc theo nhóm
  Bảng chọn có sẵn 2 nút **🎡 Quay món ăn / 🎡 Quay nước uống** để quay ngay tại chỗ.
- Quay xong bấm **"Chốt món này cho buổi hẹn"** → món đó **xoá lựa chọn cũ cùng loại
  và thay vào**. Quay món ăn không đụng tới nước uống và ngược lại. Bảng chọn vẫn giữ
  nguyên để quay lại nếu chưa ưng.
- Ở nguồn "Cả danh sách", vòng quay chỉ hiện tối đa 12 lát cho dễ nhìn; nút
  **🔀 Xáo lại vòng quay** sẽ đổi sang 12 món khác. Nguồn "Bảng chọn" thì hiện đủ hết.

Bản ghi lưu xuống có cả `food` và `drink` riêng, đồng thời vẫn giữ mảng `foods`
để những buổi hẹn lưu từ phiên bản cũ hiển thị bình thường.

---

## 🍲 Thêm / sửa món ăn

**Cách 1 — ngay trên web (khuyên dùng):** bấm **+ Thêm món** (ở khối Món ăn) hoặc
**+ Thêm nước** (ở khối Nước uống). Điền tên, chọn emoji, chọn nhóm → xong. Món mới:

- được chọn sẵn cho buổi hẹn đang lên lịch (thay chỗ món cũ cùng loại),
- **được lưu lại** (Firestore nếu đã cấu hình, không thì localStorage) nên
  reload trang vẫn còn,
- có nhãn *tự thêm* và nút **×** ở góc để xoá khi không cần nữa,
- lên vòng quay được bình thường.

**Cách 2 — sửa thẳng trong code:** mở `assets/js/foods.js`

```js
{ emoji: "🍜", name: "Phở bò", cat: "vn" },
```

`cat` chọn 1 trong: `vn`, `asian`, `western`, `hotpot`, `street`, `dessert`, `drink`.

---

## 📬 Gửi thông báo về mail / tin nhắn (chưa bật)

Phần này tạm bỏ qua theo yêu cầu. Khi cần bật, có 3 hướng dễ nhất cho web tĩnh:

- **EmailJS** — gửi email thẳng từ trình duyệt, free 200 mail/tháng.
- **Telegram Bot** — `https://api.telegram.org/bot<TOKEN>/sendMessage`, free không giới hạn.
- **Discord Webhook** — `POST` vào URL webhook, setup nhanh nhất.

Chỗ cần gắn: hàm `saveBtn` trong `assets/js/app.js`, ngay sau `await store.add(record)`.

---

Made with 💗 & 🥑
