"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import packageJson from "../../package.json";
import {
  APP_NAME,
  PROJECT_REPOSITORY_URL,
  UPSTREAM_PROJECT_NAME,
  UPSTREAM_REPOSITORY_URL,
  UPSTREAM_WEBSITE_URL,
} from "@/lib/branding";

interface SupportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SupportDialog({ open, onOpenChange }: SupportDialogProps) {
  const appVersion = packageJson.version;
  const currentYear = new Date().getFullYear();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>About {APP_NAME}</DialogTitle>
          <DialogDescription>
            View the source code, report a problem, or visit the original
            project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              {APP_NAME} source and support
            </h3>
            <a
              href={PROJECT_REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="block break-all text-sm text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {PROJECT_REPOSITORY_URL}
            </a>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Version</h3>
            <p className="text-sm text-muted-foreground">v{appVersion}</p>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Open-source attribution</h3>
            <p className="text-sm text-muted-foreground">
              © {currentYear} {APP_NAME}. Based on the design and application
              template of {UPSTREAM_PROJECT_NAME} © 2024 Gsync, used under the
              MIT License.
            </p>
            <div className="flex flex-col items-start gap-2">
              <a
                href={UPSTREAM_REPOSITORY_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Original {UPSTREAM_PROJECT_NAME} repository
              </a>
              <a
                href={UPSTREAM_WEBSITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Original {UPSTREAM_PROJECT_NAME} website
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
