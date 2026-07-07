"""Run the BrowserOS CSV validation, cleaning, and metrics pipeline."""

from __future__ import annotations

import argparse
import logging
import re
import sys
from pathlib import Path

from calculate_metrics import calculate_metrics
from clean_results import clean_and_deduplicate
from export_job_tracker_results import build_job_tracker_import
from validate_browseros_output import BrowserOSOutputError, load_and_validate_csv


MODULE_ROOT = Path(__file__).resolve().parent.parent
RUN_ID_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9_-]*$")


def display_path(path: Path) -> Path:
    """Return a readable path relative to this experiment directory."""
    return path.relative_to(MODULE_ROOT)


def parse_arguments() -> argparse.Namespace:
    """Read command-line options."""
    parser = argparse.ArgumentParser(
        description="Process a BrowserOS job-results CSV export."
    )
    parser.add_argument(
        "--run-id",
        default="run_001",
        help="Run identifier used in filenames (default: run_001).",
    )
    return parser.parse_args()


def validate_run_id(run_id: str) -> str:
    """Reject run IDs that could escape the experiment directories."""
    if not RUN_ID_PATTERN.fullmatch(run_id):
        raise ValueError(
            "Run ID must start with a letter or number and contain only "
            "letters, numbers, underscores, or hyphens."
        )
    return run_id


def configure_logging(log_path: Path) -> logging.Logger:
    """Create a logger that writes to both the console and the run log."""
    log_path.parent.mkdir(parents=True, exist_ok=True)

    logger = logging.getLogger("browseros_pipeline")
    logger.setLevel(logging.INFO)
    logger.handlers.clear()

    formatter = logging.Formatter("%(asctime)s | %(levelname)s | %(message)s")
    file_handler = logging.FileHandler(log_path, mode="w", encoding="utf-8")
    file_handler.setFormatter(formatter)
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(console_handler)
    return logger


def run_pipeline(run_id: str) -> int:
    """Run every pipeline stage and return a process exit code."""
    try:
        run_id = validate_run_id(run_id)
    except ValueError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    input_path = MODULE_ROOT / "browseros_output" / f"{run_id}_raw.csv"
    clean_output_path = MODULE_ROOT / "processed" / f"{run_id}_clean.csv"
    metrics_output_path = MODULE_ROOT / "processed" / f"{run_id}_metrics.csv"
    tracker_export_path = MODULE_ROOT / "exports" / "job_tracker_import_ready.csv"
    log_path = MODULE_ROOT / "logs" / f"{run_id}_log.txt"
    logger = configure_logging(log_path)

    logger.info("Starting BrowserOS processing for run ID: %s", run_id)
    logger.info("Reading raw export: %s", display_path(input_path))

    try:
        raw_dataframe = load_and_validate_csv(input_path)
        logger.info(
            "Validation passed: %d row(s), %d required column(s)",
            len(raw_dataframe),
            len(raw_dataframe.columns),
        )

        cleaned_dataframe, duplicate_count = clean_and_deduplicate(raw_dataframe)
        logger.info(
            "Cleaning complete: removed %d duplicate row(s)",
            duplicate_count,
        )

        metrics_dataframe = calculate_metrics(
            cleaned_dataframe=cleaned_dataframe,
            total_roles_found=len(raw_dataframe),
            duplicate_count=duplicate_count,
        )
        tracker_export = build_job_tracker_import(cleaned_dataframe)

        clean_output_path.parent.mkdir(parents=True, exist_ok=True)
        tracker_export_path.parent.mkdir(parents=True, exist_ok=True)
        # Empty values are deliberately written as blank CSV cells.
        cleaned_dataframe.to_csv(clean_output_path, index=False, na_rep="")
        metrics_dataframe.to_csv(metrics_output_path, index=False)
        tracker_export.to_csv(tracker_export_path, index=False, na_rep="")

        logger.info("Saved cleaned data: %s", display_path(clean_output_path))
        logger.info("Saved metrics: %s", display_path(metrics_output_path))
        logger.info(
            "Saved job-tracker bridge export: %s",
            display_path(tracker_export_path),
        )
        logger.info(
            "Finished: %d raw role(s), %d unique role(s), %.2f%% complete",
            len(raw_dataframe),
            len(cleaned_dataframe),
            metrics_dataframe.at[0, "completeness_score_percent"],
        )
        return 0
    except (BrowserOSOutputError, KeyError, OSError, ValueError) as error:
        logger.error("Pipeline failed: %s", error)
        return 1


def main() -> None:
    """Command-line entry point."""
    arguments = parse_arguments()
    raise SystemExit(run_pipeline(arguments.run_id))


if __name__ == "__main__":
    main()
