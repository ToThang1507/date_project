/* ============================================================
   CẤU HÌNH — sửa file này là đủ, không cần đụng code khác
   ============================================================ */

/**
 * Firebase Firestore
 * ------------------
 * 1. Vào https://console.firebase.google.com → Add project (miễn phí).
 * 2. Trong project → biểu tượng </> (Web app) → đăng ký app → copy đoạn firebaseConfig.
 * 3. Dán các giá trị vào bên dưới.
 * 4. Vào Build → Firestore Database → Create database → chọn "Start in test mode"
 *    (nhớ đổi Rules sau, xem README).
 *
 * Nếu để trống apiKey, web vẫn chạy bình thường và tự động lưu vào
 * localStorage của trình duyệt.
 */
export const firebaseConfig = {
  apiKey: "AIzaSyBjfkg3w9sUR-z3qT53Dd38oHl8RQSsjJg",
  authDomain: "date-app-ece8c.firebaseapp.com",
  projectId: "date-app-ece8c",
  storageBucket: "date-app-ece8c.firebasestorage.app",
  messagingSenderId: "885136155029",
  appId: "1:885136155029:web:43b717613afb8dba72569c",
  measurementId: "G-MYCVYK2MSQ"
};

/** Tên collection trên Firestore */
export const COLLECTION = "dates";

/** Tên mặc định điền sẵn vào form */
export const DEFAULT_NAMES = {
  me: "",
  her: ""
};

/** Có cho phép chọn ngày trong quá khứ không */
export const ALLOW_PAST_DATES = false;

/**
 * Google Drive — trang Ảnh chung
 * ------------------------------
 * 1. Vào https://console.cloud.google.com → tạo project (hoặc dùng luôn project Firebase).
 * 2. APIs & Services → Library → bật "Google Drive API".
 * 3. APIs & Services → OAuth consent screen → External → điền tên app + email
 *    → phần "Test users" thêm email của anh và của bạn gái.
 * 4. APIs & Services → Credentials → Create Credentials → OAuth client ID
 *    → Application type: "Web application"
 *    → Authorized JavaScript origins: thêm CẢ HAI dòng
 *         http://localhost:8080
 *         https://<username>.github.io
 * 5. Copy "Client ID" dán vào dưới đây.
 *
 * Để trống -> trang Ảnh vẫn chạy, ảnh lưu ngay trong trình duyệt (chế độ offline).
 */
export const GOOGLE_CLIENT_ID = "";

/** Tên thư mục sẽ được tạo trong Google Drive của anh */
export const DRIVE_FOLDER_NAME = "Date Planner Photos";

/**
 * Nếu muốn dùng một thư mục Drive có sẵn thì dán ID của nó vào đây
 * (ID là đoạn trong URL: drive.google.com/drive/folders/<ID>).
 * Để trống -> app tự tạo thư mục theo DRIVE_FOLDER_NAME.
 * Lưu ý: với quyền drive.file, app chỉ thấy được file/thư mục do chính nó tạo ra.
 */
export const DRIVE_FOLDER_ID = "";

/**
 * true  -> ảnh sau khi upload được đặt "ai có link đều xem được"
 *          (bạn gái mở web là thấy ảnh ngay, không cần đăng nhập)
 * false -> ảnh riêng tư, chỉ tài khoản có quyền mới xem
 */
export const DRIVE_PUBLIC_LINK = true;
