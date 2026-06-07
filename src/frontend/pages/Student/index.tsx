import { useEffect, useMemo, useState } from 'react';
import moment from 'moment';
import {
	Alert,
	Button,
	Checkbox,
	DatePicker,
	Divider,
	Form,
	Input,
	Modal,
	Popover,
	Select,
	Spin,
	Steps,
	Timeline,
	Typography,
	Upload,
	message,
} from 'antd';
import {
	HomeOutlined,
	BookOutlined,
	CheckCircleOutlined,
	DeleteOutlined,
	DragOutlined,
	FileImageOutlined,
	LogoutOutlined,
	PlusOutlined,
	SendOutlined,
	UserOutlined,
	WarningOutlined,
} from '@ant-design/icons';
import { history } from 'umi';
import {
	getMyAdmissionApplication,
	saveAcademicInfo,
	saveAdmissionWishes,
	saveDocumentsInfo,
	savePersonalInfo,
	submitAdmissionApplication,
	uploadAdmissionDocument,
} from '../../services/admission';
import { getCurrentUser, logout } from '../../utils/auth';
import ChatBubble from '../../components/ChatBubble';
import styles from './index.less';

const { Step } = Steps;
const { Dragger } = Upload;
const { Title, Text } = Typography;

const provinces = ['Hà Nội', 'TP. Hồ Chí Minh', 'Đà Nẵng', 'Hải Phòng', 'Cần Thơ'];
const ethnicities = ['Kinh', 'Tày', 'Thái', 'Mường', 'Khmer', 'Nùng', 'Hoa'];
const schools = ['RIPT University', 'Học viện Công nghệ Bưu chính Viễn thông', 'Đại học Kinh tế Quốc dân'];
const majorsBySchool: Record<string, string[]> = {
	'RIPT University': ['Công nghệ thông tin', 'Thương mại điện tử', 'Truyền thông số'],
	'Học viện Công nghệ Bưu chính Viễn thông': ['An toàn thông tin', 'Kỹ thuật điện tử viễn thông', 'Marketing'],
	'Đại học Kinh tế Quốc dân': ['Quản trị kinh doanh', 'Kế toán', 'Tài chính ngân hàng'],
};
const subjectGroups = ['A00 - Toán, Lý, Hóa', 'A01 - Toán, Lý, Anh', 'D01 - Toán, Văn, Anh'];
const academicRanks = ['Xuất sắc', 'Giỏi', 'Khá', 'Trung bình', 'Yếu'];
const conductRanks = ['Tốt', 'Khá', 'Đạt', 'Chưa đạt'];
const priorityAreas = ['KV1', 'KV2-NT', 'KV2', 'KV3'];
const priorityGroups = ['Không', '01', '02', '03', '04', '05', '06', '07'];
const graduationYears = ['2026', '2025', '2024', '2023', '2022', '2021'];
const highSchools = ['THPT Chuyên Hà Nội - Amsterdam', 'THPT Việt Đức', 'THPT Trần Phú', 'THPT Lê Quý Đôn', 'Trung tâm GDTX', 'Khác'];

const defaultDocumentItems = [
	{ key: 'cccd_front', label: 'CCCD mặt trước', status: 'missing' },
	{ key: 'cccd_back', label: 'CCCD mặt sau', status: 'missing' },
	{ key: 'portrait', label: 'Ảnh chân dung', status: 'missing' },
];

const stepItems = ['Thông tin cá nhân', 'Hồ sơ minh chứng', 'Thông tin học tập', 'Nguyện vọng xét tuyển', 'Xác nhận & Nộp hồ sơ'];

interface AdmissionWish {
	id: number | string;
	school: string;
	major: string;
	group: string;
}

interface DocumentItem {
	key: string;
	label: string;
	fileName?: string;
	fileUrl?: string;
	status?: string;
	size?: number;
}

interface AdmissionApplicationData {
	status: string;
	personalInfo?: Record<string, any>;
	academicInfo?: Record<string, any>;
	documentsInfo?: { items?: DocumentItem[] };
	wishes?: AdmissionWish[];
	confirmationChecked?: boolean;
	submittedAt?: string | null;
	reviewedAt?: string | null;
	rejectionReason?: string | null;
	checklist?: Array<{ key: string; label: string; done: boolean; detail?: string; step: number }>;
}

const renderRequiredLabel = (label: string) => (
	<>
		{label} <span className={styles.requiredMark}>*</span>
	</>
);

