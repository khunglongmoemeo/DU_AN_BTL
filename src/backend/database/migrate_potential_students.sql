-- Migration: Create potential_students table for AI leads
-- This table stores potential student leads extracted by AI during chat sessions

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
