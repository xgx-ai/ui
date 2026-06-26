/**
 * Document Explorer types and constants
 */
import {
	Archive,
	ClipboardList,
	FileText,
	Image as ImageIcon,
	Presentation,
	Table,
	Video,
} from "../icons.index.ts";
import type { FileCategory } from "./utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type DocumentNode = {
	id: string;
	name: string;
	type: "file" | "folder" | "form";
	path: string;
	parentId?: string | null;
	description?: string | null;
	updatedAt: Date | string | null;
	url?: string | null;
	metaData?: {
		size?: number;
		extension?: string;
		mimeType?: string;
		url?: string;
	} | null;
	ingestionState?: {
		phase: "processing" | "ready" | "error";
		progress: number;
		statusLabel: string;
		error: string | null;
		errorMessage: string | null;
	} | null;
	folderSummary?: {
		totalDocuments: number;
		readyDocuments: number;
		processingDocuments: number;
		errorDocuments: number;
		progress: number;
		statusLabel: string;
	} | null;
	isAmaDataset?: boolean;
};

export type DocumentItem = DocumentNode & {
	isFolder: boolean;
	isForm?: boolean;
	uploadState?: {
		phase: "uploading" | "processing" | "ready" | "error";
		progress: number;
		statusLabel: string;
		error: string | null;
		errorMessage: string | null;
	};
};

export type FolderData = {
	folder: {
		id: string;
		name: string;
		description?: string | null;
		type: string;
		path: string;
		updatedAt: Date | string | null;
	} | null;
	breadcrumbs: Array<{
		id: string;
		name: string;
		type: string;
		path: string;
	}>;
	folders: DocumentNode[];
	files: DocumentNode[];
	forms: DocumentNode[];
};

// ─── Constants ────────────────────────────────────────────────────────────────

export const FILE_ICON_MAP: Record<FileCategory, typeof FileText> = {
	pdf: FileText,
	image: ImageIcon,
	sheet: Table,
	presentation: Presentation,
	video: Video,
	doc: FileText,
	text: FileText,
	archive: Archive,
	form: ClipboardList,
	other: FileText,
};

export const FILE_BADGE_META: Record<
	FileCategory,
	{
		label: string;
		bgClass: string;
		textClass: string;
	}
> = {
	pdf: {
		label: "PDF",
		bgClass: "bg-orange-100",
		textClass: "text-orange-700",
	},
	image: {
		label: "Image",
		bgClass: "bg-blue-100",
		textClass: "text-blue-700",
	},
	sheet: {
		label: "Sheet",
		bgClass: "bg-green-100",
		textClass: "text-green-700",
	},
	presentation: {
		label: "Deck",
		bgClass: "bg-pink-100",
		textClass: "text-pink-700",
	},
	video: {
		label: "Video",
		bgClass: "bg-orange-100",
		textClass: "text-orange-700",
	},
	doc: {
		label: "Doc",
		bgClass: "bg-cyan-100",
		textClass: "text-cyan-700",
	},
	text: {
		label: "Text",
		bgClass: "bg-slate-100",
		textClass: "text-slate-700",
	},
	archive: {
		label: "Archive",
		bgClass: "bg-muted",
		textClass: "text-muted-foreground",
	},
	form: {
		label: "Form",
		bgClass: "bg-purple-100",
		textClass: "text-purple-700",
	},
	other: {
		label: "File",
		bgClass: "bg-muted",
		textClass: "text-muted-foreground",
	},
};
