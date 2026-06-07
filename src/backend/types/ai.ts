// ──────────────────────────────────────────────
// Các kiểu dữ liệu cho AI Chat & RAG
// ──────────────────────────────────────────────

export interface ChatMessage {
	role: 'user' | 'assistant' | 'admin' | 'system';
	content: string;
	timestamp: string;
	metadata?: Record<string, unknown>;
}

export interface ChatSession {
	session_id: string;
	user_id?: number;
	created_at: string;
	last_message_at: string;
	unread_count?: number;
}

export interface KnowledgeChunk {
	id: number;
	content: string;
	embedding: number[];
	source_file: string | null;
	metadata?: Record<string, unknown>;
	created_at: string;
}

export interface PotentialStudent {
	id: number;
	session_id: string | null;
	user_id: number | null;
	student_name: string | null;
	score: number | null;
	subject_group: string | null;
	target_major: string | null;
	phone: string | null;
	email: string | null;
	notes: string | null;
	reviewed: boolean;
	reviewed_by: number | null;
	reviewed_at: Date | null;
	created_at: string;
}

export interface NERExtractedData {
	student_name?: string;
	score?: number;
	subject_group?: string;
	target_major?: string;
	phone?: string;
	email?: string;
}

export interface AIStreamChunk {
	token?: string;
	status?: 'handoff' | 'done' | 'error';
	trigger_socket?: boolean;
	message?: string;
	ner_data?: NERExtractedData;
}

export interface HandoffPayload {
	session_id: string;
	user_id?: number;
	student_name?: string;
	score?: number;
	subject_group?: string;
	target_major?: string;
	chat_history: ChatMessage[];
	triggered_at: string;
}

export interface EmbedResult {
	embedding: number[];
	model: string;
	usage: {
		prompt_tokens: number;
		total_tokens: number;
	};
}
