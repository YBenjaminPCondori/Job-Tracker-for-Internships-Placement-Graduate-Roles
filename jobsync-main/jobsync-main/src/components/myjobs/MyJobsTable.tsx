"use client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  ChevronRight,
  ListCollapse,
  MoreHorizontal,
  Pencil,
  StickyNote,
  Tags,
  Trash,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "../ui/badge";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Button } from "../ui/button";
import { Fragment, useEffect, useMemo, useState } from "react";
import { JobResponse, JobStatus } from "@/models/job.model";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { groupJobs } from "@/lib/job-grouping";
import type { JobGroupingField } from "@/lib/job-grouping";

type MyJobsTableProps = {
  jobs: JobResponse[];
  jobStatuses: JobStatus[];
  deleteJob: (id: string) => void;
  editJob: (id: string) => void;
  onChangeJobStatus: (id: string, status: JobStatus) => void;
  onAddNote: (jobId: string) => void;
  groupingField: JobGroupingField;
  searchActive?: boolean;
};

function MyJobsTable({
  jobs,
  jobStatuses,
  deleteJob,
  editJob,
  onChangeJobStatus,
  onAddNote,
  groupingField,
  searchActive = false,
}: MyJobsTableProps) {
  const [alertOpen, setAlertOpen] = useState(false);
  const [jobIdToDelete, setJobIdToDelete] = useState("");
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    () => new Set(),
  );

  const groups = useMemo(
    () =>
      groupingField === "none" ? [] : groupJobs(jobs, groupingField),
    [groupingField, jobs],
  );

  useEffect(() => {
    setExpandedGroups(new Set());
  }, [groupingField]);

  useEffect(() => {
    if (!searchActive || groupingField === "none") return;
    setExpandedGroups(new Set(groups.map((group) => group.key)));
  }, [groups, groupingField, searchActive]);

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const router = useRouter();
  const viewJobDetails = (jobId: string) => {
    router.push(`/dashboard/myjobs/${jobId}`);
  };

  const onDeleteJob = (jobId: string) => {
    setAlertOpen(true);
    setJobIdToDelete(jobId);
  };

  const renderJobRow = (job: JobResponse) => (
    <TableRow key={job.id}>
      <TableCell className="hidden sm:table-cell">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt="Company logo"
          className="aspect-square h-8 w-8 rounded-md object-cover"
          src={job.Company?.logoUrl || "/images/jobsync-logo.svg"}
        />
      </TableCell>
      <TableCell className="hidden w-[120px] md:table-cell">
        {job.appliedDate ? format(job.appliedDate, "PP") : "N/A"}
      </TableCell>
      <TableCell className="max-w-[120px] cursor-pointer font-medium sm:max-w-none">
        <div className="flex items-center gap-1.5">
          <Link
            href={`/dashboard/myjobs/${job.id}`}
            className="block truncate"
          >
            {job.JobTitle?.label || "Unspecified"}
          </Link>
          {(job._count?.Notes ?? 0) > 0 && (
            <Badge
              variant="secondary"
              className="h-5 shrink-0 px-1.5 py-0 text-xs"
            >
              <StickyNote className="mr-0.5 h-3 w-3" />
              {job._count!.Notes}
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="max-w-[100px] font-medium sm:max-w-none">
        <span className="block truncate">
          {job.Company?.label || "Unspecified"}
        </span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {job.Location?.label || "Unspecified"}
      </TableCell>
      <TableCell>
        {new Date() > job.dueDate && job.Status?.value === "draft" ? (
          <Badge className="bg-red-500">Expired</Badge>
        ) : (
          <Badge
            className={cn(
              "w-[70px] justify-center",
              job.Status?.value === "applied" && "bg-cyan-500",
              job.Status?.value === "interview" && "bg-green-500",
            )}
          >
            {job.Status?.label}
          </Badge>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {job.matchScore != null ? `${job.matchScore}%` : "-"}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {job.JobSource?.label}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-haspopup="true"
              size="icon"
              variant="ghost"
              className="min-h-10 min-w-10"
              data-testid="job-actions-menu-btn"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Toggle menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px]">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => viewJobDetails(job.id)}
              >
                <ListCollapse className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => editJob(job.id)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Edit Job
              </DropdownMenuItem>
              <DropdownMenuItem
                className="cursor-pointer"
                onClick={() => onAddNote(job.id)}
              >
                <StickyNote className="mr-2 h-4 w-4" />
                Add a Note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Tags className="mr-2 h-4 w-4" />
                  Change status
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                  <DropdownMenuSubContent className="p-0">
                    {jobStatuses.map((status) => (
                      <DropdownMenuItem
                        className="cursor-pointer"
                        key={status.id}
                        onSelect={() => onChangeJobStatus(job.id, status)}
                        disabled={status.id === job.Status.id}
                      >
                        <span>{status.label}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuPortal>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600"
                onClick={() => onDeleteJob(job.id)}
              >
                <Trash className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      {groupingField !== "none" && groups.length > 0 && (
        <div className="mb-2 flex flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 sm:min-h-8"
            onClick={() =>
              setExpandedGroups(new Set(groups.map((group) => group.key)))
            }
          >
            Expand all
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-10 sm:min-h-8"
            onClick={() => setExpandedGroups(new Set())}
          >
            Collapse all
          </Button>
        </div>
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="hidden w-[100px] sm:table-cell">
              <span className="sr-only">Company Logo</span>
            </TableHead>
            <TableHead className="hidden md:table-cell">Date Applied</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="hidden md:table-cell">Location</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="hidden md:table-cell">Match</TableHead>
            <TableHead className="hidden md:table-cell">Source</TableHead>
            <TableHead>
              <span className="sr-only">Actions</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupingField === "none"
            ? jobs.map(renderJobRow)
            : groups.map((group) => {
                const expanded = expandedGroups.has(group.key);
                const headingId = `job-group-${group.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
                return (
                  <Fragment key={group.key}>
                    <TableRow className="bg-muted/40 hover:bg-muted/60">
                      <TableCell colSpan={9} className="p-0">
                        <button
                          id={headingId}
                          type="button"
                          aria-expanded={expanded}
                          onClick={() => toggleGroup(group.key)}
                          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left font-semibold outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4"
                        >
                          <ChevronRight
                            aria-hidden="true"
                            className={cn(
                              "h-4 w-4 shrink-0 transition-transform",
                              expanded && "rotate-90",
                            )}
                          />
                          <span className="min-w-0 flex-1 truncate">
                            {group.label}
                          </span>
                          <Badge variant="secondary" className="shrink-0">
                            {group.jobs.length}{" "}
                            <span className="sr-only">
                              {group.jobs.length === 1
                                ? "application"
                                : "applications"}
                            </span>
                          </Badge>
                        </button>
                      </TableCell>
                    </TableRow>
                    {expanded &&
                      group.jobs.map((job) => renderJobRow(job))}
                  </Fragment>
                );
              })}
        </TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="job"
        open={alertOpen}
        onOpenChange={setAlertOpen}
        onDelete={() => deleteJob(jobIdToDelete)}
      />
    </>
  );
}

export default MyJobsTable;
