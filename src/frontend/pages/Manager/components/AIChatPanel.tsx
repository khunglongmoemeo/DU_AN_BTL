import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
	Badge,
	Button,
	Card,
	Col,
	Empty,
	Input,
	List,
	message,
	Row,
	Space,
	Spin,
	Tag,
	Typography,
	Avatar,
	Descriptions,
	Table,
} from 'antd';
import {
	RobotOutlined,
	CustomerServiceOutlined,
	UserOutlined,
	ExclamationCircleOutlined,
	SendOutlined,
	MessageOutlined,
	TagOutlined,
} from '@ant-design/icons';
import { useSocket } from '../../../hooks/useSocket';
import {
	getChatHistory,
	getPotentialLeads,
	getActiveSessions,
	markLeadReviewed,
	ChatMessage,
	PotentialLead,
} from '../../../services/ai';
import styles from '../index.less';

const { Text } = Typography;
const { TextArea } = Input;

interface AdminUser {
	id: number;
	full_name: string;
	email: string;
	role: string;
}

interface AIChatPanelProps {
	user: AdminUser;
}

interface ActiveSession {
	session_id: string;
	user_id: number | null;
	last_message: string;
	last_message_at: string;
}

interface ChatWithStudent {
	sessionId: string;
	userId?: number;
	studentName?: string;
	score?: number;
	subjectGroup?: string;
	targetMajor?: string;
	messages: ChatMessage[];
	isTyping: boolean;
	isAdminTyping: boolean;
	hasNewMessage: boolean;
}

