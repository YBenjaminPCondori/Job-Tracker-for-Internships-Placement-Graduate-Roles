import "server-only";

import Papa from "papaparse";
import db from "@/lib/db";
import { getCurrentUser } from "@/utils/user.utils";
import { revalidatePath } from "next/cache";

const REQUIRED_IMPORT_FIELDS = [
  "title",
  "company",
  "location",
  "status",
  "deadline",
  "source",
  "application_url",
  "notes",
] as const;

type RequiredImportField = (typeof REQUIRED_IMPORT_FIELDS)[number];

type ImportCsvRow = Record<RequiredImportField, string>;

export type BrowserOsImportResult = {
  success: boolean;
  message?: string;
  totalRows: number;
  imported: number;
  skippedDuplicates: number;
  skippedInvalid: number;
  errors: string[];
};

const EMPTY_VALUES = new Set(["", "n/a", "na", "none", "null", "nan", "-"]);

function cleanCell(value: unknown): string {
  const cleaned = String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();

  return EMPTY_VALUES.has(cleaned.toLowerCase()) ? "" : cleaned;
}

function normaliseLookupValue(label: string): string {
  return cleanCell(label).toLowerCase();
}

function parseOptionalDate(value: string): Date | null {
  const cleaned = cleanCell(value);
  if (!cleaned) return null;

  const isoDate = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoDate) {
    const [, year, month, day] = isoDate;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(cleaned);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildJobDescription(row: ImportCsvRow): string {
  const notes = cleanCell(row.notes);
  const source = cleanCell(row.source) || "BrowserOS CSV import";
  const status = cleanCell(row.status) || "Found";

  const lines = [
    `Imported from ${source}.`,
    `Original import status: ${status}.`,
  ];

  if (notes) {
    lines.push("", notes);
  }

  return lines.join("\n");
}

async function getDraftStatusId(): Promise<string> {
  const status = await db.jobStatus.upsert({
    where: { value: "draft" },
    update: {},
    create: { label: "Draft", value: "draft" },
  });

  return status.id;
}

async function getOrCreateJobTitle(label: string, userId: string) {
  const value = normaliseLookupValue(label);

  return db.jobTitle.upsert({
    where: { value_createdBy: { value, createdBy: userId } },
    update: {},
    create: { label: cleanCell(label), value, createdBy: userId },
  });
}

async function getOrCreateCompany(label: string, userId: string) {
  const value = normaliseLookupValue(label);

  return db.company.upsert({
    where: { value_createdBy: { value, createdBy: userId } },
    update: {},
    create: { label: cleanCell(label), value, createdBy: userId },
  });
}

async function getOrCreateLocation(label: string, userId: string) {
  const value = normaliseLookupValue(label);

  return db.location.upsert({
    where: { value_createdBy: { value, createdBy: userId } },
    update: {},
    create: { label: cleanCell(label), value, createdBy: userId },
  });
}

async function getOrCreateJobSource(label: string, userId: string) {
  const safeLabel = cleanCell(label) || "Gradcracker / BrowserOS";
  const value = normaliseLookupValue(safeLabel);

  return db.jobSource.upsert({
    where: { value_createdBy: { value, createdBy: userId } },
    update: {},
    create: { label: safeLabel, value, createdBy: userId },
  });
}

function getMissingHeaders(fields: string[] | undefined): string[] {
  const available = new Set(fields ?? []);
  return REQUIRED_IMPORT_FIELDS.filter((field) => !available.has(field));
}

function makeDuplicateKey(row: ImportCsvRow): string {
  return [
    normaliseLookupValue(row.title),
    normaliseLookupValue(row.company),
    cleanCell(row.application_url).toLowerCase(),
  ].join("|");
}

async function existingImportedJobExists(row: ImportCsvRow, userId: string) {
  const titleValue = normaliseLookupValue(row.title);
  const companyValue = normaliseLookupValue(row.company);
  const applicationUrl = cleanCell(row.application_url);

  return db.job.findFirst({
    where: {
      userId,
      JobTitle: { value: titleValue, createdBy: userId },
      Company: { value: companyValue, createdBy: userId },
      ...(applicationUrl
        ? { jobUrl: applicationUrl }
        : { OR: [{ jobUrl: null }, { jobUrl: "" }] }),
    },
    select: { id: true },
  });
}

export async function importBrowserOsJobsFromCsvText(
  csvText: string,
): Promise<BrowserOsImportResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      success: false,
      message: "Not authenticated",
      totalRows: 0,
      imported: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: [],
    };
  }

  const parsed = Papa.parse<ImportCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
    transform: (value) => cleanCell(value),
  });

  if (parsed.errors.length > 0) {
    return {
      success: false,
      message: `CSV parse failed: ${parsed.errors[0].message}`,
      totalRows: 0,
      imported: 0,
      skippedDuplicates: 0,
      skippedInvalid: 0,
      errors: parsed.errors.map((error) => error.message).slice(0, 10),
    };
  }

  const missingHeaders = getMissingHeaders(parsed.meta.fields);
  if (missingHeaders.length > 0) {
    return {
      success: false,
      message: `CSV is missing required columns: ${missingHeaders.join(", ")}`,
      totalRows: parsed.data.length,
      imported: 0,
      skippedDuplicates: 0,
      skippedInvalid: parsed.data.length,
      errors: [],
    };
  }

  const draftStatusId = await getDraftStatusId();
  const seenRows = new Set<string>();
  const errors: string[] = [];
  let imported = 0;
  let skippedDuplicates = 0;
  let skippedInvalid = 0;

  for (const [index, row] of parsed.data.entries()) {
    const rowNumber = index + 2; // CSV row 1 is the header.
    const title = cleanCell(row.title);
    const company = cleanCell(row.company);
    const duplicateKey = makeDuplicateKey(row);

    if (!title || !company) {
      skippedInvalid += 1;
      errors.push(`Row ${rowNumber}: title and company are required.`);
      continue;
    }

    if (seenRows.has(duplicateKey)) {
      skippedDuplicates += 1;
      continue;
    }
    seenRows.add(duplicateKey);

    const existingJob = await existingImportedJobExists(row, user.id);
    if (existingJob) {
      skippedDuplicates += 1;
      continue;
    }

    try {
      const [jobTitle, jobCompany, jobSource] = await Promise.all([
        getOrCreateJobTitle(title, user.id),
        getOrCreateCompany(company, user.id),
        getOrCreateJobSource(row.source, user.id),
      ]);

      const locationLabel = cleanCell(row.location);
      const location = locationLabel
        ? await getOrCreateLocation(locationLabel, user.id)
        : null;

      const notes = cleanCell(row.notes);
      const job = await db.job.create({
        data: {
          userId: user.id,
          jobTitleId: jobTitle.id,
          companyId: jobCompany.id,
          locationId: location?.id ?? null,
          jobSourceId: jobSource.id,
          statusId: draftStatusId,
          jobType: "FT",
          salaryRange: null,
          description: buildJobDescription(row),
          jobUrl: cleanCell(row.application_url) || null,
          dueDate: parseOptionalDate(row.deadline),
          applied: false,
          appliedDate: null,
          createdAt: new Date(),
          discoveredAt: new Date(),
          discoveryStatus: "imported",
        },
        select: { id: true },
      });

      if (notes) {
        await db.note.create({
          data: {
            jobId: job.id,
            userId: user.id,
            content: notes,
          },
        });
      }

      imported += 1;
    } catch (error) {
      skippedInvalid += 1;
      errors.push(
        `Row ${rowNumber}: ${
          error instanceof Error ? error.message : "Import failed"
        }`,
      );
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/myjobs");

  return {
    success: true,
    totalRows: parsed.data.length,
    imported,
    skippedDuplicates,
    skippedInvalid,
    errors: errors.slice(0, 10),
  };
}