const fileToBase64 = (file: File) =>
	new Promise<string>((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => {
			const value = typeof reader.result === 'string' ? reader.result.split(',').pop() || '' : '';
			resolve(value);
		};
		reader.onerror = () => reject(new Error('Không thể đọc tệp tải lên'));
		reader.readAsDataURL(file);
	});

const StudentPage: React.FC = () => {
	const user = getCurrentUser();
	const [personalForm] = Form.useForm();
	const [academicForm] = Form.useForm();
	const [currentStep, setCurrentStep] = useState(0);
	const [selectedSchool, setSelectedSchool] = useState(schools[0]);
	const [selectedMajor, setSelectedMajor] = useState(majorsBySchool[schools[0]][0]);
	const [selectedGroup, setSelectedGroup] = useState(subjectGroups[0]);
	const [wishes, setWishes] = useState<AdmissionWish[]>([]);
	const [dragIndex, setDragIndex] = useState<number | null>(null);
	const [confirmChecked, setConfirmChecked] = useState(false);
	const [accountOpen, setAccountOpen] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [applicationStatus, setApplicationStatus] = useState('draft');
	const [submittedAt, setSubmittedAt] = useState<string | null>(null);
	const [rejectionReason, setRejectionReason] = useState<string | null>(null);
	const [checklist, setChecklist] = useState<Array<{ key: string; label: string; done: boolean; detail?: string; step: number }>>([]);
	const [documents, setDocuments] = useState<DocumentItem[]>(defaultDocumentItems);
	const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
	const [isChatOpen, setIsChatOpen] = useState(false);

	if (!user || user.role !== 'student') {
		message.error('Bạn không có quyền truy cập trang sinh viên');
		history.replace('/user/login');
		return null;
	}

	const availableMajors = majorsBySchool[selectedSchool] || [];
	const previewUrl = previewDocument?.fileUrl ? `http://localhost:5000${previewDocument.fileUrl}` : '';
	const previewIsPdf = Boolean(
		previewDocument &&
			((previewDocument.fileUrl && previewDocument.fileUrl.toLowerCase().endsWith('.pdf')) ||
				(previewDocument.fileName && previewDocument.fileName.toLowerCase().endsWith('.pdf'))),
	);

	useEffect(() => {
		if (!availableMajors.includes(selectedMajor)) {
			setSelectedMajor(availableMajors[0] || '');
		}
	}, [availableMajors, selectedMajor]);

	const syncApplicationData = (data: AdmissionApplicationData) => {
		const personalInfo = data.personalInfo || {};
		const academicInfo = data.academicInfo || {};
		const documentItems = data.documentsInfo?.items?.length
			? defaultDocumentItems.map((item) => {
					const matched = data.documentsInfo?.items?.find((entry) => entry.key === item.key);
					return matched ? { ...item, ...matched } : item;
			  })
			: defaultDocumentItems;
		const loadedWishes = (data.wishes || []).map((wish, index) => ({
			id: wish.id || index + 1,
			school: wish.school,
			major: wish.major,
			group: wish.group,
		}));

		personalForm.setFieldsValue({
			...personalInfo,
			birthday: personalInfo.birthday ? moment(personalInfo.birthday) : undefined,
			fullName: personalInfo.fullName || user.full_name,
			phone: personalInfo.phone || user.phone,
		});
		academicForm.setFieldsValue({
			...academicInfo,
		});

		setDocuments(documentItems);
		setWishes(loadedWishes);
		setChecklist(data.checklist || []);
		setApplicationStatus(data.status || 'draft');
		setConfirmChecked(Boolean(data.confirmationChecked));
		setSubmittedAt(data.submittedAt || null);
		setRejectionReason(data.rejectionReason || null);

		if (loadedWishes.length > 0) {
			setSelectedSchool(loadedWishes[0].school);
			setSelectedMajor(loadedWishes[0].major);
			setSelectedGroup(loadedWishes[0].group);
		}
	};

	const loadApplication = async () => {
		try {
			setLoading(true);
			const response = await getMyAdmissionApplication();
			syncApplicationData(response.data.data);
		} catch (error: any) {
			message.error(error?.response?.data?.message || 'Không thể tải hồ sơ tuyển sinh');
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadApplication();
	}, []);

	const handleLogout = () => {
		logout();
		history.push('/user/login');
	};

	const updateDocumentItem = (key: string, patch: Partial<DocumentItem>) => {
		setDocuments((items) => items.map((item) => (item.key === key ? { ...item, ...patch } : item)));
	};

	const mergeDocumentItems = (items: DocumentItem[], key: string, patch: Partial<DocumentItem>) =>
		items.map((item) => (item.key === key ? { ...item, ...patch } : item));

	const validateRequiredDocuments = (items: DocumentItem[]) => {
		const missingItems = defaultDocumentItems.filter((requiredItem) => {
			const matched = items.find((item) => item.key === requiredItem.key);
			return !matched?.fileName || matched.status !== 'done';
		});

		if (missingItems.length > 0) {
			throw new Error(`Vui lòng tải đầy đủ: ${missingItems.map((item) => item.label).join(', ')}`);
		}
	};

		const buildUploadProps = (key: string) => {
		const currentItem = documents.find((item) => item.key === key);
		const fileList = currentItem?.fileName
			? [
					{
						uid: key,
						name: currentItem.fileName,
						status: 'done',
						url: currentItem.fileUrl,
					},
			  ]
			: [];

		return {
			fileList,
			maxCount: 1,
			disabled: isSubmissionLocked,
			accept: '.jpg,.jpeg,.png,.pdf',
			beforeUpload: (file: File) => {
				const MAX_SIZE = 5 * 1024 * 1024; // 5MB
				const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
				if (file.size > MAX_SIZE) {
					message.error(`${file.name} vượt quá 5MB. Vui lòng chọn tệp nhỏ hơn.`);
					return false;
				}
				if (!allowedTypes.includes(file.type)) {
					message.error('Chỉ hỗ trợ định dạng JPG, PNG, PDF');
					return false;
				}
				return true;
			},
			customRequest: async ({ file, onSuccess, onError }: any) => {
				try {
					const rawFile = file as File;
					const matched = defaultDocumentItems.find((item) => item.key === key);
					updateDocumentItem(key, {
						fileName: rawFile.name,
						size: rawFile.size,
						status: 'uploading',
					});
					const contentBase64 = await fileToBase64(rawFile);
					const response = await uploadAdmissionDocument({
						key,
						label: matched?.label || key,
						fileName: rawFile.name,
						mimeType: rawFile.type || 'application/octet-stream',
						contentBase64,
					});
					const nextDocuments = mergeDocumentItems(documents, key, response.data.data);
					setDocuments(nextDocuments);
					await saveDocumentsInfo({
						items: nextDocuments,
					});
					await loadApplication();
					onSuccess?.('ok');
				} catch (error: any) {
					updateDocumentItem(key, {
						status: 'error',
					});
					onError?.(error);
					message.error(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Không thể tải tệp lên');
				}
			},
			onRemove: () => {
				updateDocumentItem(key, {
					fileName: undefined,
					size: undefined,
					status: 'missing',
					fileUrl: '',
				});
				return true;
			},
		};
	};

	const addWish = () => {
		setWishes((items) => [
			...items,
			{
				id: Date.now(),
				school: selectedSchool,
				major: selectedMajor || availableMajors[0],
				group: selectedGroup,
			},
		]);
	};

	const removeWish = (id: number | string) => {
		setWishes((items) => items.filter((item) => item.id !== id));
	};

	const moveWish = (targetIndex: number) => {
		if (dragIndex === null || dragIndex === targetIndex) {
			return;
		}

		setWishes((items) => {
			const updated = [...items];
			const [dragged] = updated.splice(dragIndex, 1);
			updated.splice(targetIndex, 0, dragged);
			return updated;
		});
		setDragIndex(null);
	};

	const persistCurrentStep = async (step: number, validate = true, enforceStepRules = true) => {
		if (step === 0) {
			const values = validate ? await personalForm.validateFields() : personalForm.getFieldsValue(true);
			const payload = {
				...values,
				birthday: values.birthday?.format ? values.birthday.format('YYYY-MM-DD') : values.birthday,
			};
			const response = await savePersonalInfo(payload);
			syncApplicationData(response.data.data);
			return response.data.data;
		}

		if (step === 1) {
			if (enforceStepRules) {
				validateRequiredDocuments(documents);
			}
			const response = await saveDocumentsInfo({
				items: documents,
			});
			syncApplicationData(response.data.data);
			return response.data.data;
		}

		if (step === 2) {
			const values = validate ? await academicForm.validateFields() : academicForm.getFieldsValue(true);
			const response = await saveAcademicInfo(values);
			syncApplicationData(response.data.data);
			return response.data.data;
		}

		if (step === 3) {
			if (enforceStepRules && wishes.length === 0) {
				throw new Error('Vui lòng thêm ít nhất một nguyện vọng xét tuyển');
			}
			const response = await saveAdmissionWishes(
				wishes.map((wish) => ({
					school: wish.school,
					major: wish.major,
					group: wish.group,
				})),
			);
			syncApplicationData(response.data.data);
			return response.data.data;
		}
	};

	const persistAllSections = async () => {
		await persistCurrentStep(0, false);
		await persistCurrentStep(1, true, false);
		await persistCurrentStep(2, false);
		return persistCurrentStep(3, true, false);
	};

	const handleNext = async () => {
		try {
			if (isSubmissionLocked) {
				message.info('Hồ sơ đã được gửi. Bạn chỉ có thể xem lại thông tin.');
				return;
			}
			setSaving(true);
			await persistCurrentStep(currentStep);
			setCurrentStep((step) => Math.min(step + 1, stepItems.length - 1));
		} catch (error: any) {
			message.error(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Không thể lưu bước hiện tại');
		} finally {
			setSaving(false);
		}
	};

	const handleSubmitApplication = async () => {
		try {
			if (isSubmissionLocked) {
				message.info('Hồ sơ đã được gửi và không thể chỉnh sửa hoặc nộp lại.');
				return;
			}
			if (!confirmChecked) {
				message.error('Vui lòng xác nhận toàn bộ thông tin là chính xác trước khi nộp hồ sơ');
				return;
			}
			setSaving(true);
			const latestApplication = await persistAllSections();
			const missingItems = latestApplication?.checklist?.filter((item: any) => !item.done) || [];
			if (missingItems.length > 0) {
				message.error(`Chưa hoàn thiện mục ${missingItems[0].label}`);
				setCurrentStep(missingItems[0].step);
				return;
			}
			const response = await submitAdmissionApplication(confirmChecked);
			syncApplicationData(response.data.data);
			message.success('Đã nộp hồ sơ thành công');
		} catch (error: any) {
			message.error(error?.response?.data?.error || error?.response?.data?.message || error?.message || 'Không thể nộp hồ sơ');
		} finally {
			setSaving(false);
		}
	};

	const statusLabel = useMemo(() => {
		if (applicationStatus === 'submitted') return 'Chờ duyệt';
		if (applicationStatus === 'reviewing') return 'Đang xử lý';
		if (applicationStatus === 'approved') return 'Đã duyệt';
		if (applicationStatus === 'rejected') return 'Từ chối';
		if (applicationStatus === 'needs_revision') return 'Cần bổ sung';
		return 'Bản nháp';
	}, [applicationStatus]);

	const isSubmissionLocked = useMemo(() => applicationStatus !== 'draft', [applicationStatus]);

	const reviewChecklist = useMemo(
		() =>
			checklist.map((item) =>
				item.key === 'wishes'
					? {
							...item,
							done: wishes.length > 0,
							detail: wishes.length > 0 ? undefined : 'Chưa thêm nguyện vọng xét tuyển',
					  }
					: item,
			),
		[checklist, wishes],
	);

	const renderPersonalInfo = () => (
		<Form form={personalForm} layout="vertical" requiredMark={false}>
			<div className={styles.formGroup}>
				<div className={styles.groupTitle}>
					<UserOutlined /> Thông tin cá nhân
				</div>
				<div className={styles.gridThree}>
					<Form.Item label={renderRequiredLabel('Họ tên')} name="fullName" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
						<Input placeholder="Nhập họ tên theo CCCD" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label={renderRequiredLabel('Ngày sinh')} name="birthday" rules={[{ required: true, message: 'Vui lòng chọn ngày sinh' }]}>
						<DatePicker format="DD/MM/YYYY" placeholder="Chọn ngày sinh" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label={renderRequiredLabel('Giới tính')} name="gender" rules={[{ required: true, message: 'Vui lòng chọn giới tính' }]}>
						<Select placeholder="Chọn giới tính" disabled={isSubmissionLocked}>
							<Select.Option value="male">Nam</Select.Option>
							<Select.Option value="female">Nữ</Select.Option>
							<Select.Option value="other">Khác</Select.Option>
						</Select>
					</Form.Item>
					<Form.Item label={renderRequiredLabel('Dân tộc')} name="ethnicity" rules={[{ required: true, message: 'Vui lòng chọn dân tộc' }]}>
						<Select showSearch placeholder="Chọn dân tộc" disabled={isSubmissionLocked}>
							{ethnicities.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item label="Tôn giáo" name="religion">
						<Input placeholder="Không hoặc tên tôn giáo" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label="Nơi sinh" name="birthPlace">
						<Select showSearch placeholder="Chọn nơi sinh" disabled={isSubmissionLocked}>
							{provinces.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item label={renderRequiredLabel('Số điện thoại')} name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
						<Input placeholder="Số điện thoại thí sinh" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Số căn cước công dân')}
						name="citizenId"
						rules={[{ required: true, message: 'Vui lòng nhập số CCCD' }]}
					>
						<Input placeholder="Nhập 12 số CCCD" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label="Địa chỉ thường trú" name="address" className={styles.fullWidthField}>
						<Input.TextArea rows={3} placeholder="Số nhà, đường/phố, phường/xã, quận/huyện, tỉnh/thành phố" disabled={isSubmissionLocked} />
					</Form.Item>
				</div>
			</div>
		</Form>
	);

	const renderDocuments = () => (
		<div className={styles.uploadGrid}>
			{defaultDocumentItems.map((item) => (
				<div className={styles.uploadCard} key={item.key}>
					<div className={styles.uploadHeader}>
						<FileImageOutlined />
						<strong>
							{item.label} <span className={styles.requiredMark}>*</span>
						</strong>
					</div>
					<Dragger {...buildUploadProps(item.key)}>
						<p className="ant-upload-drag-icon">
							<FileImageOutlined />
						</p>
						<p className="ant-upload-text">Kéo thả file hoặc bấm để tải lên</p>
						<p className="ant-upload-hint">JPG/PNG/PDF, dung lượng tối đa 5MB. Tệp sẽ được tải lên và lưu vào backend.</p>
					</Dragger>
					<Button
						size="small"
						className={styles.secondaryButton}
						disabled={!documents.find((entry) => entry.key === item.key)?.fileUrl}
						onClick={() => {
							const selectedDocument = documents.find((entry) => entry.key === item.key);
							if (selectedDocument?.fileUrl) {
								setPreviewDocument(selectedDocument);
							}
						}}
					>
						Xem ảnh lớn
					</Button>
				</div>
			))}
		</div>
	);

	const renderStudy = () => (
		<Form form={academicForm} layout="vertical" requiredMark={false}>
			<div className={styles.formGroup}>
				<div className={styles.groupTitle}>
					<BookOutlined /> Thông tin học tập
				</div>
				<div className={styles.gridTwo}>
					<Form.Item label={renderRequiredLabel('Năm tốt nghiệp')} name="graduationYear" rules={[{ required: true, message: 'Vui lòng chọn năm tốt nghiệp' }]}>
						<Select placeholder="Chọn năm tốt nghiệp" disabled={isSubmissionLocked}>
							{graduationYears.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Học lực lớp 12')}
						name="grade12AcademicPerformance"
						rules={[{ required: true, message: 'Vui lòng chọn học lực lớp 12' }]}
					>
						<Select placeholder="Chọn học lực lớp 12" disabled={isSubmissionLocked}>
							{academicRanks.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Hạnh kiểm lớp 12')}
						name="grade12Conduct"
						rules={[{ required: true, message: 'Vui lòng chọn hạnh kiểm lớp 12' }]}
					>
						<Select placeholder="Chọn hạnh kiểm lớp 12" disabled={isSubmissionLocked}>
							{conductRanks.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item label="Số báo danh thi tốt nghiệp THPT" name="graduationExamRegistrationNumber">
						<Input placeholder="Nhập số báo danh" disabled={isSubmissionLocked} />
					</Form.Item>
				</div>
			</div>

			<div className={styles.formGroup}>
				<div className={styles.groupTitle}>Quá trình THPT</div>
				<div className={styles.gridTwo}>
					<Form.Item
						label={renderRequiredLabel('Chọn Tỉnh/TP/Cục (THPT Lớp 10)')}
						name="grade10Province"
						rules={[{ required: true, message: 'Vui lòng chọn Tỉnh/TP/Cục lớp 10' }]}
					>
						<Select showSearch placeholder="Chọn Tỉnh/TP/Cục (THPT Lớp 10)" disabled={isSubmissionLocked}>
							{provinces.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Chọn Trường THPT/Khác (THPT Lớp 10)')}
						name="grade10School"
						rules={[{ required: true, message: 'Vui lòng chọn Trường THPT/Khác lớp 10' }]}
					>
						<Select showSearch placeholder="Chọn Trường THPT/Khác (THPT Lớp 10)" disabled={isSubmissionLocked}>
							{highSchools.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Chọn Tỉnh/TP/Cục (THPT Lớp 11)')}
						name="grade11Province"
						rules={[{ required: true, message: 'Vui lòng chọn Tỉnh/TP/Cục lớp 11' }]}
					>
						<Select showSearch placeholder="Chọn Tỉnh/TP/Cục (THPT Lớp 11)" disabled={isSubmissionLocked}>
							{provinces.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Chọn Trường THPT/Khác (THPT Lớp 11)')}
						name="grade11School"
						rules={[{ required: true, message: 'Vui lòng chọn Trường THPT/Khác lớp 11' }]}
					>
						<Select showSearch placeholder="Chọn Trường THPT/Khác (THPT Lớp 11)" disabled={isSubmissionLocked}>
							{highSchools.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Chọn Tỉnh/TP/Cục (THPT Lớp 12)')}
						name="grade12Province"
						rules={[{ required: true, message: 'Vui lòng chọn Tỉnh/TP/Cục lớp 12' }]}
					>
						<Select showSearch placeholder="Chọn Tỉnh/TP/Cục (THPT Lớp 12)" disabled={isSubmissionLocked}>
							{provinces.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Chọn Trường THPT/Khác (THPT Lớp 12)')}
						name="grade12School"
						rules={[{ required: true, message: 'Vui lòng chọn Trường THPT/Khác lớp 12' }]}
					>
						<Select showSearch placeholder="Chọn Trường THPT/Khác (THPT Lớp 12)" disabled={isSubmissionLocked}>
							{highSchools.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
				</div>
			</div>

			<div className={styles.formGroup}>
				<div className={styles.groupTitle}>Thông tin ưu tiên</div>
				<div className={styles.gridTwo}>
					<Form.Item label={renderRequiredLabel('Khu vực ưu tiên')} name="priorityArea" rules={[{ required: true, message: 'Vui lòng chọn khu vực ưu tiên' }]}>
						<Select placeholder="Chọn khu vực ưu tiên" disabled={isSubmissionLocked}>
							{priorityAreas.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
					<Form.Item
						label={renderRequiredLabel('Đối tượng ưu tiên')}
						name="priorityGroup"
						rules={[{ required: true, message: 'Vui lòng chọn đối tượng ưu tiên' }]}
					>
						<Select placeholder="Chọn đối tượng ưu tiên" disabled={isSubmissionLocked}>
							{priorityGroups.map((item) => (
<Select.Option key={item} value={item}>{item}</Select.Option>
							))}
						</Select>
					</Form.Item>
				</div>
			</div>

			<div className={styles.formGroup}>
				<div className={styles.groupTitle}>Điểm thi THPT</div>
				<div className={styles.gridThree}>
					<Form.Item label="Điểm môn 1 (Toán)" name="scoreSubject1" rules={[{ required: true, message: 'Vui lòng nhập điểm môn 1' }]}>
						<Input type="number" min={0} max={10} step={0.25} placeholder="0 - 10" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label="Điểm môn 2 (Lý)" name="scoreSubject2" rules={[{ required: true, message: 'Vui lòng nhập điểm môn 2' }]}>
						<Input type="number" min={0} max={10} step={0.25} placeholder="0 - 10" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label="Điểm môn 3 (Hóa)" name="scoreSubject3" rules={[{ required: true, message: 'Vui lòng nhập điểm môn 3' }]}>
						<Input type="number" min={0} max={10} step={0.25} placeholder="0 - 10" disabled={isSubmissionLocked} />
					</Form.Item>
				</div>
				<div className={styles.gridTwo} style={{ marginTop: 8 }}>
					<Form.Item label="Tổng điểm 3 môn" name="totalScore">
						<Input type="number" placeholder="Tự động tính hoặc nhập tay" disabled={isSubmissionLocked} />
					</Form.Item>
					<Form.Item label="Điểm ưu tiên" name="priorityScore">
						<Input type="number" placeholder="Điểm cộng ưu tiên" disabled={isSubmissionLocked} />
					</Form.Item>
				</div>
			</div>
		</Form>
	);

	const renderWishes = () => (
		<div>
			<div className={styles.selectionSteps}>
				<div>
					<span>
						Chọn trường <span className={styles.requiredMark}>*</span>
					</span>
					<Select value={selectedSchool} showSearch onChange={setSelectedSchool} disabled={isSubmissionLocked}>
						{schools.map((school) => (
 <Select.Option key={school} value={school}>{school}</Select.Option>
						))}
					</Select>
				</div>
				<div>
					<span>
						Chọn ngành <span className={styles.requiredMark}>*</span>
					</span>
					<Select value={selectedMajor} showSearch onChange={setSelectedMajor} disabled={isSubmissionLocked}>
						{availableMajors.map((major) => (
 <Select.Option key={major} value={major}>{major}</Select.Option>
						))}
					</Select>
				</div>
				<div>
					<span>
						Chọn tổ hợp <span className={styles.requiredMark}>*</span>
					</span>
					<Select value={selectedGroup} onChange={setSelectedGroup} disabled={isSubmissionLocked}>
						{subjectGroups.map((group) => (
 <Select.Option key={group} value={group}>{group}</Select.Option>
						))}
					</Select>
				</div>
				<Button icon={<PlusOutlined />} type="primary" onClick={addWish} disabled={isSubmissionLocked}>
					Thêm nguyện vọng
				</Button>
			</div>

			<div className={styles.wishList}>
				{wishes.map((wish, index) => (
					<div
						key={wish.id}
						className={styles.wishItem}
						draggable={!isSubmissionLocked}
						onDragStart={() => {
							if (!isSubmissionLocked) {
								setDragIndex(index);
							}
						}}
						onDragOver={(event) => {
							if (!isSubmissionLocked) {
								event.preventDefault();
							}
						}}
						onDrop={() => {
							if (!isSubmissionLocked) {
								moveWish(index);
							}
						}}
					>
						<DragOutlined />
						<strong>NV{index + 1}</strong>
						<div>
							<span>{wish.school}</span>
							<Text>
								{wish.major} - {wish.group}
							</Text>
						</div>
						<Button icon={<DeleteOutlined />} danger onClick={() => removeWish(wish.id)} disabled={isSubmissionLocked} />
					</div>
				))}
			</div>
		</div>
	);

	const renderReview = () => (
		<div className={styles.reviewGrid}>
			<div className={styles.checklist}>
				{reviewChecklist.map((item) => (
					<div className={item.done ? styles.checkItemDone : styles.checkItemMissing} key={item.key}>
						{item.done ? <CheckCircleOutlined /> : <WarningOutlined />}
						<div>
							<strong>{item.label}</strong>
							{item.detail && <span>{item.detail}</span>}
						</div>
						{!item.done && (
							<Button size="small" onClick={() => setCurrentStep(item.step)} disabled={isSubmissionLocked}>
								Đi đến màn hình cần bổ sung
							</Button>
						)}
					</div>
				))}
			</div>
			<div className={styles.submitPanel}>
				<Title level={4}>Xác nhận & Nộp hồ sơ</Title>
				{isSubmissionLocked && (
					<Alert
						type="info"
						showIcon
						message="Hồ sơ đã được gửi"
						description="Bạn chỉ có thể xem lại thông tin. Hệ thống không cho chỉnh sửa hoặc nộp lại hồ sơ này."
					/>
				)}
				<Checkbox checked={confirmChecked} onChange={(event) => setConfirmChecked(event.target.checked)} disabled={isSubmissionLocked}>
					Tôi xác nhận toàn bộ thông tin là chính xác.
				</Checkbox>
				<Button
					icon={<SendOutlined />}
					type="primary"
					onClick={handleSubmitApplication}
					className={styles.submitButton}
					loading={saving}
					disabled={isSubmissionLocked}
				>
					Nộp hồ sơ
				</Button>
			</div>
		</div>
	);

	const renderTracking = () => (
		<div className={styles.tracking}>
			<Title level={4}>Theo dõi hồ sơ</Title>
			<Timeline>
				<Timeline.Item color="green">Đã tạo hồ sơ tuyển sinh</Timeline.Item>
				<Timeline.Item color={applicationStatus === 'submitted' || applicationStatus === 'reviewing' || applicationStatus === 'approved' ? 'blue' : 'gray'}>
					Chờ duyệt
				</Timeline.Item>
				<Timeline.Item color={applicationStatus === 'reviewing' || applicationStatus === 'approved' ? 'blue' : 'gray'}>Đang xử lý</Timeline.Item>
				<Timeline.Item color={applicationStatus === 'approved' ? 'green' : applicationStatus === 'rejected' ? 'red' : 'gray'}>
					{applicationStatus === 'rejected' ? 'Từ chối' : 'Đã duyệt'}
				</Timeline.Item>
			</Timeline>
			<Alert
				type={applicationStatus === 'rejected' ? 'error' : applicationStatus === 'approved' ? 'success' : 'info'}
				showIcon
				message={`Trạng thái hiện tại: ${statusLabel}`}
				description={
					rejectionReason
						? `Lý do: ${rejectionReason}`
						: submittedAt
						? `Hồ sơ đã được nộp lúc ${moment(submittedAt).format('DD/MM/YYYY HH:mm')}`
						: 'Bạn có thể hoàn thiện từng bước và nộp hồ sơ khi checklist đã đầy đủ.'
				}
			/>
		</div>
	);

	const renderStepContent = () => {
		if (currentStep === 0) return renderPersonalInfo();
		if (currentStep === 1) return renderDocuments();
		if (currentStep === 2) return renderStudy();
		if (currentStep === 3) return renderWishes();
		return renderReview();
	};

	const accountPopoverContent = (
		<div className={styles.accountPopover} onClick={(event) => event.stopPropagation()}>
			<div className={styles.accountPopoverHeader}>
				<div className={styles.avatar}>{user.full_name?.charAt(0) || 'S'}</div>
				<div>
					<Title level={5}>{user.full_name}</Title>
					<Text>{user.email}</Text>
				</div>
			</div>
			<div className={styles.accountInfoList}>
				<div className={styles.accountInfoItem}>
					<span>Họ và tên</span>
					<strong>{user.full_name}</strong>
				</div>
				<div className={styles.accountInfoItem}>
					<span>Email đăng ký</span>
					<strong>{user.email}</strong>
				</div>
				<div className={styles.accountInfoItem}>
					<span>SĐT đăng ký</span>
					<strong>{user.phone || 'Chưa cập nhật'}</strong>
				</div>
			</div>
			<Button
				icon={<LogoutOutlined />}
				onClick={() => {
					setAccountOpen(false);
					handleLogout();
				}}
				className={styles.logoutButton}
			>
				Đăng xuất
			</Button>
		</div>
	);

	if (loading) {
		return (
			<div className={styles.page}>
				<div className={styles.workspace}>
					<div className={styles.content}>
						<div className={styles.stepPanel}>
							<Spin />
						</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.page}>
			<header className={styles.header}>
				<div>
					<Text>Cổng tuyển sinh trực tuyến</Text>
					<Title level={2}>Hồ sơ tuyển sinh của tôi</Title>
				</div>
			</header>

			<main className={styles.workspace}>
				<aside className={styles.sidebar}>
					<Steps direction="vertical" current={currentStep} onChange={setCurrentStep}>
						{stepItems.map((item) => (
							<Step key={item} title={item} />
						))}
					</Steps>
					<Divider />
					{renderTracking()}
				</aside>

				<section className={styles.content}>
					<div className={styles.contentHeader}>
						<div>
							<Text>
								Bước {currentStep + 1} / {stepItems.length}
							</Text>
							<Title level={3}>{stepItems[currentStep]}</Title>
						</div>
						<div className={styles.contentHeaderActions}>
							<Button onClick={() => history.push('/student')}>
								<HomeOutlined /> Trang chủ
							</Button>
							<Popover
								content={accountPopoverContent}
								trigger="click"
								placement="bottomRight"
								visible={accountOpen}
								onVisibleChange={setAccountOpen}
								overlayClassName={styles.accountPopoverOverlay}
							>
								<Button className={styles.accountTrigger} icon={<UserOutlined />}>
									Tài khoản
								</Button>
							</Popover>
						</div>
					</div>
					<div className={styles.stepPanel}>{renderStepContent()}</div>
					<div className={styles.navigation}>
						<Button disabled={currentStep === 0 || saving} onClick={() => setCurrentStep((step) => step - 1)}>
							Quay lại
						</Button>
						<Button type="primary" disabled={currentStep === stepItems.length - 1 || isSubmissionLocked} onClick={handleNext} loading={saving}>
							Tiếp tục
						</Button>
					</div>
				</section>
			</main>

			<Modal
				title={previewDocument?.label || 'Xem minh chứng'}
				visible={Boolean(previewDocument)}
				width={920}
				centered
				onCancel={() => setPreviewDocument(null)}
				footer={[
					<Button key="close" onClick={() => setPreviewDocument(null)}>
						Đóng
					</Button>,
					<Button
						key="open"
						type="primary"
						disabled={!previewUrl}
						onClick={() => {
							if (previewUrl) {
								window.open(previewUrl, '_blank', 'noopener,noreferrer');
							}
						}}
					>
						Mở tab mới
					</Button>,
				]}
			>
				<div className={styles.previewContent}>
					{previewUrl ? (
						previewIsPdf ? (
							<iframe title={previewDocument?.label || 'Xem tài liệu'} src={previewUrl} className={styles.previewFrame} />
						) : (
							<img src={previewUrl} alt={previewDocument?.label || 'Xem minh chứng'} className={styles.previewImage} />
						)
					) : (
						<Text>Không có tệp để xem trước.</Text>
					)}
				</div>
			</Modal>

			<ChatBubble isOpen={isChatOpen} onToggle={() => setIsChatOpen((v) => !v)} />
		</div>
	);
};

export default StudentPage;