const AIChatPanel: React.FC<AIChatPanelProps> = ({ user }) => {
	const [onlineCount, setOnlineCount] = useState(0);
	const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
	const [leads, setLeads] = useState<PotentialLead[]>([]);
	const [totalLeads, setTotalLeads] = useState(0);
	const [loadingLeads, setLoadingLeads] = useState(false);
	const [selectedSession, setSelectedSession] = useState<ChatWithStudent | null>(null);
	const [adminReply, setAdminReply] = useState('');
	const [loadingSessions] = useState(false);
	const [newAlertCount, setNewAlertCount] = useState(0);
	const [activeChats, setActiveChats] = useState<Map<string, ChatWithStudent>>(new Map());

	const messagesEndRef = useRef<HTMLDivElement>(null);

	// Kết nối Socket (vai trò admin)
	const socket = useSocket({
		userId: user.id,
		role: 'admin',
		autoConnect: true,
	});

	// Tải leads
	const loadLeads = useCallback(async (page = 1) => {
		setLoadingLeads(true);
		try {
			const res = await getPotentialLeads(page, 50, false);
			setLeads(res.data || []);
			setTotalLeads(res.total || 0);
		} catch {
			message.error('Không thể tải danh sách leads');
		} finally {
			setLoadingLeads(false);
		}
	}, []);

	// Tải lịch sử chat cho một phiên
	const loadSessionChat = useCallback(async (session: ActiveSession) => {
		try {
			const res = await getChatHistory(session.session_id);
			const existingChat = activeChats.get(session.session_id);

			const newChat: ChatWithStudent = {
				sessionId: session.session_id,
				userId: session.user_id || undefined,
				messages: res.data?.messages || [],
				isTyping: existingChat?.isTyping || false,
				isAdminTyping: existingChat?.isAdminTyping || false,
				hasNewMessage: false,
			};

			setActiveChats((prev) => {
				const next = new Map(prev);
				next.set(session.session_id, newChat);
				return next;
			});
		} catch {
			// Bỏ qua lỗi
		}
	}, [activeChats]);

	// Tải các phiên chat đang hoạt động
	const loadActiveSessions = useCallback(async () => {
		try {
			const res = await getActiveSessions();
			const raw = res.data || [];
			// Deduplicate theo session_id (lấy bản mới nhất nếu trùng)
			const seen = new Set<string>();
			const deduped = raw.filter((s) => {
				if (seen.has(s.session_id)) return false;
				seen.add(s.session_id);
				return true;
			});
			setActiveSessions(deduped);
		} catch {
			// Bỏ qua lỗi
		}
	}, []);

	useEffect(() => {
		loadLeads();
		loadActiveSessions();
	}, [loadLeads, loadActiveSessions]);

	// Tự động reload session định kỳ (phòng trường hợp có dữ liệu mới từ API)
	useEffect(() => {
		const interval = setInterval(() => {
			loadActiveSessions();
		}, 15000);
		return () => clearInterval(interval);
	}, [loadActiveSessions]);

	// Các sự kiện Socket
	useEffect(() => {
		const unsubAlert = socket.onAdminAlert((alert) => {
			console.log('[Admin] Handoff alert received:', alert.session_id);

			setActiveSessions((prev) => {
				const exists = prev.find((s) => s.session_id === alert.session_id);
				if (exists) {
					// Cập nhật tin nhắn mới nhất, không trùng
					return prev.map((s) =>
						s.session_id === alert.session_id
							? { ...s, last_message: alert.chat_history[alert.chat_history.length - 1]?.content || s.last_message, last_message_at: alert.triggered_at }
							: s,
					);
				}
				return [
					{
						session_id: alert.session_id,
						user_id: alert.user_id || null,
						last_message: alert.chat_history[alert.chat_history.length - 1]?.content || '',
						last_message_at: alert.triggered_at,
					},
					...prev,
				];
			});

			setActiveChats((prev) => {
				const next = new Map(prev);
				if (next.has(alert.session_id)) {
					// Cập nhật tin nhắn mới nhất
					next.set(alert.session_id, {
						...next.get(alert.session_id)!,
						messages: alert.chat_history,
						hasNewMessage: selectedSession?.sessionId !== alert.session_id,
					});
				} else {
					next.set(alert.session_id, {
						sessionId: alert.session_id,
						userId: alert.user_id,
						studentName: alert.student_name,
						score: alert.score,
						subjectGroup: alert.subject_group,
						targetMajor: alert.target_major,
						messages: alert.chat_history,
						isTyping: false,
						isAdminTyping: false,
						hasNewMessage: true,
					});
				}
				return next;
			});

			setNewAlertCount((c) => c + 1);
			message.warning({
				content: `Thí sinh cần hỗ trợ: ${alert.student_name || alert.session_id}`,
				duration: 5,
			});
		});

		const unsubStudentMsg = socket.onStudentMessage((msg) => {
			setActiveChats((prev) => {
				const next = new Map(prev);
				const existing = next.get(msg.session_id);
				if (existing) {
					next.set(msg.session_id, {
						...existing,
						messages: [
							...existing.messages,
							{ role: 'user', content: msg.message, timestamp: msg.timestamp },
						],
						hasNewMessage: selectedSession?.sessionId !== msg.session_id,
					});
				}
				return next;
			});
		});

		const unsubUserTyping = socket.onUserTyping((data) => {
			setActiveChats((prev) => {
				const next = new Map(prev);
				const existing = next.get(data.session_id);
				if (existing) {
					next.set(data.session_id, { ...existing, isTyping: data.isTyping });
				}
				return next;
			});
		});

		const unsubAdminTyping = socket.onAdminTyping((_data) => {
			// Admin đang gõ cho sinh viên
		});

		return () => {
			unsubAlert();
			unsubStudentMsg();
			unsubUserTyping();
			unsubAdminTyping();
		};
	}, [socket, selectedSession?.sessionId]);

	// Cuộn xuống dưới khi chat được chọn cập nhật
	useEffect(() => {
		if (selectedSession) {
			const chat = activeChats.get(selectedSession.sessionId);
			if (chat?.messages.length !== selectedSession.messages.length) {
				setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
			}
		}
	}, [activeChats, selectedSession?.sessionId, selectedSession?.messages?.length]);

	const openSession = async (session: ActiveSession) => {
		await loadSessionChat(session);
		const chat = activeChats.get(session.session_id) || activeChats.get(session.session_id);
		if (chat) {
			setSelectedSession(chat);
		} else {
			setSelectedSession({
				sessionId: session.session_id,
				userId: session.user_id || undefined,
				messages: [],
				isTyping: false,
				isAdminTyping: false,
				hasNewMessage: false,
			});
		}
		setNewAlertCount((c) => Math.max(0, c - 1));
	};

	const handleSendReply = async () => {
		if (!adminReply.trim() || !selectedSession) return;

		const msg = adminReply;
		setAdminReply('');

		// Gửi qua socket
		socket.sendAdminReply(selectedSession.sessionId, msg, user.id);

		// Cập nhật optimistic
		setActiveChats((prev) => {
			const next = new Map(prev);
			const existing = next.get(selectedSession.sessionId);
			if (existing) {
				next.set(selectedSession.sessionId, {
					...existing,
					messages: [
						...existing.messages,
						{ role: 'admin', content: msg, timestamp: new Date().toISOString() },
					],
				});
			}
			return next;
		});

		setSelectedSession((prev) => {
			if (!prev) return prev;
			return {
				...prev,
				messages: [
					...prev.messages,
					{ role: 'admin', content: msg, timestamp: new Date().toISOString() },
				],
			};
		});
	};

	const handleMarkLeadReviewed = async (id: number) => {
		try {
			await markLeadReviewed(id);
			setLeads((prev) => prev.filter((l) => l.id !== id));
			setTotalLeads((t) => Math.max(0, t - 1));
			message.success('Đã đánh dấu đã xem');
		} catch {
			message.error('Không thể cập nhật');
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

	const formatDateTime = (timestamp: string) => {
		try {
			return new Date(timestamp).toLocaleString('vi-VN', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});
		} catch {
			return timestamp;
		}
	};

	const leadColumns = [
		{
			title: 'Họ tên',
			dataIndex: 'student_name',
			key: 'student_name',
			width: 140,
			ellipsis: true,
			render: (name: string | null) => name || <Text type="secondary">Chưa rõ</Text>,
		},
		{
			title: 'Điểm',
			dataIndex: 'score',
			key: 'score',
			width: 70,
			align: 'center' as const,
			render: (score: number | null) =>
				score ? <Tag color="blue">{score}</Tag> : <Text type="secondary">-</Text>,
		},
		{
			title: 'Khối',
			dataIndex: 'subject_group',
			key: 'subject_group',
			width: 70,
			align: 'center' as const,
			render: (group: string | null) =>
				group ? <Tag color="green">{group}</Tag> : <Text type="secondary">-</Text>,
		},
		{
			title: 'Ngành',
			dataIndex: 'target_major',
			key: 'target_major',
			width: 140,
			ellipsis: true,
			render: (major: string | null) => major || <Text type="secondary">-</Text>,
		},
		{
			title: 'Ngày tạo',
			dataIndex: 'created_at',
			key: 'created_at',
			width: 140,
			render: (date: string) => formatDateTime(date),
		},
		{
			title: '',
			key: 'action',
			width: 80,
			render: (_: unknown, record: PotentialLead) => (
				<Button size="small" type="primary" onClick={() => handleMarkLeadReviewed(record.id)}>
					Xem
				</Button>
			),
		},
	];

	const currentChat = selectedSession ? activeChats.get(selectedSession.sessionId) : null;

	return (
		<div className={styles.aiPanel}>
			{/* Left: Session list + Leads */}
			<div className={styles.leftPanel}>
				<Card
					title={
						<Space>
							<MessageOutlined />
							Phiên hội thoại đang chờ
							<Badge count={newAlertCount} overflowCount={99} />
						</Space>
					}
					extra={<Badge status={socket.isConnected ? 'success' : 'error'} text={socket.isConnected ? 'Online' : 'Offline'} />}
					className={styles.sessionCard}
				>
					{activeSessions.length === 0 ? (
						<Empty description="Không có phiên hội thoại nào" image={Empty.PRESENTED_IMAGE_SIMPLE} />
					) : (
						<List
							dataSource={activeSessions}
							renderItem={(session) => {
								const chat = activeChats.get(session.session_id);
								const hasAlert = chat?.hasNewMessage;

								return (
									<List.Item
										className={`${styles.sessionItem} ${selectedSession?.sessionId === session.session_id ? styles.sessionItemActive : ''} ${hasAlert ? styles.sessionItemAlert : ''}`}
										onClick={() => openSession(session)}
										actions={[
											hasAlert && (
												<Tag color="red" icon={<ExclamationCircleOutlined />}>
													Mới
												</Tag>
											),
										]}
									>
										<List.Item.Meta
											avatar={
												<Badge dot={hasAlert} status="error" offset={[-4, 32]}>
													<Avatar icon={<UserOutlined />} style={{ backgroundColor: hasAlert ? '#ff4d4f' : '#c41e3a' }} />
												</Badge>
											}
											title={
												<Space>
													<Text strong>{chat?.studentName || `Session ${session.session_id.slice(0, 12)}...`}</Text>
													{chat?.score && <Tag color="blue">{chat.score}</Tag>}
												</Space>
											}
											description={
												<Text type="secondary" ellipsis>
													{session.last_message || chat?.messages[chat.messages.length - 1]?.content || 'Chưa có tin nhắn'}
												</Text>
											}
										/>
										<Text type="secondary" style={{ fontSize: 11, whiteSpace: 'nowrap' }}>
											{formatTime(session.last_message_at)}
										</Text>
									</List.Item>
								);
							}}
						/>
					)}
				</Card>

				<Card
					title={
						<Space>
							<TagOutlined />
							Thí sinh tiềm năng
							<Tag color="orange">{totalLeads} chưa xem</Tag>
						</Space>
					}
					extra={
						<span style={{ fontSize: 11, color: 'rgba(0,0,0,0.45)' }}>
							AI trích xuất từ chat
						</span>
					}
					className={styles.leadsCard}
				>
					<Spin spinning={loadingLeads}>
							{leads.length === 0 && !loadingLeads ? (
								<Empty
									description={
										<div style={{ fontSize: 13, color: 'rgba(0,0,0,0.45)', textAlign: 'center', padding: '16px 0' }}>
											<div style={{ marginBottom: 4, fontWeight: 500, color: 'rgba(0,0,0,0.65)' }}>Chưa có thí sinh tiềm năng nào</div>
											<div>Khi sinh viên nhắn tin cho AI và cung cấp thông tin (tên, điểm, ngành muốn xét tuyển), hệ thống sẽ tự động trích xuất và hiển thị ở đây.</div>
										</div>
									}
									image={Empty.PRESENTED_IMAGE_SIMPLE}
								/>
							) : (
								<Table
									dataSource={leads}
									columns={leadColumns}
									rowKey="id"
									size="small"
									pagination={false}
									scroll={{ y: 240 }}
								/>
							)}
						</Spin>
				</Card>
			</div>

			{/* Right: Active chat window */}
			<div className={styles.rightPanel}>
				<Card
					title={
						<Space>
							<RobotOutlined />
							{selectedSession
								? `Hội thoại: ${currentChat?.studentName || selectedSession.sessionId.slice(0, 16)}...`
								: 'Chọn một phiên để trò chuyện'}
						</Space>
					}
					className={styles.chatCard}
				>
					{!selectedSession ? (
						<Empty
							description="Chọn một phiên hội thoại bên trái để bắt đầu trò chuyện với thí sinh"
							image={Empty.PRESENTED_IMAGE_SIMPLE}
						/>
					) : (
						<>
							{/* Student info header */}
							{currentChat && (currentChat.studentName || currentChat.score) && (
								<div className={styles.studentInfo}>
									<Descriptions size="small" column={3}>
										{currentChat.studentName && (
											<Descriptions.Item label="Họ tên">
												<Space>
													<UserOutlined />
													{currentChat.studentName}
												</Space>
											</Descriptions.Item>
										)}
										{currentChat.score && (
											<Descriptions.Item label="Điểm thi">
												<Tag color="blue">{currentChat.score}</Tag>
											</Descriptions.Item>
										)}
										{currentChat.subjectGroup && (
											<Descriptions.Item label="Khối">
												<Tag color="green">{currentChat.subjectGroup}</Tag>
											</Descriptions.Item>
										)}
										{currentChat.targetMajor && (
											<Descriptions.Item label="Ngành quan tâm">
												<strong>{currentChat.targetMajor}</strong>
											</Descriptions.Item>
										)}
									</Descriptions>
								</div>
							)}

							{/* Messages */}
							<div className={styles.adminChatMessages}>
								{currentChat?.messages.map((msg, idx) => (
									<div
										key={idx}
										className={`${styles.adminMessageRow} ${msg.role === 'admin' ? styles.adminMsgRow : styles.userMsgRow}`}
									>
										<div className={`${styles.adminMessageBubble} ${msg.role === 'admin' ? styles.adminBubble : styles.userBubble}`}>
											<div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
												{msg.role === 'admin' ? (
													<Avatar size={20} icon={<CustomerServiceOutlined />} style={{ backgroundColor: '#52c41a' }} />
												) : (
													<Avatar size={20} icon={<UserOutlined />} style={{ backgroundColor: '#c41e3a' }} />
												)}
												<Text type="secondary" style={{ fontSize: 11 }}>
													{msg.role === 'admin' ? 'Tư vấn viên' : 'Thí sinh'}
												</Text>
											</div>
											<div>{msg.content}</div>
											<div style={{ textAlign: 'right', fontSize: 10, opacity: 0.6, marginTop: 4 }}>
												{formatTime(msg.timestamp)}
											</div>
										</div>
									</div>
								))}

								{currentChat?.isTyping && (
									<div className={`${styles.adminMessageRow} ${styles.userMsgRow}`}>
										<div className={`${styles.adminMessageBubble} ${styles.userBubble}`}>
											<Space size="small">
												<Text type="secondary">Thí sinh đang nhắn tin...</Text>
											</Space>
										</div>
									</div>
								)}

								<div ref={messagesEndRef} />
							</div>

							{/* Reply input */}
							<div className={styles.adminReplyArea}>
								<TextArea
									value={adminReply}
									onChange={(e) => setAdminReply(e.target.value)}
									placeholder="Nhập tin nhắn trả lời cho thí sinh..."
									autoSize={{ minRows: 2, maxRows: 4 }}
									onKeyDown={(e) => {
										if (e.key === 'Enter' && !e.shiftKey) {
											e.preventDefault();
											handleSendReply();
										}
									}}
								/>
								<Button
									type="primary"
									icon={<SendOutlined />}
									onClick={handleSendReply}
									disabled={!adminReply.trim()}
									style={{ marginTop: 8 }}
								>
									Gửi
								</Button>
							</div>
						</>
					)}
				</Card>
			</div>
		</div>
	);
};

export default AIChatPanel;
