CREATE DATABASE IF NOT EXISTS student_management
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'student_app'@'localhost' IDENTIFIED BY 'student_app_password';
GRANT ALL PRIVILEGES ON student_management.* TO 'student_app'@'localhost';
FLUSH PRIVILEGES;

USE student_management;

-- =========================================================================
-- 1. DROP TABLES THEO THỨ TỰ TỪ NGOÀI VÀO TRONG (TRÁNH LỖI PHỤ THUỘC KHÓA NGOẠI)
-- =========================================================================
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS email_logs;
DROP TABLE IF EXISTS admission_wishes;
DROP TABLE IF EXISTS admission_applications;
DROP TABLE IF EXISTS applications;
DROP TABLE IF EXISTS profiles;
DROP TABLE IF EXISTS potential_students;
DROP TABLE IF EXISTS admin_online_status;
DROP TABLE IF EXISTS chat_history;
DROP TABLE IF EXISTS major_combinations;
DROP TABLE IF EXISTS combinations;
DROP TABLE IF EXISTS majors;
DROP TABLE IF EXISTS universities;
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================================
-- 2. KHỞI TẠO CÁC BẢNG HỆ THỐNG & NGƯỜI DÙNG (Cốt lõi từ init (1).sql)
-- =========================================================================
CREATE TABLE roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role_id INT NOT NULL,
    student_code VARCHAR(50) NULL UNIQUE,
    phone VARCHAR(20) NULL,
    avatar VARCHAR(255) NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_users_roles FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE password_reset_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_password_reset_tokens_users FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_is_active ON users(is_active);
CREATE INDEX idx_users_username_email ON users(username, email);

