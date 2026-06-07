# Routes và Cách Chạy Dự Án

## 1. Tổng quan nhanh

Hệ thống gồm 3 phần chính:

- Frontend UmiJS/React chạy tại `http://localhost:8000`
- Backend Express/TypeScript chạy tại `http://localhost:5000`
- Database MySQL/MariaDB dùng schema trong `src/backend/database/init.sql`

Thư mục chính:

- Frontend route config: [config/routes.ts](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/config/routes.ts)
- Backend entry: [src/backend/index.ts](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/src/backend/index.ts)
- Backend routes auth: [src/backend/routes/auth.routes.ts](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/src/backend/routes/auth.routes.ts)
- Backend routes admission: [src/backend/routes/admission.routes.ts](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/src/backend/routes/admission.routes.ts)
- Trang student: [src/frontend/pages/Student/index.tsx](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/src/frontend/pages/Student/index.tsx)

## 2. Cách chạy dự án local

### Bước 1: cài dependencies

Trong thư mục dự án:

```powershell
npm install
```

Nếu máy không nhận `npm` trong `PATH`, dùng Node/npm đang có sẵn trên máy hoặc terminal đã cài Node.js.

### Bước 2: chuẩn bị database

Tạo database MySQL/MariaDB, sau đó import file:

```text
src/backend/database/init.sql
```

Sau khi import xong, hệ thống sẽ có sẵn dữ liệu mẫu để đăng nhập.

### Bước 3: chạy backend

```powershell
npm run start:backend
```

Backend mặc định chạy ở:

- `http://localhost:5000`

### Bước 4: chạy frontend

Mở terminal khác:

```powershell
npm run start:dev
```

Frontend mặc định chạy ở:

- `http://localhost:8000`

### Bước 5: mở hệ thống

Mở trình duyệt:

- `http://localhost:8000/user/login`

## 3. Tài khoản mẫu

### Student

- Username: `student01`
- Password: `student123`

### Manager

- Username: `manager01`
- Password: `manager123`

## 4. Frontend routes

Theo [config/routes.ts](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/config/routes.ts):

- `/user/login`: trang đăng nhập
- `/user/register`: trang đăng ký
- `/user/forgot-password`: quên mật khẩu
- `/user/reset-password`: đặt lại mật khẩu
- `/manager`: màn hình manager
- `/student`: màn hình hồ sơ tuyển sinh của student
- `/`: redirect về `/user/login`

## 5. Backend routes

Backend base URL:

- `http://localhost:5000`

### 5.1. Health check database

- `GET /api/database/health`

Mục đích:

- Kiểm tra backend có kết nối được database hay không.

### 5.2. Auth routes

Base:

- `/api/auth`

Danh sách route:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

Mục đích:

- đăng ký tài khoản
- đăng nhập lấy token
- gửi yêu cầu quên mật khẩu
- đặt lại mật khẩu

### 5.3. Admission routes

Base:

- `/api/admission`

Các route student:

- `GET /api/admission/me`
- `PUT /api/admission/personal-info`
- `PUT /api/admission/documents`
- `POST /api/admission/documents/upload`
- `PUT /api/admission/academic-info`
- `PUT /api/admission/wishes`
- `POST /api/admission/submit`

Các route manager:

- `GET /api/admission/manager/applications`
- `GET /api/admission/manager/applications/:id`
- `PATCH /api/admission/manager/applications/:id/status`

Lưu ý:

- toàn bộ route `/api/admission/*` cần token đăng nhập
- file upload được public qua:
  - `/uploads/...`

## 6. Luồng chạy chức năng student

Sau khi đăng nhập student thành công, vào:

- `http://localhost:8000/student`

Luồng gồm 5 bước:

### Bước 1: Thông tin cá nhân

Lưu bằng:

- `PUT /api/admission/personal-info`

Thông tin chính:

- họ tên
- ngày sinh
- giới tính
- dân tộc
- tôn giáo
- nơi sinh
- số điện thoại
- số CCCD
- địa chỉ thường trú

### Bước 2: Hồ sơ minh chứng

Upload file bằng:

- `POST /api/admission/documents/upload`

Lưu danh sách file vào hồ sơ bằng:

- `PUT /api/admission/documents`

3 minh chứng bắt buộc:

- CCCD mặt trước
- CCCD mặt sau
- Ảnh chân dung

### Bước 3: Thông tin học tập

Lưu bằng:

- `PUT /api/admission/academic-info`

Thông tin chính:

- năm tốt nghiệp
- học lực lớp 12
- hạnh kiểm lớp 12
- số báo danh thi tốt nghiệp THPT
- trường lớp 10, 11, 12
- khu vực ưu tiên
- đối tượng ưu tiên

### Bước 4: Nguyện vọng xét tuyển

Lưu bằng:

- `PUT /api/admission/wishes`

Thông tin chính:

- trường
- ngành
- tổ hợp
- thứ tự nguyện vọng

### Bước 5: Xác nhận và nộp hồ sơ

Lấy tổng hồ sơ:

- `GET /api/admission/me`

Nộp hồ sơ:

- `POST /api/admission/submit`

Điều kiện để nộp thành công:

- đã tick xác nhận thông tin chính xác
- đã hoàn thiện thông tin cá nhân
- đã tải đủ 3 minh chứng
- đã hoàn thiện thông tin học tập
- đã có ít nhất 1 nguyện vọng

## 7. Luồng manager

Đăng nhập manager rồi vào:

- `http://localhost:8000/manager`

Manager có thể:

- xem danh sách hồ sơ
- xem chi tiết hồ sơ theo `id`
- duyệt hoặc từ chối hồ sơ

Route dùng:

- `GET /api/admission/manager/applications`
- `GET /api/admission/manager/applications/:id`
- `PATCH /api/admission/manager/applications/:id/status`

## 8. Thứ tự kiểm tra khi hệ thống không chạy

### Kiểm tra frontend

- mở `http://localhost:8000/user/login`

### Kiểm tra backend

- mở `http://localhost:5000/`

Kỳ vọng:

```json
{
  "message": "Backend server đang chạy"
}
```

### Kiểm tra database

- mở `http://localhost:5000/api/database/health`

Nếu route này lỗi, cần kiểm tra:

- database đã chạy chưa
- config kết nối DB
- dữ liệu trong `init.sql` đã import chưa

## 9. Ghi chú thêm

- Nếu build frontend lỗi do Node/OpenSSL, có thể chạy với:

```powershell
$env:NODE_OPTIONS='--openssl-legacy-provider'
```

- File upload admission được lưu tại:

```text
src/backend/uploads/admission
```

- Muốn xem lại logic chính của luồng tuyển sinh, đọc thêm:
  - [src/backend/services/admission.service.ts](/C:/Users/ADMIN/OneDrive/Documents/TRUNG/DU_AN_BTL/src/backend/services/admission.service.ts)
