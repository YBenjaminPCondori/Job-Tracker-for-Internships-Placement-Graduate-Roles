"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { File, ListFilter, Loader, Search, X } from "lucide-react";
import {
  deleteJobById,
  getJobDetails,
  getJobsList,
  updateJobStatus,
} from "@/actions/job.actions";
import { toast } from "../ui/use-toast";
import {
  Company,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobTitle,
  Tag,
} from "@/models/job.model";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { APP_CONSTANTS } from "@/lib/constants";
import Loading from "../Loading";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AddJob } from "./AddJob";
import MyJobsTable from "./MyJobsTable";
import { NoteDialog } from "./NoteDialog";
import { BrowserOsImportButton } from "./BrowserOsImportButton";
import { format } from "date-fns";
import { RecordsPerPageSelector } from "../RecordsPerPageSelector";
import { RecordsCount } from "../RecordsCount";
import type { JobGroupingField } from "@/lib/job-grouping";

type MyJobsProps = {
  statuses: JobStatus[];
  companies: Company[];
  titles: JobTitle[];
  locations: JobLocation[];
  sources: JobSource[];
  tags: Tag[];
};

const isJobGroupingField = (value: string | null): value is JobGroupingField =>
  value === "none" ||
  value === "company" ||
  value === "location" ||
  value === "title";

