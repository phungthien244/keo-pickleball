# pikeco.app – ghi chú làm việc

## Quy trình
- Làm trên nhánh `dev`, đẩy `dev` và `dev:demo` (bản thử demo.pikeco.pages.dev, dữ liệu giả: `?chu`, `?khach`, `?lam-lai`, `?zalo`).
- **Mặc định mỗi lần sửa (việc nhỏ): chỉ sửa → test → đẩy `dev` + `dev:demo` → gửi link demo để người dùng xem, rồi dừng.** Không đẩy `main`, không chép file sang máy người dùng, không nhắc `zmp deploy`. Gom dần các thay đổi cho tới khi người dùng nói "xuất bản".
  - Link demo web: https://demo.pikeco.pages.dev/aep · Mini App: https://demo.pikeco.pages.dev/mini?clb=aep (thêm `&nguoi=moi&moi=demo-ql&lam-lai` để vào vai quản lý). Đưa link thẳng tới trang vừa sửa nếu được.
  - Gọn: không chụp ảnh/không chờ CI cho việc nhỏ trừ khi cần tự kiểm; báo kết quả ngắn.
- Khi người dùng nói **"xuất bản"**: đẩy `dev:main`, chờ CI, chép tất cả file đã đổi kể từ lần xuất bản trước (`git diff --name-only <commit xuất bản trước>..dev` trong `src/`, `miniapp/`, `vite.parts.js`, `firebase.config.js`) sang máy, rồi nhắc chạy `zmp deploy`. Lần xuất bản gần nhất: commit `30683ba`.
- **"Xuất bản" = xuất bản cả web và Zalo Mini App:**
  1. Web: `git push origin dev:main` (Cloudflare Pages + CI deploy Firestore rules).
  2. Mini App (ID 180913816434821856, tên Pikeco): chép mã mới (`src/`, `vite.parts.js`, `firebase.config.js`, `miniapp/`) vào máy người dùng `C:\Users\LLG\pikeco\app` qua cầu nối thiết bị, rồi nhờ người dùng chạy trong PowerShell `cd $HOME\pikeco\app\miniapp; npx zmp deploy` chọn **Testing** (máy chủ zmp-api của Zalo không vào được từ môi trường cloud). Sau đó vào trang quản lý Mini App bấm Submit for review.
- `zmp login` lưu ZMP_TOKEN vào `.env` của thư mục đang chạy: không commit file `.env` có token.

## Mini App
- `miniapp/` dùng chung code `src/parts`; `window.ZMINI` bật chế độ Mini App, đường dẫn sau dấu `#`.
- Đăng nhập: `getUserID` → `/api/zalo-mini` → Firebase custom token `zalo_<HMAC>` (Zalo chặn máy chủ ngoài VN đọc thông tin người dùng).
  - **Không bao giờ đổi `ZALO_SECRET` trên Cloudflare**: mã tài khoản = HMAC(ZALO_SECRET, mã Zalo), đổi khoá là mọi người dùng Zalo thành tài khoản mới (đã xảy ra 10/2026). Máy còn phiên cũ tự gộp qua `old` ID token (lib/zmove.js), máy không còn phiên cũ thì mất liên kết.
- Trang quản lý: https://miniapp.zaloplatforms.com/miniapp/180913816434821856/
- Xem thử Mini App trên trình duyệt (dữ liệu giả, khung Zalo giả): https://demo.pikeco.pages.dev/mini?clb=aep — thêm `nguoi=moi` để đóng vai người dùng Zalo mới. Mở bằng trình duyệt tích hợp, đặt cỡ mobile, tự chụp màn hình để kiểm tra trước khi nhờ người dùng deploy.
