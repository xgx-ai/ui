const SUPPORTED_UPLOAD_TYPES = [
	{
		extensions: ["pdf"],
		mimeTypes: ["application/pdf"],
	},
	{
		extensions: ["docx"],
		mimeTypes: [
			"application/vnd.openxmlformats-officedocument.wordprocessingml.document",
		],
	},
	{
		extensions: ["md", "markdown", "mdx"],
		mimeTypes: ["text/markdown", "text/x-markdown", "application/markdown"],
	},
	{
		extensions: ["vtt"],
		mimeTypes: ["text/vtt"],
	},
	{
		extensions: [
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
		],
		mimeTypes: [
			"text/plain",
			"text/csv",
			"text/tab-separated-values",
			"application/json",
			"application/ld+json",
			"application/x-ndjson",
			"application/xml",
			"application/yaml",
			"application/x-yaml",
			"application/toml",
			"text/html",
			"text/css",
			"text/javascript",
			"application/javascript",
			"application/x-javascript",
			"application/sql",
			"application/x-sh",
		],
		canonicalMimeType: "text/plain",
	},
] as const;

const MIME_TYPE_TO_CANONICAL = new Map<string, string>();
const EXTENSION_TO_CANONICAL_MIME = new Map<string, string>();
const PLAIN_TEXT_MIME_TYPE = "text/plain";

for (const type of SUPPORTED_UPLOAD_TYPES) {
	const canonicalMimeType =
		"canonicalMimeType" in type ? type.canonicalMimeType : type.mimeTypes[0];
	for (const mimeType of type.mimeTypes) {
		MIME_TYPE_TO_CANONICAL.set(mimeType, canonicalMimeType);
	}
	for (const extension of type.extensions) {
		EXTENSION_TO_CANONICAL_MIME.set(extension, canonicalMimeType);
	}
}

export const SUPPORTED_INGEST_UPLOAD_ACCEPT = SUPPORTED_UPLOAD_TYPES.flatMap(
	(type) => [
		...type.mimeTypes,
		...type.extensions.map((extension) => `.${extension}`),
	],
)
	.concat("text/*")
	.join(",");

function normaliseUploadPath(path: string | null | undefined) {
	return (
		path
			?.replace(/\\/g, "/")
			.replace(/^\/+|\/+$/g, "")
			.trim() ?? ""
	);
}

function getRelativePath(file: File) {
	return (
		(file as File & { webkitRelativePath?: string }).webkitRelativePath || ""
	);
}

function getPathSegments(file: File) {
	const relativePath = normaliseUploadPath(getRelativePath(file));
	if (relativePath) {
		return relativePath.split("/").filter(Boolean);
	}

	const cleanedFileName = file.name.trim();
	return cleanedFileName ? [cleanedFileName] : [];
}

function getFileExtension(fileName: string) {
	const trimmedFileName = fileName.trim().toLowerCase();
	const lastDotIndex = trimmedFileName.lastIndexOf(".");
	if (lastDotIndex <= 0 || lastDotIndex === trimmedFileName.length - 1) {
		return "";
	}

	return trimmedFileName.slice(lastDotIndex + 1);
}

function normaliseMimeType(mimeType: string | null | undefined) {
	return mimeType?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function isPlainTextMimeType(mimeType: string) {
	return (
		mimeType.startsWith("text/") ||
		mimeType.endsWith("+json") ||
		mimeType.endsWith("+xml")
	);
}

function resolveCanonicalMimeType(
	normalisedMimeType: string,
	extension: string,
) {
	const canonicalMimeTypeFromMime =
		MIME_TYPE_TO_CANONICAL.get(normalisedMimeType) ?? null;
	const canonicalMimeTypeFromExtension =
		EXTENSION_TO_CANONICAL_MIME.get(extension) ?? null;

	if (
		canonicalMimeTypeFromMime &&
		canonicalMimeTypeFromMime !== PLAIN_TEXT_MIME_TYPE
	) {
		return canonicalMimeTypeFromMime;
	}

	return (
		canonicalMimeTypeFromExtension ??
		canonicalMimeTypeFromMime ??
		(isPlainTextMimeType(normalisedMimeType) ? PLAIN_TEXT_MIME_TYPE : null)
	);
}

export function getUploadDisplayPath(file: File) {
	const relativePath = normaliseUploadPath(getRelativePath(file));
	return relativePath || file.name;
}

export function validateUploadFile(file: File) {
	const pathSegments = getPathSegments(file);
	const resolvedFileName = pathSegments.at(-1)?.trim() ?? file.name.trim();

	if (!resolvedFileName) {
		return {
			ok: false as const,
			error: "File name is required",
		};
	}

	if (pathSegments.some((segment) => segment.startsWith("."))) {
		return {
			ok: false as const,
			error: "Hidden files and folders are not supported",
		};
	}

	const normalisedMimeType = normaliseMimeType(file.type);
	const extension = getFileExtension(resolvedFileName);
	const canonicalMimeType = resolveCanonicalMimeType(
		normalisedMimeType,
		extension,
	);

	if (!canonicalMimeType) {
		return {
			ok: false as const,
			error:
				"Unsupported file type. Supported formats: PDF, DOCX and plain text files.",
		};
	}

	return {
		ok: true as const,
		mimeType: canonicalMimeType,
		relativePath: getUploadDisplayPath(file),
	};
}