function JobsContainer({
  statuses,
  companies,
  titles,
  locations,
  sources,
  tags,
}: MyJobsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const queryParams = useSearchParams();
  const updateQueryFilter = useCallback(
    (name: string, value: string | null) => {
      const params = new URLSearchParams(queryParams.toString());
      if (value) params.set(name, value);
      else params.delete(name);
      router.push(`${pathname}${params.size ? `?${params.toString()}` : ""}`);
    },
    [pathname, queryParams, router],
  );
  const [companyFilter, setCompanyFilter] = useState<string | null>(
    queryParams.get("company"),
  );
  const [titleFilter, setTitleFilter] = useState<string | null>(
    queryParams.get("title"),
  );
  const [locationFilter, setLocationFilter] = useState<string | null>(
    queryParams.get("location"),
  );
  const [sourceFilter, setSourceFilter] = useState<string | null>(
    queryParams.get("source"),
  );
  const [appliedFilter, setAppliedFilter] = useState(
    queryParams.get("applied") === "true",
  );
  const [dateAppliedFilter, setDateAppliedFilter] = useState<string | null>(
    queryParams.get("dateApplied"),
  );
  const [matchFilter, setMatchFilter] = useState<string | null>(
    queryParams.get("match"),
  );
  const initialGrouping = queryParams.get("groupBy");
  const [groupingField, setGroupingField] = useState<JobGroupingField>(
    isJobGroupingField(initialGrouping) ? initialGrouping : "none",
  );
  const [jobs, setJobs] = useState<JobResponse[]>([]);
  const [page, setPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [filterKey, setFilterKey] = useState<string>();
  const [searchTerm, setSearchTerm] = useState("");
  const [editJob, setEditJob] = useState(null);
  const [initialLoading, setInitialLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState<number>(
    APP_CONSTANTS.RECORDS_PER_PAGE,
  );
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteJobId, setNoteJobId] = useState("");
  const hasSearched = useRef(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const companyLabel = companyFilter
    ? companies.find((c) => c.value === companyFilter)?.label
    : null;

  const titleLabel = titleFilter
    ? titles.find((t) => t.value === titleFilter)?.label
    : null;

  const locationLabel = locationFilter
    ? locations.find((l) => l.value === locationFilter)?.label
    : null;

  const sourceLabel = sourceFilter
    ? sources.find((s) => s.value === sourceFilter)?.label
    : null;

  const dateAppliedLabels: Record<string, string> = {
    today: "Applied today",
    "last-7-days": "Applied in last 7 days",
    "last-30-days": "Applied in last 30 days",
    "last-90-days": "Applied in last 90 days",
    "no-date": "No applied date",
  };
  const matchLabels: Record<string, string> = {
    excellent: "Match: 80%+",
    good: "Match: 60–79%",
    low: "Match: below 60%",
    unscored: "Match: not scored",
  };

  const clearCompanyFilter = () => {
    setCompanyFilter(null);
    updateQueryFilter("company", null);
  };

  const clearTitleFilter = () => {
    setTitleFilter(null);
    updateQueryFilter("title", null);
  };

  const clearLocationFilter = () => {
    setLocationFilter(null);
    updateQueryFilter("location", null);
  };

  const clearSourceFilter = () => {
    setSourceFilter(null);
    updateQueryFilter("source", null);
  };

  const setFilterValue = (
    name: "company" | "title" | "source" | "dateApplied" | "match",
    value: string,
  ) => {
    const nextValue = value === "all" ? null : value;
    if (name === "company") setCompanyFilter(nextValue);
    if (name === "title") setTitleFilter(nextValue);
    if (name === "source") setSourceFilter(nextValue);
    if (name === "dateApplied") setDateAppliedFilter(nextValue);
    if (name === "match") setMatchFilter(nextValue);
    updateQueryFilter(name, nextValue);
  };

  useEffect(() => {
    const cp = queryParams.get("company");
    const tp = queryParams.get("title");
    const lp = queryParams.get("location");
    const sp = queryParams.get("source");
    const ap = queryParams.get("applied") === "true";
    const dap = queryParams.get("dateApplied");
    const mp = queryParams.get("match");
    const gp = queryParams.get("groupBy");
    setCompanyFilter(cp);
    setTitleFilter(tp);
    setLocationFilter(lp);
    setSourceFilter(sp);
    setAppliedFilter(ap);
    setDateAppliedFilter(dap);
    setMatchFilter(mp);
    setGroupingField(isJobGroupingField(gp) ? gp : "none");
  }, [queryParams]);

  const jobsPerPage = recordsPerPage;

  const loadJobs = useCallback(
    async (page: number, filter?: string, search?: string) => {
      if (page === 1) setInitialLoading(true);
      else setLoadingMore(true);
      const result =
        dateAppliedFilter || matchFilter || groupingField !== "none"
          ? await getJobsList(
              page,
              jobsPerPage,
              filter,
              search,
              companyFilter || undefined,
              appliedFilter || undefined,
              titleFilter || undefined,
              locationFilter || undefined,
              sourceFilter || undefined,
              dateAppliedFilter || undefined,
              matchFilter || undefined,
              groupingField,
            )
          : await getJobsList(
              page,
              jobsPerPage,
              filter,
              search,
              companyFilter || undefined,
              appliedFilter || undefined,
              titleFilter || undefined,
              locationFilter || undefined,
              sourceFilter || undefined,
            );
      const { success, data, total, message } = result;
      if (success && data) {
        setJobs((prev) => (page === 1 ? data : [...prev, ...data]));
        setTotalJobs(total);
        setPage(page);
      } else {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
      setInitialLoading(false);
      setLoadingMore(false);
    },
    [
      jobsPerPage,
      companyFilter,
      appliedFilter,
      titleFilter,
      locationFilter,
      sourceFilter,
      dateAppliedFilter,
      matchFilter,
      groupingField,
    ],
  );

  const reloadJobs = useCallback(async () => {
    await loadJobs(1, undefined, searchTerm || undefined);
    if (filterKey) {
      setFilterKey(undefined);
    }
  }, [loadJobs, filterKey, searchTerm]);

  const onDeleteJob = async (jobId: string) => {
    const { res, success, message } = await deleteJobById(jobId);
    if (success) {
      toast({
        variant: "success",
        description: `Job has been deleted successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
    reloadJobs();
  };

  const onEditJob = async (jobId: string) => {
    const { job, success, message } = await getJobDetails(jobId);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
      return;
    }
    setEditJob(job);
  };

  const onChangeJobStatus = async (jobId: string, jobStatus: JobStatus) => {
    const { success, message } = await updateJobStatus(jobId, jobStatus);
    if (success) {
      router.refresh();
      toast({
        variant: "success",
        description: `Job has been updated successfully`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Error!",
        description: message,
      });
    }
    reloadJobs();
  };

  const resetEditJob = () => {
    setEditJob(null);
  };

  const onAddNote = (jobId: string) => {
    setNoteJobId(jobId);
    setNoteDialogOpen(true);
  };

  useEffect(() => {
    (async () =>
      await loadJobs(1, filterKey, searchTerm || undefined))();
    // Status and search changes load explicitly in their own handlers.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadJobs]);

  useEffect(() => {
    if (searchTerm !== "") {
      hasSearched.current = true;
    }
    // Skip only on initial mount when search is empty
    if (searchTerm === "" && !hasSearched.current) return;

    const timer = setTimeout(() => {
      loadJobs(1, filterKey, searchTerm || undefined);
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm]);

  // Infinite scroll: auto-load next page when sentinel is visible
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          !initialLoading &&
          !loadingMore &&
          jobs.length < totalJobs
        ) {
          loadJobs(page + 1, filterKey, searchTerm || undefined);
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [
    jobs.length,
    totalJobs,
    page,
    filterKey,
    searchTerm,
    initialLoading,
    loadingMore,
    loadJobs,
  ]);

  const onFilterChange = (filterBy: string) => {
    if (filterBy === "none") {
      setFilterKey(undefined);
      loadJobs(1, undefined, searchTerm || undefined);
    } else {
      setFilterKey(filterBy);
      loadJobs(1, filterBy, searchTerm || undefined);
    }
  };

  const onGroupingChange = (value: string) => {
    if (!isJobGroupingField(value)) return;
    setJobs([]);
    setPage(1);
    setGroupingField(value);
    updateQueryFilter("groupBy", value === "none" ? null : value);
  };

  const downloadJobsList = async () => {
    try {
      const res = await fetch("/api/jobs/export", {
        method: "POST",
        headers: {
          "Content-Type": "text/csv",
        },
      });
      if (!res.ok) {
        throw new Error("Failed to download jobs!");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `jobsync-${format(new Date(), "yyyy-MM-dd")}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast({
        variant: "success",
        title: "Downloaded successfully!",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error!",
        description:
          error instanceof Error ? error.message : "Unknown error occurred.",
      });
    }
  };

  return (
    <>
      <Card x-chunk="dashboard-06-chunk-0">
        <CardHeader className="flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <CardTitle>My Jobs</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {companyLabel && (
              <button
                onClick={clearCompanyFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {companyLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {titleLabel && (
              <button
                onClick={clearTitleFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {titleLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {locationLabel && (
              <button
                onClick={clearLocationFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {locationLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {sourceLabel && (
              <button
                onClick={clearSourceFilter}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {sourceLabel}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {dateAppliedFilter && (
              <button
                onClick={() => setFilterValue("dateApplied", "all")}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {dateAppliedLabels[dateAppliedFilter]}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            {matchFilter && (
              <button
                onClick={() => setFilterValue("match", "all")}
                className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
              >
                {matchLabels[matchFilter]}
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="relative flex-1 min-w-[140px] sm:flex-none">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Search jobs..."
                className="pl-8 h-8 w-full sm:w-[150px] lg:w-[200px]"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={filterKey} onValueChange={onFilterChange}>
              <SelectTrigger className="w-[120px] h-8">
                <ListFilter className="h-3.5 w-3.5" />
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel>Filter by</SelectLabel>
                  <SelectSeparator />
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="PT">Part-time</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
            <Select
              value={companyFilter ?? "all"}
              onValueChange={(value) => setFilterValue("company", value)}
            >
              <SelectTrigger
                aria-label="Filter by company"
                className="w-[130px] h-8"
              >
                <SelectValue placeholder="Company" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.value}>
                    {company.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={titleFilter ?? "all"}
              onValueChange={(value) => setFilterValue("title", value)}
            >
              <SelectTrigger
                aria-label="Filter by title"
                className="w-[130px] h-8"
              >
                <SelectValue placeholder="Title" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All titles</SelectItem>
                {titles.map((title) => (
                  <SelectItem key={title.id} value={title.value}>
                    {title.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={dateAppliedFilter ?? "all"}
              onValueChange={(value) => setFilterValue("dateApplied", value)}
            >
              <SelectTrigger
                aria-label="Filter by date applied"
                className="w-[145px] h-8"
              >
                <SelectValue placeholder="Date Applied" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any applied date</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="last-7-days">Last 7 days</SelectItem>
                <SelectItem value="last-30-days">Last 30 days</SelectItem>
                <SelectItem value="last-90-days">Last 90 days</SelectItem>
                <SelectItem value="no-date">No applied date</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={sourceFilter ?? "all"}
              onValueChange={(value) => setFilterValue("source", value)}
            >
              <SelectTrigger
                aria-label="Filter by source"
                className="w-[125px] h-8"
              >
                <SelectValue placeholder="Source" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                {sources.map((source) => (
                  <SelectItem key={source.id} value={source.value}>
                    {source.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={matchFilter ?? "all"}
              onValueChange={(value) => setFilterValue("match", value)}
            >
              <SelectTrigger
                aria-label="Filter by match"
                className="w-[130px] h-8"
              >
                <SelectValue placeholder="Match" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any match</SelectItem>
                <SelectItem value="excellent">80% and above</SelectItem>
                <SelectItem value="good">60–79%</SelectItem>
                <SelectItem value="low">Below 60%</SelectItem>
                <SelectItem value="unscored">Not scored</SelectItem>
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1"
              disabled={initialLoading}
              onClick={downloadJobsList}
            >
              <File className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Export
              </span>
            </Button>
            <BrowserOsImportButton onImported={reloadJobs} />
            <AddJob
              jobStatuses={statuses}
              companies={companies}
              jobTitles={titles}
              locations={locations}
              jobSources={sources}
              tags={tags}
              editJob={editJob}
              resetEditJob={resetEditJob}
              initialOpen={queryParams.get("add-job") === "true"}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">
              Group by
            </span>
            <Select value={groupingField} onValueChange={onGroupingChange}>
              <SelectTrigger
                aria-label="Group applications by"
                className="h-10 w-full sm:h-8 sm:w-[150px]"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                <SelectItem value="company">Company</SelectItem>
                <SelectItem value="location">Location</SelectItem>
                <SelectItem value="title">Title</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {initialLoading && <Loading />}
          {jobs.length > 0 && (
            <>
              <MyJobsTable
                jobs={jobs}
                jobStatuses={statuses}
                deleteJob={onDeleteJob}
                editJob={onEditJob}
                onChangeJobStatus={onChangeJobStatus}
                onAddNote={onAddNote}
                groupingField={groupingField}
                searchActive={searchTerm.trim().length > 0}
              />
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mt-4">
                <RecordsCount
                  count={jobs.length}
                  total={totalJobs}
                  label="jobs"
                />
                {totalJobs > APP_CONSTANTS.RECORDS_PER_PAGE && (
                  <RecordsPerPageSelector
                    value={recordsPerPage}
                    onChange={setRecordsPerPage}
                  />
                )}
              </div>
            </>
          )}
          {jobs.length < totalJobs && (
            <div ref={sentinelRef} className="flex justify-center p-4">
              {loadingMore && (
                <Loader className="h-5 w-5 animate-spin text-blue-500" />
              )}
            </div>
          )}
        </CardContent>
        <CardFooter></CardFooter>
      </Card>
      <NoteDialog
        open={noteDialogOpen}
        onOpenChange={setNoteDialogOpen}
        jobId={noteJobId}
        onSaved={() => reloadJobs()}
      />
    </>
  );
}

export default JobsContainer;
