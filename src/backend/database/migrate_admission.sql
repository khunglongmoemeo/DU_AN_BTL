-- Migration: Create admission_applications and admission_wishes tables
-- These tables store student admission applications (multi-step form data)

USE student_management;

-- ── Admission Applications ──────────────────────────────────────────────────
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

-- ── Admission Wishes (Nguyện vọng xét tuyển) ──────────────────────────────
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

-- ── Indexes ───────────────────────────────────────────────────────────────
CREATE INDEX idx_admission_user ON admission_applications(user_id);
CREATE INDEX idx_admission_status ON admission_applications(status);
CREATE INDEX idx_wishes_app ON admission_wishes(application_id);
