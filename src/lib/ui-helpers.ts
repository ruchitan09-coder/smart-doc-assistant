// Small shared helpers for consistent file-type icons and status pill styling
// across the dashboard, documents list, and document viewer.

export function fileTypeIcon(fileType: string): string {
  switch (fileType) {
    case "pdf": return "📕";
    case "docx": return "📘";
    case "txt": return "📄";
    case "png":
    case "jpg":
    case "jpeg": return "🖼️";
    default: return "📁";
  }
}

export function statusPillClass(status: string): string {
  switch (status) {
    case "READY": return "status-pill status-ready";
    case "PROCESSING": return "status-pill status-processing";
    case "UPLOADING": return "status-pill status-uploading";
    case "FAILED": return "status-pill status-failed";
    default: return "status-pill status-uploading";
  }
}

export function statusDot(status: string): string {
  switch (status) {
    case "READY": return "🟢";
    case "PROCESSING": return "🟡";
    case "FAILED": return "🔴";
    default: return "⚪";
  }
}
