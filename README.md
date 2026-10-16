# pikeco.app

Web app quản lý CLB pickleball: xếp sân xoay cặp, giải cặp cố định, rating kiểu DUPR, quỹ và giải thưởng, nhiều CLB trên một nền tảng.

## Cấu trúc

| Đường dẫn | Nội dung |
|---|---|
| `index.html` | Khung trang (splash, đầu trang, tab) |
| `src/styles/app.css` | Toàn bộ giao diện |
| `src/firebase.js` | Khởi tạo Firebase, chọn `prod` hoặc `dev` theo nhánh |
| `src/parts/*.js` | Code app, nối theo thứ tự tên file thành một module |
| `src/mock/firebase-mock.js` | Firebase giả có dữ liệu mẫu, cho `npm run dev:mock` |
| `firestore.rules` | Rules bảo mật, tự đưa lên Firebase khi gộp vào `main` |
| `tests/*.test.js` | Test luồng app (xoay cặp, giải, tiền, CLB, nền tảng) |
| `tests/rules/` | Test rules, chạy bằng Firestore emulator trên GitHub Actions |

## Lệnh

```
npm run dev:mock   # chạy thử với dữ liệu giả
npm test           # test app
npm run test:rules # test rules (cần Java + emulator)
npm run build      # build, Cloudflare Pages chạy npm run cf:build
```

## Quy trình

1. Sửa trên nhánh `dev` → GitHub Actions chạy test → Cloudflare Pages tạo link xem thử dùng Firebase `dev`.
2. Thử trên điện thoại, nhắn "xuất bản" → gộp `dev` vào `main` → pikeco.app cập nhật, rules tự đưa lên Firebase thật.
3. Lỗi thì quay lại bản trước trong Cloudflare Pages → Deployments.
