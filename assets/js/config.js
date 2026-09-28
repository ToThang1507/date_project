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
  apiKey: "",
  authDomain: "",
  projectId: "",
  storageBucket: "",
  messagingSenderId: "",
  appId: ""
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
 * Trang chủ "Our Time"
 * --------------------
 * Ngày bắt đầu yêu (YYYY-MM-DD), cố định — muốn đổi thì sửa ở đây.
 * Ảnh & ghi chú trên trang chủ được lưu vào Firestore (nếu đã cấu hình ở trên)
 * trong các collection: board_items, board_images, board_meta.
 */
export const START_DATE = "2026-09-26";
