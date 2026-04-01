# HR-Pro — Hệ thống quản lý chấm công & ca làm việc

HR-Pro là ứng dụng web hỗ trợ phòng nhân sự theo dõi dữ liệu chấm công, quản lý ca làm việc và tổng hợp bảng công theo tháng.

## Tính năng chính

- **Dashboard tổng quan**: xem nhanh số liệu chấm công, đi trễ/về sớm, vắng mặt.
- **Quản lý nhân viên**: thêm, sửa, xóa hồ sơ nhân sự.
- **Quản lý ca làm việc**: cấu hình khung giờ và quy tắc ca.
- **Lịch phân ca**: gán ca theo nhân sự và thời gian.
- **Quản lý đơn/chỉnh công**: theo dõi và xử lý các yêu cầu liên quan chấm công.
- **Quản lý ngày nghỉ lễ**: khai báo ngày nghỉ áp dụng toàn hệ thống.
- **Import dữ liệu chấm công**: nạp dữ liệu từ file để xử lý hàng loạt.
- **Raw data & Timesheet**: xem dữ liệu gốc và bảng công đã tính.

## Kiến trúc hiện tại

- **Frontend**: React + TypeScript + Vite.
- **Backend**: Express (đóng vai trò web server + mock API cơ bản).
- **Lưu trữ dữ liệu**: LocalStorage (phù hợp demo/POC).
- **Tính công**: xử lý tại frontend qua `attendanceEngine`.

> Lưu ý: cấu hình `USE_SERVER_API` đang để `false`, nên ứng dụng mặc định dùng LocalStorage để chạy demo.

## Yêu cầu môi trường

- Node.js **>= 18.0.0**
- npm (đi kèm Node.js)

## Cài đặt & chạy local

```bash
npm install
npm run dev
```

Sau khi chạy, mở trình duyệt tại:

- `http://localhost:3000`

## Tài khoản đăng nhập mặc định

- **Username:** `admin`
- **Password:** `admin123`

> Khuyến nghị đổi cơ chế xác thực trước khi đưa vào môi trường production.

## Scripts

- `npm run dev`: chạy server local (Express)
- `npm start`: chạy ứng dụng ở chế độ production-like

## Cấu trúc thư mục chính

```text
.
├── components/          # Các màn hình/chức năng UI
├── services/            # Tầng truy cập dữ liệu (LocalStorage/API)
├── utils/               # Hàm xử lý nghiệp vụ (tính công, date utils)
├── App.tsx              # Layout + điều hướng + state chính
├── server.js            # Express server + static hosting
├── constants.ts         # Dữ liệu mẫu ban đầu
├── types.ts             # Kiểu dữ liệu TypeScript
└── render.yaml          # Cấu hình deploy Render
```

## API hiện có (mock)

- `GET /api/v1/health`: kiểm tra trạng thái server
- `GET /api/v1/employees`: endpoint mẫu (chưa kết nối DB thực)

## Triển khai

Repository đã có `render.yaml` để deploy lên Render:

- Build command: `npm install`
- Start command: `npm start`
- Node version: `18.17.0`

Bạn có thể import repo vào Render và dùng cấu hình sẵn trong file này.

## Hướng phát triển tiếp theo

1. Chuyển từ LocalStorage sang database thực (PostgreSQL/MySQL).
2. Bật `USE_SERVER_API=true` và hoàn thiện API CRUD.
3. Bổ sung RBAC (Admin/HR/Manager/Nhân viên).
4. Thêm test tự động (unit + integration).
5. Bổ sung CI/CD và tách môi trường dev/staging/prod.

---

Nếu bạn muốn, mình có thể viết tiếp:

- README phiên bản **developer-focused** (chi tiết kiến trúc, flow dữ liệu, conventions), hoặc
- README phiên bản **end-user/manual** cho bộ phận HR vận hành hằng ngày.
