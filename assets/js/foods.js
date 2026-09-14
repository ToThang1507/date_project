/* ============================================================
   DANH SÁCH MÓN ĂN — thoải mái thêm/bớt ở đây
   { emoji, name, cat }
   ============================================================ */

export const CATEGORIES = [
  { id: "all",     label: "🌈 Tất cả" },
  { id: "vn",      label: "🇻🇳 Món Việt" },
  { id: "asian",   label: "🍣 Châu Á" },
  { id: "western", label: "🍕 Âu Mỹ" },
  { id: "hotpot",  label: "🍲 Lẩu & Nướng" },
  { id: "street",  label: "🍢 Ăn vặt" },
  { id: "dessert", label: "🍰 Tráng miệng" },
  { id: "drink",   label: "🧋 Đồ uống" }
];

export const FOODS = [
  // --- Món Việt ---
  { emoji: "🍜", name: "Phở bò",          cat: "vn" },
  { emoji: "🍲", name: "Bún bò Huế",      cat: "vn" },
  { emoji: "🥖", name: "Bánh mì",         cat: "vn" },
  { emoji: "🍚", name: "Cơm tấm",         cat: "vn" },
  { emoji: "🍝", name: "Bún chả",         cat: "vn" },
  { emoji: "🥗", name: "Bún đậu mắm tôm", cat: "vn" },
  { emoji: "🍤", name: "Bánh xèo",        cat: "vn" },
  { emoji: "🍥", name: "Bánh cuốn",       cat: "vn" },
  { emoji: "🍛", name: "Cơm gà Hội An",   cat: "vn" },
  { emoji: "🦐", name: "Bún riêu cua",    cat: "vn" },
  { emoji: "🥘", name: "Cà ri gà",        cat: "vn" },
  { emoji: "🍢", name: "Nem nướng",       cat: "vn" },

  // --- Châu Á ---
  { emoji: "🍣", name: "Sushi",           cat: "asian" },
  { emoji: "🍱", name: "Cơm bento",       cat: "asian" },
  { emoji: "🍛", name: "Cà ri Nhật",      cat: "asian" },
  { emoji: "🍜", name: "Ramen",           cat: "asian" },
  { emoji: "🥟", name: "Dimsum",          cat: "asian" },
  { emoji: "🍚", name: "Cơm trộn Hàn",    cat: "asian" },
  { emoji: "🌶️", name: "Mì cay",          cat: "asian" },
  { emoji: "🥢", name: "Mì Quảng",        cat: "asian" },
  { emoji: "🍲", name: "Tokbokki",        cat: "asian" },
  { emoji: "🍤", name: "Tempura",         cat: "asian" },

  // --- Âu Mỹ ---
  { emoji: "🍕", name: "Pizza",           cat: "western" },
  { emoji: "🍔", name: "Burger",          cat: "western" },
  { emoji: "🍝", name: "Mì Ý",            cat: "western" },
  { emoji: "🥩", name: "Bít tết",         cat: "western" },
  { emoji: "🌮", name: "Taco",            cat: "western" },
  { emoji: "🥪", name: "Sandwich",        cat: "western" },
  { emoji: "🍗", name: "Gà rán",          cat: "western" },
  { emoji: "🥗", name: "Salad healthy",   cat: "western" },
  { emoji: "🍟", name: "Khoai tây chiên", cat: "western" },

  // --- Lẩu & Nướng ---
  { emoji: "🍲", name: "Lẩu thái",        cat: "hotpot" },
  { emoji: "🔥", name: "Lẩu nấm",         cat: "hotpot" },
  { emoji: "🥩", name: "BBQ Hàn Quốc",    cat: "hotpot" },
  { emoji: "🍖", name: "Nướng ngói",      cat: "hotpot" },
  { emoji: "🦑", name: "Hải sản nướng",   cat: "hotpot" },
  { emoji: "🍢", name: "Buffet nướng",    cat: "hotpot" },
  { emoji: "🐟", name: "Lẩu cá kèo",      cat: "hotpot" },

  // --- Ăn vặt ---
  { emoji: "🍢", name: "Cá viên chiên",   cat: "street" },
  { emoji: "🌽", name: "Bắp xào",         cat: "street" },
  { emoji: "🥟", name: "Bánh tráng trộn", cat: "street" },
  { emoji: "🍡", name: "Chè khúc bạch",   cat: "street" },
  { emoji: "🥚", name: "Trứng cút lộn",   cat: "street" },
  { emoji: "🐌", name: "Ốc các loại",     cat: "street" },
  { emoji: "🍠", name: "Khoai lang nướng",cat: "street" },

  // --- Tráng miệng ---
  { emoji: "🍰", name: "Bánh kem",        cat: "dessert" },
  { emoji: "🍦", name: "Kem tươi",        cat: "dessert" },
  { emoji: "🧁", name: "Cupcake",         cat: "dessert" },
  { emoji: "🍮", name: "Bánh flan",       cat: "dessert" },
  { emoji: "🥞", name: "Pancake",         cat: "dessert" },
  { emoji: "🍩", name: "Donut",           cat: "dessert" },
  { emoji: "🍧", name: "Bingsu",          cat: "dessert" },
  { emoji: "🍫", name: "Chocolate lava",  cat: "dessert" },

  // --- Đồ uống ---
  { emoji: "🧋", name: "Trà sữa",         cat: "drink" },
  { emoji: "☕", name: "Cà phê sữa đá",   cat: "drink" },
  { emoji: "🍵", name: "Trà đào",         cat: "drink" },
  { emoji: "🥤", name: "Nước ép",         cat: "drink" },
  { emoji: "🧃", name: "Sinh tố bơ",      cat: "drink" },
  { emoji: "🍹", name: "Mocktail",        cat: "drink" },
  { emoji: "🥥", name: "Nước dừa",        cat: "drink" }
];
