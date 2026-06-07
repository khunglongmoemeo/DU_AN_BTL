-- Migration: Create chat_history and admin_online_status tables
-- These tables are used by the AI chat system

USE student_management;

-- ── Chat History (AI conversation storage) ─────────────────────────────────────
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

-- ── Admin Online Status (Socket tracking) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_online_status (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT NOT NULL UNIQUE,
    is_online BOOLEAN DEFAULT FALSE,
    last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
