import { useEffect, useState } from 'react';
import { useParams, history } from 'umi';
import {
	ArrowLeftOutlined,
	BellOutlined,
	ClockCircleOutlined,
	EyeOutlined,
	GlobalOutlined,
	RightOutlined,
	TagOutlined,
	UserOutlined,
} from '@ant-design/icons';
import { Button, Divider, Spin, Tag, Typography } from 'antd';
import { getAllNews, getNewsById } from '../../../services/news';
import ChatBubble from '../../../components/ChatBubble';
import styles from './index.less';

const { Title, Text } = Typography;

interface NewsItem {
	id: number;
	title: string;
	summary: string;
	content: string;
	source: string;
	views: number;
	publishedAt: string;
	day: string;
	month: string;
	tags: string[];
}

const NewsDetailPage: React.FC = () => {
	const { id } = useParams<{ id: string }>();
	const [news, setNews] = useState<NewsItem | null>(null);
	const [allNews, setAllNews] = useState<NewsItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [isChatOpen, setIsChatOpen] = useState(false);

	useEffect(() => {
		const load = async () => {
			setLoading(true);
			try {
				const newsId = parseInt(id, 10);
				const [detailRes, allRes] = await Promise.all([
					newsId ? getNewsById(newsId) : Promise.resolve(null),
					getAllNews(),
				]);
				if (detailRes) {
					setNews(detailRes.data.data);
				}
				setAllNews(allRes.data.data || []);
			} catch {
				//
			} finally {
				setLoading(false);
			}
		};
		load();
	}, [id]);

	if (loading) {
		return (
			<div className={styles.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
				<Spin size="large" />
			</div>
		);
	}

	if (!news) {
		return (
			<div className={styles.page} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16 }}>
				<Title level={3}>Không tìm thấy tin tức</Title>
				<Button type="primary" icon={<ArrowLeftOutlined />} onClick={() => history.push('/student')}>
					Quay lại trang chủ
				</Button>
			</div>
		);
	}

	const otherNews = allNews.filter((n) => n.id !== news.id).slice(0, 5);

	const formatDate = (dateStr: string) => {
		const date = new Date(dateStr);
		return date.toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' });
	};

	const renderContent = (content: string) => {
		const lines = content.split('\n');
		const blocks: Array<{ type: 'heading'; text: string } | { type: 'table'; rows: string[][] } | { type: 'paragraph'; text: string }> = [];

		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim()) continue;

			if (line.startsWith('**') && line.endsWith('**')) {
				blocks.push({ type: 'heading', text: line.replace(/\*\*/g, '') });
				continue;
			}

			if (line.startsWith('|')) {
				const tableRows: string[][] = [];
				while (i < lines.length && lines[i].startsWith('|')) {
					const cells = lines[i].split('|').filter((c) => c.trim() && !c.includes('---'));
					tableRows.push(cells.map((c) => c.trim()));
					i++;
				}
				i--;
				blocks.push({ type: 'table', rows: tableRows });
				continue;
			}

			blocks.push({ type: 'paragraph', text: line });
		}

		return blocks.map((block, i) => {
			if (block.type === 'heading') {
				return (
					<p key={i} style={{ fontSize: 16, fontWeight: 700, marginTop: 16, marginBottom: 8, color: '#1e293b' }}>
						{block.text}
					</p>
				);
			}

			if (block.type === 'table') {
				const headerCells = block.rows[0] || [];
				const bodyRows = block.rows.slice(1);

				return (
					<div key={i} style={{ overflowX: 'auto', margin: '8px 0' }}>
						<table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
							<thead>
								<tr>
									{headerCells.map((cell, ci) => (
										<th key={ci} style={{ padding: '8px 12px', border: '1px solid #c41e3a', background: '#fff1f0', fontWeight: 700, color: '#8b0000', textAlign: 'left' }}>{cell}</th>
									))}
								</tr>
							</thead>
							<tbody>
								{bodyRows.map((row, ri) => (
									<tr key={ri}>
										{row.map((cell, ci) => (
											<td key={ci} style={{ padding: '8px 12px', border: '1px solid #e2e8f0' }}>{cell}</td>
										))}
									</tr>
								))}
							</tbody>
						</table>
					</div>
				);
			}

			const formatted = block.text
				.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
				.replace(/`(.*?)`/g, '<code style="background:#f1f5f9;padding:2px 6px;border-radius:4px;">$1</code>');

			return (
				<p key={i} style={{ fontSize: 15, lineHeight: 1.8, marginBottom: 8, color: '#334155' }} dangerouslySetInnerHTML={{ __html: formatted }} />
			);
		});
	};

	return (
		<div className={styles.page}>
			<div className={styles.topBar}>
				<div className={styles.topBarInner}>
					<div className={styles.topBarLeft}>
						<GlobalOutlined />
						<span>Cổng thông tin tuyển sinh trực tuyến</span>
					</div>
					<div className={styles.topBarRight}>
						<Button size="small" icon={<ArrowLeftOutlined />} onClick={() => history.push('/student')}>
							Quay lại
						</Button>
					</div>
				</div>
			</div>

			<div className={styles.layout}>
				<div className={styles.mainContent}>
					<article className={styles.article}>
						<div className={styles.articleHeader}>
							<div className={styles.articleMeta}>
								<span className={styles.articleSource}><UserOutlined /> {news.source}</span>
								<span className={styles.articleDate}><ClockCircleOutlined /> {formatDate(news.publishedAt)}</span>
								<span className={styles.articleViews}><EyeOutlined /> {news.views.toLocaleString()} lượt xem</span>
							</div>
							<Title level={2} className={styles.articleTitle}>{news.title}</Title>
							<div className={styles.articleTags}>
								{news.tags.map((tag) => (
									<Tag key={tag} icon={<TagOutlined />} color="blue">{tag}</Tag>
								))}
							</div>
						</div>

						<Divider />

						<div className={styles.articleSummary}>
							<Text type="secondary" style={{ fontSize: 16, fontStyle: 'italic' }}>
								{news.summary}
							</Text>
						</div>

						<div className={styles.articleBody}>
							{renderContent(news.content)}
						</div>
					</article>
				</div>

				<aside className={styles.sidebar}>
					<div className={styles.sidebarSection}>
						<div className={styles.sidebarTitle}>
							<BellOutlined style={{ color: '#c41e3a' }} />
							Tin tức khác
						</div>
						<div className={styles.sidebarList}>
							{otherNews.map((item) => (
								<div
									key={item.id}
									className={styles.sidebarItem}
									onClick={() => history.push(`/student/news/${item.id}`)}
								>
									<div className={styles.sidebarItemDate}>
										<span className={styles.day}>{item.day}</span>
										<span className={styles.month}>{item.month}</span>
									</div>
									<div className={styles.sidebarItemContent}>
										<div className={styles.sidebarItemTitle}>{item.title}</div>
										<div className={styles.sidebarItemMeta}>{item.source} · {item.views.toLocaleString()} lượt xem</div>
									</div>
									<RightOutlined style={{ color: '#94a3b8', fontSize: 12 }} />
								</div>
							))}
						</div>
					</div>
				</aside>
			</div>

			<ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
		</div>
	);
};

export default NewsDetailPage;
