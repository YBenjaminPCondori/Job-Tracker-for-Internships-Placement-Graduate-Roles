export type JobGroupingField = "none" | "company" | "location" | "title";

type GroupableRelation = {
  id?: string | null;
  label?: string | null;
};

export type GroupableJob = {
  Company?: GroupableRelation | null;
  Location?: GroupableRelation | null;
  JobTitle?: GroupableRelation | null;
};

export type JobGroup<T extends GroupableJob> = {
  key: string;
  label: string;
  jobs: T[];
};

const normalizeLabel = (label?: string | null) =>
  label?.trim().toLowerCase() || "unspecified";

const readableLabel = (label?: string | null) =>
  label?.trim() || "Unspecified";

export function getJobGroup(
  job: GroupableJob,
  groupingField: Exclude<JobGroupingField, "none">,
): { key: string; label: string } {
  if (groupingField === "company") {
    return job.Company?.id && job.Company.label?.trim()
      ? {
          key: `company:${job.Company.id}`,
          label: readableLabel(job.Company.label),
        }
      : { key: "company:unspecified", label: "Unspecified" };
  }

  const relation = groupingField === "location" ? job.Location : job.JobTitle;
  const label = readableLabel(relation?.label);
  return {
    key: `${groupingField}:${normalizeLabel(relation?.label)}`,
    label,
  };
}

export function groupJobs<T extends GroupableJob>(
  jobs: T[],
  groupingField: Exclude<JobGroupingField, "none">,
): JobGroup<T>[] {
  const groups = new Map<string, JobGroup<T>>();

  for (const job of jobs) {
    const { key, label } = getJobGroup(job, groupingField);
    const existing = groups.get(key);
    if (existing) existing.jobs.push(job);
    else groups.set(key, { key, label, jobs: [job] });
  }

  return Array.from(groups.values());
}

export function paginateJobGroups<T extends GroupableJob & { id: string }>(
  jobs: T[],
  groupingField: Exclude<JobGroupingField, "none">,
  pageSize: number,
): string[][] {
  const groups = groupJobs(jobs, groupingField);
  const pages: string[][] = [];
  let page: string[] = [];

  for (const group of groups) {
    const groupIds = group.jobs.map((job) => job.id);
    if (page.length > 0 && page.length + groupIds.length > pageSize) {
      pages.push(page);
      page = [];
    }
    page.push(...groupIds);
  }

  if (page.length > 0) pages.push(page);
  return pages;
}
