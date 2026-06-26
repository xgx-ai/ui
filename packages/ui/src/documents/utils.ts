/**
 * Document utilities - shared formatting and categorization functions
 */

// ─── File Category Types ──────────────────────────────────────────────────────

export type FileCategory =
	| "pdf"
	| "image"
	| "sheet"
	| "presentation"
	| "video"
	| "doc"
	| "text"
	| "archive"
	| "form"
	| "other";

export type ViewerFileCategory = "pdf" | "image" | "doc" | "text" | "other";

const TEXT_FILE_EXTENSIONS = new Set([
	"md",
	"markdown",
	"mdx",
	"vtt",
	"txt",
	"text",
	"log",
	"csv",
	"tsv",
	"json",
	"jsonl",
	"ndjson",
	"xml",
	"yaml",
	"yml",
	"toml",
	"ini",
	"conf",
	"cfg",
	"html",
	"htm",
	"css",
	"js",
	"jsx",
	"ts",
	"tsx",
	"mjs",
	"cjs",
	"sql",
	"sh",
]);

function isTextFileCategory(extension: string, mimeType: string) {
	return (
		TEXT_FILE_EXTENSIONS.has(extension) ||
		mimeType.startsWith("text/") ||
		mimeType.endsWith("+json") ||
		mimeType.endsWith("+xml")
	);
}

// ─── File Category Detection ──────────────────────────────────────────────────

/**
 * Get full file category for display purposes (badges, icons, etc.)
 */
export function getFileCategory(
	extension?: string,
	mimeType?: string,
): FileCategory {
	if (!extension && !mimeType) return "other";

	const ext = extension?.toLowerCase() || "";
	const mime = mimeType?.toLowerCase() || "";

	if (ext === "pdf" || mime.includes("pdf")) return "pdf";
	if (
		["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(ext) ||
		mime.startsWith("image/")
	)
		return "image";
	if (
		["xlsx", "xls", "csv", "numbers"].includes(ext) ||
		mime.includes("spreadsheet") ||
		mime.includes("excel")
	)
		return "sheet";
	if (
		["pptx", "ppt", "key"].includes(ext) ||
		mime.includes("presentation") ||
		mime.includes("powerpoint")
	)
		return "presentation";
	if (
		["mp4", "mov", "avi", "mkv", "webm"].includes(ext) ||
		mime.startsWith("video/")
	)
		return "video";
	if (
		["doc", "docx", "pages"].includes(ext) ||
		mime.includes("word") ||
		mime.includes("document")
	)
		return "doc";
	if (isTextFileCategory(ext, mime)) {
		return "text";
	}
	if (
		["zip", "rar", "7z", "tar", "gz"].includes(ext) ||
		mime.includes("archive") ||
		mime.includes("zip")
	)
		return "archive";
	if (mime === "form" || mime.includes("form")) return "form";

	return "other";
}

/**
 * Get viewer-specific file category.
 */
export function getViewerFileCategory(
	extension?: string,
	mimeType?: string,
): ViewerFileCategory {
	if (!extension && !mimeType) return "other";

	const ext = extension?.toLowerCase() || "";
	const mime = mimeType?.toLowerCase() || "";

	if (ext === "pdf" || mime.includes("pdf")) return "pdf";
	if (
		["jpg", "jpeg", "png", "gif", "webp", "svg", "heic"].includes(ext) ||
		mime.startsWith("image/")
	)
		return "image";
	if (
		["doc", "docx", "pages"].includes(ext) ||
		mime.includes("word") ||
		mime.includes("document")
	)
		return "doc";
	if (isTextFileCategory(ext, mime)) {
		return "text";
	}

	return "other";
}

// ─── Formatting Functions ─────────────────────────────────────────────────────

/**
 * Format file size in human-readable format
 */
export function formatFileSize(bytes?: number): string {
	if (!bytes) return "";
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

/**
 * Format date as relative time (e.g., "5m ago", "Yesterday")
 */
export function formatDate(date: Date | string | null | undefined): string {
	if (!date) return "Never";
	const d = typeof date === "string" ? new Date(date) : date;
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return "Just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays === 1) return "Yesterday";
	if (diffDays < 7) return `${diffDays}d ago`;
	return d.toLocaleDateString();
}

/**
 * Get download filename by stripping timestamp prefix
 */
export function getDownloadFileName(name: string): string {
	return name.replace(/^\d+_/, "");
}

/**
 * Append PDF viewer fragment params without disturbing signed URL query params.
 */
export function withPdfViewerParams(
	url: string,
	params: Record<string, string>,
): string {
	const fragment = new URLSearchParams(
		url.includes("#") ? url.split("#")[1] : "",
	);

	for (const [key, value] of Object.entries(params)) {
		fragment.set(key, value);
	}

	const baseUrl = url.split("#")[0] ?? url;
	const fragmentString = fragment.toString();
	return fragmentString ? `${baseUrl}#${fragmentString}` : baseUrl;
}
