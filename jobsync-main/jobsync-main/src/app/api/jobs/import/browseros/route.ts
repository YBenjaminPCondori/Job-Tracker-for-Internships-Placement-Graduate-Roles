import { NextRequest, NextResponse } from "next/server";
import { importBrowserOsJobsFromCsvText } from "@/lib/jobs/browseros-import";

const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      totalRows: 0,
      imported: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [],
    },
    { status },
  );
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type") ?? "";
  let csvText = "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const csvFile = formData.get("file");

    if (
      !csvFile ||
      typeof csvFile === "string" ||
      typeof csvFile.text !== "function"
    ) {
      return jsonError("Upload a CSV file using the `file` form field.");
    }

    if (csvFile.size > MAX_IMPORT_BYTES) {
      return jsonError("CSV file is too large. Maximum size is 2 MB.");
    }

    csvText = await csvFile.text();
  } else if (
    contentType.includes("text/csv") ||
    contentType.includes("application/octet-stream")
  ) {
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (contentLength > MAX_IMPORT_BYTES) {
      return jsonError("CSV file is too large. Maximum size is 2 MB.");
    }

    csvText = await request.text();
  } else {
    return jsonError("Send a multipart form upload or a text/csv request body.");
  }

  if (!csvText.trim()) {
    return jsonError("CSV file is empty.");
  }

  const result = await importBrowserOsJobsFromCsvText(csvText);
  const status = result.success
    ? 200
    : result.message === "Not authenticated"
      ? 401
      : 400;

  return NextResponse.json(result, { status });
}
