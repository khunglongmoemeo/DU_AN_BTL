export type ApplicationStatus = 'draft' | 'submitted' | 'reviewing' | 'approved' | 'rejected' | 'needs_revision';

export interface AdmissionJwtPayload {
	id: number;
	role: 'manager' | 'student';
	username: string;
}

export interface AdmissionWishPayload {
	school: string;
	major: string;
	group: string;
}

export interface AdmissionPersonalInfoPayload {
	fullName: string;
	birthday?: string;
	gender?: string;
	ethnicity?: string;
	religion?: string;
	birthPlace?: string;
	phone: string;
	citizenId: string;
	address?: string;
}

export interface AdmissionAcademicInfoPayload {
	graduationYear: string;
	grade12AcademicPerformance: string;
	grade12Conduct: string;
	graduationExamRegistrationNumber?: string;
	grade10Province: string;
	grade10School: string;
	grade11Province: string;
	grade11School: string;
	grade12Province: string;
	grade12School: string;
	priorityArea: string;
	priorityGroup: string;
	scoreSubject1?: number;
	scoreSubject2?: number;
	scoreSubject3?: number;
	totalScore?: number;
	priorityScore?: number;
}

export interface AdmissionDocumentItemPayload {
	key: string;
	label: string;
	fileName?: string;
	fileUrl?: string;
	status?: string;
	size?: number;
}

export interface AdmissionDocumentsPayload {
	items: AdmissionDocumentItemPayload[];
}

export interface AdmissionChecklistItem {
	key: string;
	label: string;
	done: boolean;
	detail?: string;
	step: number;
}
