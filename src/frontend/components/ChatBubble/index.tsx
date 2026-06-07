import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input, Button, Avatar, Badge } from 'antd';
import {
	SendOutlined,
	RobotOutlined,
	UserOutlined,
	CustomerServiceOutlined,
	CloseOutlined,
	MinusOutlined,
	ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSocket } from '../../hooks/useSocket';
import { streamChat, getChatHistory, ChatMessage, AIStreamChunk } from '../../services/ai';
import { getCurrentUser } from '../../utils/auth';
import styles from './index.less';

interface ChatBubbleProps {
	isOpen: boolean;
	onToggle: () => void;
}

const SESSION_KEY = 'ptit_chat_session_id';

const getOrCreateSessionId = (): string => {
	let sessionId = localStorage.getItem(SESSION_KEY);
	if (!sessionId) {
		sessionId = `student_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		localStorage.setItem(SESSION_KEY, sessionId);
	}
	return sessionId;
};

const ChatBubble: React.FC<ChatBubbleProps> = ({ isOpen, onToggle }) => {
	const user = getCurrentUser();
	const sessionId = useRef(getOrCreateSessionId());

	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [inputValue, setInputValue] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [isTyping, setIsTyping] = useState(false);
	const [isAdminTyping, setIsAdminTyping] = useState(false);
	const [isHandoff, setIsHandoff] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<any>(null);
	const abortRef = useRef<(() => void) | null>(null);

	// Kết nối Socket (vai trò sinh viên)
	const socket = useSocket({
		userId: user?.id,
		role: 'student',
		sessionId: sessionId.current,
		autoConnect: true,
	});

	// Tải lịch sử chat đã có khi mount
	useEffect(() => {
		getChatHistory(sessionId.current)
			.then((res) => {
				if (res.data?.messages?.length > 0) {
					setMessages(res.data.messages);
				}
			})
			.catch(() => {});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Cuộn xuống dưới khi có tin nhắn mới
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, isTyping, isAdminTyping]);

	// Focus input khi chat mở ra
	useEffect(() => {
		if (isOpen && inputRef.current) {
			setTimeout(() => inputRef.current?.focus(), 100);
		}
	}, [isOpen]);

	// Các sự kiện Socket
	useEffect(() => {
		const unsubReceive = socket.onReceiveMessage((msg) => {
			setMessages((prev) => [
				...prev,
				{
					role: 'admin',
					content: msg.message,
					timestamp: msg.timestamp,
				},
			]);
			setIsAdminTyping(false);
			if (!isOpen) {
				setUnreadCount((c) => c + 1);
			}
		});

		const unsubTyping = socket.onAdminTyping((data) => {
			setIsAdminTyping(data.isTyping);
		});

		const unsubHandoffAck = socket.onHandoffAck((data) => {
			setMessages((prev) => [
				...prev,
				{
					role: 'assistant',
					content: data.message,
					timestamp: new Date().toISOString(),
				},
			]);
		});

	const unsubNoAdmin = socket.onNoAdmin((data) => {
		setMessages((prev) => [
			...prev,
			{
				role: 'assistant',
				content: data.message,
				timestamp: new Date().toISOString(),
			},
		]);
	});

	return () => {
		unsubReceive();
		unsubTyping();
		unsubHandoffAck();
		unsubNoAdmin();
	};
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [socket, isOpen, user?.id]);

	// Gửi trạng thái đang gõ
	const handleTyping = useCallback(() => {
		socket.sendTyping(sessionId.current, 'student', true);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [socket]);

	const sendMessage = useCallback(async () => {
		const text = inputValue.trim();
		if (!text || isLoading) return;

		setInputValue('');
		setIsLoading(true);
		setIsTyping(true);
		setIsHandoff(false);

		// Thêm tin nhắn user
		const userMsg: ChatMessage = {
			role: 'user',
			content: text,
			timestamp: new Date().toISOString(),
			id: `user_${Date.now()}`,
		};

		// Thêm tin nhắn assistant giả lập ngay (để UI cuộn đúng)
		const assistantId = `asst_${Date.now()}`;
		const assistantMsg: ChatMessage = {
			role: 'assistant',
			content: '',
			timestamp: new Date().toISOString(),
			id: assistantId,
		};

		setMessages((prev) => [...prev, userMsg, assistantMsg]);
		socket.sendTyping(sessionId.current, 'student', false);

		let fullResponse = '';
		let pendingHandoff: AIStreamChunk | null = null;

		const { abort } = streamChat(
			text,
			sessionId.current,
			(data: AIStreamChunk) => {
				if (data.session_id) {
					if (data.session_id !== sessionId.current) {
						sessionId.current = data.session_id;
						localStorage.setItem(SESSION_KEY, data.session_id);
					}
					return;
				}

				if (data.status === 'handoff') {
					pendingHandoff = data;
					setIsHandoff(true);
				}

				if (data.status === 'done') {
					setIsLoading(false);
					setIsTyping(false);

					// Cập nhật placeholder với nội dung cuối cùng
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantId ? { ...m, content: fullResponse || 'Mình chưa có câu trả lời phù hợp.' } : m,
					),
				);

				// Kích hoạt socket handoff nếu cần
				if (pendingHandoff?.status === 'handoff') {
					// Dùng setMessages callback để lấy messages mới nhất, tránh stale closure
					setMessages((currentMsgs) => {
						socket.sendAdminAlert({
							session_id: sessionId.current,
							user_id: user?.id,
							student_name: pendingHandoff!.ner_data?.student_name,
							score: pendingHandoff!.ner_data?.score,
							subject_group: pendingHandoff!.ner_data?.subject_group,
							target_major: pendingHandoff!.ner_data?.target_major,
							chat_history: currentMsgs
								.slice(-10)
								.map((m) => ({ role: m.role, content: m.content, timestamp: m.timestamp })),
						});
						return currentMsgs;
					});
				}
					return;
				}

				if (data.status === 'error') {
					setIsLoading(false);
					setIsTyping(false);
					setMessages((prev) =>
						prev.map((m) =>
							m.id === assistantId
								? { ...m, content: data.message || 'Có lỗi xảy ra, vui lòng thử lại.' }
								: m,
						),
					);
					return;
				}

				if (data.token) {
					fullResponse += data.token;

						// Cập nhật placeholder với nội dung đang stream
					setMessages((prev) =>
						prev.map((m) =>
							m.id === assistantId ? { ...m, content: fullResponse } : m,
						),
					);
				}
			},
			(err: Error) => {
				setIsLoading(false);
				setIsTyping(false);
				setMessages((prev) =>
					prev.map((m) =>
						m.id === assistantId
							? { ...m, content: `Kết nối thất bại: ${err.message}` }
							: m,
					),
				);
			},
		);

		abortRef.current = abort;
	}, [inputValue, isLoading, socket, user?.id]);

	const handleKeyPress = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	};

	const handleToggle = () => {
		onToggle();
		if (!isOpen) {
			setUnreadCount(0);
		}
	};

	const formatTime = (timestamp: string) => {
		try {
			return new Date(timestamp).toLocaleTimeString('vi-VN', {
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return '';
		}
	};

	return (
		<>
			{/* Chat Button */}
			<div className={styles.chatButtonWrapper} onClick={handleToggle}>
				{!isOpen && unreadCount > 0 && (
					<span className={styles.unreadBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
				)}
				<Button
					type="danger"
					shape="circle"
					size="large"
					icon={isOpen ? <CloseOutlined /> : <CustomerServiceOutlined />}
					className={styles.chatButton}
				/>
			</div>

			{/* Chat Window */}
			{isOpen && (
				<div className={styles.chatWindow}>
					{/* Header */}
					<div className={styles.chatHeader}>
						<div className={styles.chatHeaderLeft}>
							<Avatar
								icon={<RobotOutlined />}
								src={undefined}
								style={{ backgroundColor: '#c41e3a', flexShrink: 0 }}
							/>
							<div className={styles.chatHeaderInfo}>
								<div className={styles.chatHeaderTitle}>Trợ lý AI Tuyển Sinh</div>
								<div className={styles.chatHeaderStatus}>
									<Badge status={socket.isConnected ? 'success' : 'error'} />
									{socket.isConnected ? 'Online' : 'Offline'}
									{socket.onlineAdminCount > 0 && (
										<span className={styles.adminOnline}>
											{' '}
											· {socket.onlineAdminCount} tư vấn viên trực tuyến
										</span>
									)}
								</div>
							</div>
						</div>
						<Button
							type="text"
							icon={<MinusOutlined />}
							onClick={handleToggle}
							className={styles.minimizeBtn}
						/>
					</div>

					{/* Messages */}
					<div className={styles.chatMessages}>
						{messages.length === 0 && (
							<div className={styles.welcomeMessage}>
								<Avatar
									size={48}
									icon={<RobotOutlined />}
									style={{ backgroundColor: '#c41e3a', marginBottom: 12 }}
								/>
								<h3>Xin chào, mình là Trợ lý AI Tuyển Sinh!</h3>
								<p>
									Mình có thể tư vấn cho em về <strong>điểm chuẩn</strong>,{' '}
									<strong>học phí</strong>, <strong>ngành học</strong>,{' '}
									<strong>phương thức xét tuyển</strong> và <strong>hồ sơ</strong> cần
									chuẩn bị nhé!
								</p>
								<div className={styles.suggestedQuestions}>
									{[
										'Điểm chuẩn ngành CNTT là bao nhiêu?',
										'Học phí ngành ATTT năm nay?',
										'Hồ sơ cần chuẩn bị những gì?',
									].map((q) => (
										<button
											key={q}
											className={styles.suggestedQuestion}
											onClick={() => {
												setInputValue(q);
												inputRef.current?.focus();
											}}
										>
											{q}
										</button>
									))}
								</div>
							</div>
						)}

						{messages.map((msg, idx) => (
							<div
								key={idx}
								className={`${styles.messageRow} ${
									msg.role === 'user' ? styles.userRow : styles.botRow
								}`}
							>
								{msg.role !== 'user' && (
									<Avatar
										size={32}
										icon={
											msg.role === 'admin' ? (
												<CustomerServiceOutlined />
											) : (
												<RobotOutlined />
											)
										}
										style={{
											backgroundColor: msg.role === 'admin' ? '#52c41a' : '#c41e3a',
											flexShrink: 0,
										}}
									/>
								)}

								<div className={styles.messageBubble}>
									<div className={styles.messageContent}>
										{msg.content.split('\n').map((line, i, arr) => (
											<span key={i}>
												{line}
												{i < arr.length - 1 && <br />}
											</span>
										))}
									</div>
									<div className={styles.messageTime}>{formatTime(msg.timestamp)}</div>
								</div>

								{msg.role === 'user' && (
									<Avatar
										size={32}
										icon={<UserOutlined />}
										style={{ backgroundColor: '#722ed1', flexShrink: 0 }}
									/>
								)}
							</div>
						))}

						{isTyping && (
							<div className={`${styles.messageRow} ${styles.botRow}`}>
								<Avatar
									size={32}
									icon={<RobotOutlined />}
									style={{ backgroundColor: '#c41e3a', flexShrink: 0 }}
								/>
								<div className={styles.typingBubble}>
									<span className={styles.typingDot} />
									<span className={styles.typingDot} />
									<span className={styles.typingDot} />
								</div>
							</div>
						)}

						{isAdminTyping && (
							<div className={`${styles.messageRow} ${styles.botRow}`}>
								<Avatar
									size={32}
									icon={<CustomerServiceOutlined />}
									style={{ backgroundColor: '#52c41a', flexShrink: 0 }}
								/>
								<div className={styles.typingBubble}>
									<span style={{ fontSize: 12, color: '#52c41a' }}>
										Tư vấn viên đang nhắn tin...
									</span>
								</div>
							</div>
						)}

						{isHandoff && (
							<div className={styles.handoffNotice}>
								<ExclamationCircleOutlined /> Đang kết nối với tư vấn viên...
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

				{/* Input */}
				<div className={styles.chatInputArea}>
					<Input.TextArea
							ref={inputRef}
							value={inputValue}
							onChange={(e) => {
								setInputValue(e.target.value);
								handleTyping();
							}}
							onKeyPress={handleKeyPress}
							placeholder="Nhập câu hỏi của em..."
							autoSize={{ minRows: 1, maxRows: 3 }}
							className={styles.chatInput}
							disabled={isLoading}
						/>
						<Button
							type="primary"
							icon={<SendOutlined />}
							onClick={sendMessage}
							loading={isLoading}
							className={styles.sendButton}
							disabled={!inputValue.trim()}
						/>
					</div>
				</div>
			)}
		</>
	);
};

export default ChatBubble;