-- =========================================================================
-- 3. KHỞI TẠO CÁC BẢNG DANH MỤC TRƯỜNG, NGÀNH, KHỐI (Từ migrate_phan3.sql)
-- =========================================================================
CREATE TABLE universities (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(10) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE majors (
    id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    UNIQUE (university_id, code),
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combinations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(5) NOT NULL UNIQUE,
    subject_names VARCHAR(255) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE major_combinations (
    major_id INT NOT NULL,
    combination_id INT NOT NULL,
    PRIMARY KEY (major_id, combination_id),
    FOREIGN KEY (major_id) REFERENCES majors(id) ON DELETE CASCADE,
    FOREIGN KEY (combination_id) REFERENCES combinations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 4. KHỞI TẠO CÁC BẢNG NGHIỆP VỤ HỒ SƠ & XÉT TUYỂN (Kiến trúc mới từ phần 3)
-- =========================================================================
CREATE TABLE profiles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    full_name VARCHAR(100) DEFAULT NULL,
    dob DATE DEFAULT NULL,
    gender ENUM('MALE','FEMALE','OTHER') DEFAULT NULL,
    ethnicity VARCHAR(50) DEFAULT NULL,
    religion VARCHAR(50) DEFAULT NULL,
    pob VARCHAR(100) DEFAULT NULL,
    phone VARCHAR(20) UNIQUE DEFAULT NULL,
    cccd_number VARCHAR(20) UNIQUE DEFAULT NULL,
    permanent_address TEXT DEFAULT NULL,
    high_school_info JSON DEFAULT NULL,
    priority_area ENUM('KV1','KV2-NT','KV2','KV3') DEFAULT NULL,
    priority_object ENUM('UT1','UT2') DEFAULT NULL,
    cccd_front_url VARCHAR(255) DEFAULT NULL,
    cccd_back_url VARCHAR(255) DEFAULT NULL,
    avatar_url VARCHAR(255) DEFAULT NULL,
    score_subject_1 DECIMAL(4,2) DEFAULT NULL,
    score_subject_2 DECIMAL(4,2) DEFAULT NULL,
    score_subject_3 DECIMAL(4,2) DEFAULT NULL,
    total_score DECIMAL(5,2) DEFAULT NULL,
    priority_score DECIMAL(4,2) DEFAULT NULL,
    final_score DECIMAL(5,2) DEFAULT NULL,
    status ENUM('DRAFT','PENDING','APPROVED','REJECTED') DEFAULT 'DRAFT',
    reject_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    university_id INT NOT NULL,
    major_id INT NOT NULL,
    combination_id INT NOT NULL,
    priority_order INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (profile_id, priority_order),
    UNIQUE (profile_id, university_id, major_id),
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE,
    FOREIGN KEY (university_id) REFERENCES universities(id),
    FOREIGN KEY (major_id) REFERENCES majors(id),
    FOREIGN KEY (combination_id) REFERENCES combinations(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE email_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    profile_id INT NOT NULL,
    email_type ENUM('SUBMIT_SUCCESS','STATUS_CHANGED') NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 5. BẢNG HỒ SƠ TUYỂN SINH (Đăng ký online của sinh viên)
-- =========================================================================
CREATE TABLE IF NOT EXISTS admission_applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    status ENUM('draft','submitted','reviewing','approved','rejected','needs_revision') DEFAULT 'draft',
    personal_info JSON DEFAULT NULL,
    academic_info JSON DEFAULT NULL,
    documents_info JSON DEFAULT NULL,
    confirmation_checked TINYINT(1) DEFAULT 0,
    submitted_at TIMESTAMP NULL DEFAULT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    rejection_reason TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admission_wishes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    application_id INT NOT NULL,
    priority_order INT NOT NULL,
    school_name VARCHAR(255) NOT NULL,
    major_name VARCHAR(255) NOT NULL,
    subject_group VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES admission_applications(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 6. BẢNG THÍ SINH TIỀM NĂNG (AI trích xuất từ chat)
-- =========================================================================
CREATE TABLE IF NOT EXISTS potential_students (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) DEFAULT NULL,
    user_id INT DEFAULT NULL,
    student_name VARCHAR(255) DEFAULT NULL,
    score DECIMAL(5,2) DEFAULT NULL,
    subject_group VARCHAR(50) DEFAULT NULL,
    target_major VARCHAR(255) DEFAULT NULL,
    phone VARCHAR(20) DEFAULT NULL,
    email VARCHAR(100) DEFAULT NULL,
    notes TEXT DEFAULT NULL,
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by INT DEFAULT NULL,
    reviewed_at TIMESTAMP NULL DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_reviewed (reviewed),
    INDEX idx_created (created_at),
    INDEX idx_session (session_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 7. BẢNG CHAT AI (Lịch sử hội thoại & Online status)
-- =========================================================================
CREATE TABLE IF NOT EXISTS chat_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    session_id VARCHAR(100) NOT NULL,
    user_id INT DEFAULT NULL,
    role ENUM('user','assistant','admin','system') NOT NULL,
    content TEXT NOT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_session (session_id),
    INDEX idx_user (user_id),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_online_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL UNIQUE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================================================================
-- 8. BẢNG ĐIỂM CHUẨN TUYỂN SINH
-- =========================================================================
CREATE TABLE IF NOT EXISTS cutoff_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    university_id INT NOT NULL,
    combination_id INT NOT NULL,
    year INT NOT NULL DEFAULT 2026,
    score DECIMAL(4,2) NOT NULL,
    notes VARCHAR(255) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_cutoff (university_id, combination_id, year),
    FOREIGN KEY (university_id) REFERENCES universities(id) ON DELETE CASCADE,
    FOREIGN KEY (combination_id) REFERENCES combinations(id) ON DELETE CASCADE,
    INDEX idx_cutoff_year (year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Chèn dữ liệu điểm chuẩn mẫu năm 2026 (dùng subquery để không phụ thuộc ID)
INSERT INTO cutoff_scores (university_id, combination_id, year, score, notes)
SELECT u.id, c.id, 2026, cs.score, cs.notes FROM
(SELECT 'BKH' AS university_code, 'A00' AS combination_code, 27.75 AS score, 'Khối A00 - Toán, Lý, Hóa' AS notes UNION ALL
 SELECT 'BKH', 'A01', 28.00, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'BKH', 'D01', 29.00, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'BKH', 'C00', 27.00, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'NEU', 'D01', 26.50, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'NEU', 'C00', 26.00, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'NEU', 'A00', 27.00, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'VNU', 'A00', 28.25, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'VNU', 'A01', 27.75, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'VNU', 'D01', 28.00, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'VNU', 'C00', 27.00, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'FTU', 'D01', 27.50, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'FTU', 'C00', 27.00, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'FTU', 'A00', 28.00, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'PTIT', 'A00', 27.75, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'PTIT', 'A01', 27.50, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'PTIT', 'D01', 28.00, 'Khối D01 - Toán, Văn, Anh') AS cs
JOIN universities u ON u.code = cs.university_code
JOIN combinations c ON c.code = cs.combination_code;

-- Chèn dữ liệu điểm chuẩn năm 2025
INSERT INTO cutoff_scores (university_id, combination_id, year, score, notes)
SELECT u.id, c.id, 2025, cs.score, cs.notes FROM
(SELECT 'BKH' AS university_code, 'A00' AS combination_code, 27.50 AS score, 'Khối A00 - Toán, Lý, Hóa' AS notes UNION ALL
 SELECT 'BKH', 'A01', 27.75, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'BKH', 'D01', 28.50, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'BKH', 'C00', 26.75, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'NEU', 'D01', 26.25, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'NEU', 'C00', 25.75, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'NEU', 'A00', 26.50, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'VNU', 'A00', 27.75, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'VNU', 'A01', 27.50, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'VNU', 'D01', 27.50, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'VNU', 'C00', 26.50, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'FTU', 'D01', 27.00, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'FTU', 'C00', 26.50, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'FTU', 'A00', 27.25, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'PTIT', 'A00', 27.25, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'PTIT', 'A01', 27.00, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'PTIT', 'D01', 27.50, 'Khối D01 - Toán, Văn, Anh') AS cs
JOIN universities u ON u.code = cs.university_code
JOIN combinations c ON c.code = cs.combination_code;

-- Chèn dữ liệu điểm chuẩn năm 2024
INSERT INTO cutoff_scores (university_id, combination_id, year, score, notes)
SELECT u.id, c.id, 2024, cs.score, cs.notes FROM
(SELECT 'BKH' AS university_code, 'A00' AS combination_code, 27.00 AS score, 'Khối A00 - Toán, Lý, Hóa' AS notes UNION ALL
 SELECT 'BKH', 'A01', 27.25, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'BKH', 'D01', 28.00, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'BKH', 'C00', 26.25, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'NEU', 'D01', 25.75, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'NEU', 'C00', 25.25, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'NEU', 'A00', 26.00, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'VNU', 'A00', 27.25, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'VNU', 'A01', 27.00, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'VNU', 'D01', 27.00, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'VNU', 'C00', 26.00, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'FTU', 'D01', 26.50, 'Khối D01 - Toán, Văn, Anh' UNION ALL
 SELECT 'FTU', 'C00', 26.00, 'Khối C00 - Văn, Sử, Địa' UNION ALL
 SELECT 'FTU', 'A00', 26.75, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'PTIT', 'A00', 26.75, 'Khối A00 - Toán, Lý, Hóa' UNION ALL
 SELECT 'PTIT', 'A01', 26.50, 'Khối A01 - Toán, Lý, Anh' UNION ALL
 SELECT 'PTIT', 'D01', 27.00, 'Khối D01 - Toán, Văn, Anh') AS cs
JOIN universities u ON u.code = cs.university_code
JOIN combinations c ON c.code = cs.combination_code;

-- =========================================================================
-- 9. CHÈN DỮ LIỆU MẪU (MOCK DATA)
-- =========================================================================

-- Vai trò & Tài khoản
INSERT INTO roles (name, description) VALUES
    ('manager', 'Tài khoản quản lý'),
    ('student', 'Tài khoản sinh viên');

INSERT INTO users (full_name, email, username, password_hash, role_id, student_code, phone) VALUES
    ('Nguyễn Văn Quản Lý', 'manager@example.com', 'manager01', '$2b$10$8IaJ8Wec9f/XLHfdLMMvu.BWbF18KTx110RxxBKzir1kK0OF5up5W', (SELECT id FROM roles WHERE name = 'manager'), NULL, '0987654321'),
    ('Nguyễn Văn Sinh Viên', 'student@example.com', 'student01', '$2b$10$7rYi61beqlsXPQFXx4DMmOD8pjKdvRBwsCT.JGCiVi7fEC4X1QPFu', (SELECT id FROM roles WHERE name = 'student'), 'SV001', '0123456789');

-- Danh mục Trường đại học
INSERT INTO universities (code, name) VALUES
    ('BKH','Trường Đại học Bách Khoa Hà Nội'),
    ('NEU','Trường Đại học Kinh tế Quốc dân'),
    ('VNU','Trường Đại học Quốc gia Hà Nội'),
    ('FTU','Trường Đại học Ngoại thương'),
    ('PTIT','Học viện Công nghệ Bưu chính Viễn thông');

-- Danh mục Tổ hợp xét tuyển
INSERT INTO combinations (code, subject_names) VALUES
    ('A00','Toán, Vật lý, Hóa học'),
    ('A01','Toán, Vật lý, Tiếng Anh'),
    ('D01','Toán, Văn, Tiếng Anh'),
    ('C00','Văn, Sử, Địa'),
    ('B00','Toán, Hóa, Sinh');

-- Danh mục Ngành học
INSERT INTO majors (university_id, code, name) VALUES
    (1,'CNTT','Công nghệ thông tin'),
    (1,'DTVT','Điện tử viễn thông'),
    (1,'KTCK','Kỹ thuật cơ khí'),
    (2,'QTKD','Quản trị kinh doanh'),
    (2,'KT','Kế toán'),
    (3,'LUAT','Luật'),
    (4,'KTE','Kinh tế đối ngoại'),
    (5,'CNTT','Công nghệ thông tin'),
    (5,'ATTT','An toàn thông tin');

-- Tổ hợp được chấp nhận cho từng ngành
INSERT INTO major_combinations (major_id, combination_id) VALUES
    (1,1),(1,2),(2,1),(2,2),(3,1),(4,3),(4,1),(5,1),(5,3),(6,3),(7,3),(7,1),(8,1),(8,2),(9,1),(9,2);

-- Hồ sơ thí sinh mẫu (Liên kết trực tiếp tới tài khoản student01)
INSERT INTO profiles (user_id, full_name, dob, gender, cccd_number, phone, permanent_address, priority_area, priority_object, score_subject_1, score_subject_2, score_subject_3, total_score, priority_score, final_score, status, reject_reason, cccd_front_url, cccd_back_url, avatar_url)
SELECT u.id, 'Nguyễn Văn Sinh Viên', '2006-05-15', 'MALE', '001234567890', '0123456789',
'123 Đường Lê Lợi, Quận 1, TP.HCM', 'KV1', 'UT2',
8.5, 7.0, 9.0, 24.5, 0.5, 25.0, 'PENDING', NULL,
'/uploads/cccd_front.jpg', '/uploads/cccd_back.jpg', '/uploads/avatar.jpg'
FROM users u WHERE u.username='student01';

-- =========================================================================
-- 10. KIỂM TRA DỮ LIỆU SAU KHI KHỞI TẠO
-- =========================================================================
SELECT users.id, users.full_name, users.email, users.username, roles.name AS role, users.is_active
FROM users JOIN roles ON users.role_id = roles.id;