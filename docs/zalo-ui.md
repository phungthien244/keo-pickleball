# Chuẩn giao diện Mini App: theo Zalo (ZaUI)

Mọi màn mới hoặc sửa lại của Mini App phải theo chuẩn này (người dùng duyệt 12/11/2026).
Thông số lấy từ thư viện giao diện chính thức của Zalo Mini App (zmp-ui 1.11, `zaui.css`).
Bản vẽ mẫu: canvas, trang "Mini App theo chuẩn Zalo (đề xuất)" (Z01–Z07).
Bản web sẽ thành trang giới thiệu app, không cần giữ giao diện cũ.

## Màu (biến trong `src/styles/app.css`)
| Dùng cho | Màu | Biến |
|---|---|---|
| Nút chính, tab đang chọn, liên kết | `#006af5` | `--blue` |
| Nút chính khi nhấn | `#0250b6` | `--blue-p` |
| Nút phụ, ô đang chọn (nền), chữ xanh | `#d6e9ff` | `--blue-s` |
| Chữ | `#141415` | `--ink` |
| Chữ phụ, tab chưa chọn | `#767a7f` | `--muted` |
| Nền giữa các khối trắng | `#e9ebed` | `--bg` |
| Đường kẻ | `#e9ebed` / `#d6d9dc` | `--line` / `--line-2` |
| Xoá, huỷ, số tin mới | `#dc1f18` | `--red` |

Một màu hành động duy nhất là xanh Zalo. Không dùng navy, vàng, xanh lá cho nút.
Màu nhãn loại (nền nhạt + chữ đậm cùng tông): Social xanh lá `#e3f6ea/#1c7a3f`, Mini game tím `#efe9fb/#5b35b1`, Giải cam `#fff0e0/#a64b00`.

## Chữ
- Font của máy (`-apple-system, system-ui, Roboto…`), không tải font ngoài.
- Cỡ: tiêu đề trang con 20 · thanh tiêu đề 18 · tên mục, nút 16 · nội dung 15 · dòng phụ 14 · nhãn thanh tab 12. Nhỏ nhất 12.
- Đậm vừa 500. Chỉ số lớn (≥22px) mới 700.
- **Không IN HOA, không giãn chữ.** Viết kiểu câu: "Đăng ký ngay", không "ĐĂNG KÝ NGAY". Giữ chữ viết tắt: CLB, BTC, VĐV, QR, AI, KO.

## Kích thước
| Thành phần | Thông số |
|---|---|
| Thanh tiêu đề | cao 44 (+ thanh trạng thái), nền trắng, tiêu đề trái, nút ‹ |
| Thanh tab dưới | cao 48, biểu tượng 24 + chữ 12, không có nút nổi |
| Nút lớn / vừa / nhỏ | cao 48 / 40 / 32, bo tròn hẳn (48) |
| Ô nhập | cao 48, bo 8, viền `#b9bdc1`, chữ 16 |
| Hàng danh sách | đệm 16, ảnh 48, chữ 16 + dòng phụ 14, › bên phải |
| Khối nội dung | trắng, bo 8, không viền, cách nhau 8 |
| Bảng trượt | bo trên 16, tiêu đề 48 (chữ 20 giữa), nền tối 70% |
| Hộp thoại | bo 12, cách mép 32, tiêu đề 20 giữa |
| Thông báo | nền `#252627`, bo 8, dưới đáy |
| Vùng bấm | tối thiểu 44 × 44 |

## Hiệu ứng
- Nhấn: nền đậm hơn (`#006af5 → #0250b6`, thẻ trắng → `#f1f3f5`). Không thu nhỏ (`scale`).
- Bảng trượt: trượt lên từ đáy. Thông báo: hiện 150ms, tự tắt sau 3 giây.
- Đang lưu: nút khoá + vòng xoay, không bấm lại được.

## Thao tác
1. Trang gốc (5 tab Tìm · Lịch · Tạo · Tin · Tôi) có thanh tab; trang con ẩn thanh tab, có nút ‹ quay lại.
2. Mỗi màn chỉ một nút chính xanh, đặt dưới đáy.
3. Xoá, huỷ, hoàn tiền: hộp thoại hỏi lại, nói rõ hậu quả, nút đỏ. Không dùng kiểu "bấm 2 lần".
4. Việc nhỏ (chọn trình, ghi đã nhận tiền, xác nhận đăng ký): bảng trượt, không sang trang mới.
5. Danh sách theo kiểu danh bạ Zalo: ảnh trái, tên, dòng phụ, › bên phải.
6. Biểu tượng nét mảnh (SVG), không dùng emoji làm biểu tượng.
7. Chia sẻ dùng bảng chia sẻ của Zalo; nhắn tin mở thẳng khung chat Zalo.
8. Người quản lý dùng chung 5 tab với người chơi.
