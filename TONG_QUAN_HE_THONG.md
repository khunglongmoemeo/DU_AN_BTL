# Tong quan he thong DU_AN_BTL

## Trang dang chay local

- Frontend: http://localhost:8000
- Trang login: http://localhost:8000/user/login
- Backend: http://localhost:5000
- Backend health: http://localhost:5000/api/database/health
- MariaDB/MySQL: localhost:3306

## Tai khoan mau

| Vai tro | Username | Password | Sau login |
| --- | --- | --- | --- |
| Quan ly | `manager01` | `manager123` | `/manager` |
| Sinh vien | `student01` | `student123` | `/student` |

## Cong nghe chinh

- Frontend: React 17, UmiJS 3, Ant Design 4, TypeScript.
- Backend: Express, TypeScript, `ts-node-dev`.
- Database: MariaDB/MySQL, database `student_management`.
- Auth: username/email + password, bcrypt hash, JWT token.
- Email reset password: Nodemailer/Gmail SMTP, can cau hinh rieng neu dung chuc nang quen mat khau.

## Cau truc thu muc quan trong

| Khu vuc | Duong dan | Ghi chu |
| --- | --- | --- |
| Cau hinh Umi | `config/config.ts`, `config/routes.ts` | Router frontend va cau hinh build/dev |
| Trang login/register | `src/frontend/pages/user` | Login, register, forgot/reset password |
| Trang quan ly | `src/frontend/pages/Manager` | Giao dien role manager |
| Trang sinh vien | `src/frontend/pages/Student` | Giao dien role student |
| Service auth frontend | `src/frontend/services/auth.ts` | Goi API backend |
| Backend entrypoint | `src/backend/index.ts` | Express server, route prefix |
| Route auth backend | `src/backend/routes/auth.routes.ts` | Login/register/forgot/reset password |
| Xu ly auth backend | `src/backend/services/auth.service.ts` | Bcrypt, JWT, truy van user |
| Cau hinh database | `src/backend/config/database.ts` | Pool MySQL theo bien `.env` |
| SQL khoi tao | `src/backend/database/init.sql` | Tao DB, roles, users mau |

## Cau hinh moi truong dang dung

File `.env` dat cac bien chinh:

```env
BACKEND_PORT=5000
DB_HOST=localhost
DB_PORT=3306
DB_USER=student_app
DB_PASSWORD=student_app_password
DB_NAME=student_management
JWT_SECRET=student_management_secret_key
```

Khong nen chia se thong tin Gmail SMTP/App Password trong `.env`.

## Cach chay lai tren may nay

Da cai dependency trong `node_modules` va da tai Node 16 portable tai `.runtime/node-v16.20.2-win-x64`.

Mo PowerShell tai thu muc du an:

```powershell
cd "C:\Users\ADMIN\OneDrive\Documents\TRUNG\DU_AN_BTL"
```

Chay MariaDB local:

```powershell
& "C:\Program Files\MariaDB 12.3\bin\mariadbd.exe" --defaults-file="C:\Users\ADMIN\OneDrive\Documents\TRUNG\DU_AN_BTL\.runtime\mariadb-data\my.ini"
```

Chay backend:

```powershell
$env:PATH = "C:\Users\ADMIN\OneDrive\Documents\TRUNG\DU_AN_BTL\.runtime\node-v16.20.2-win-x64;$env:PATH"
.\.runtime\node-v16.20.2-win-x64\npm.cmd run start:backend
```

Chay frontend:

```powershell
$env:PATH = "C:\Users\ADMIN\OneDrive\Documents\TRUNG\DU_AN_BTL\.runtime\node-v16.20.2-win-x64;$env:PATH"
.\.runtime\node-v16.20.2-win-x64\npm.cmd run start -- --port 8000
```

## Trang thai da kiem tra

- Frontend tra ve HTTP 200 tai `/user/login`.
- Backend tra ve health thanh cong: `Ket noi MySQL thanh cong`.
- API login thanh cong voi `manager01/manager123`.
- API login thanh cong voi `student01/student123`.

## Ghi chu ky thuat

- May ban dau khong co `git`, `npm`, `yarn`, `mysql` trong PATH; du an duoc tai ve tu GitHub bang ZIP.
- Node trong PATH bi Windows bao `Access is denied`, nen du an dang dung Node 16 portable trong `.runtime`.
- Da cai MariaDB 12.3 bang `winget` va khoi tao data local trong `.runtime/mariadb-data`.
- Da sua thu tu tao bang trong `src/backend/database/init.sql`: tao `users` truoc `password_reset_tokens` de foreign key hop le.
