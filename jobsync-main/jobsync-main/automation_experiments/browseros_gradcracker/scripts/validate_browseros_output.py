"""Load and validate a CSV exported by BrowserOS."""

from pathlib import Path

import pandas as pd


# These columns define the file boundary between BrowserOS and this experiment.
REQUIRED_COLUMNS = [
    "run_id",
    "method",
    "job_title",
    "company",
    "location",
    "deadline",
    "job_type",
    "degree_required",
    "key_skills",
    "application_url",
    "source_url",
    "timestamp",
    "notes",
]


class BrowserOSOutputError(ValueError):
    """Raised when a BrowserOS export cannot be processed safely."""


def load_and_validate_csv(input_path: Path) -> pd.DataFrame:
    """Read a BrowserOS CSV and ensure that its required columns are present."""
    if not input_path.is_file():
        raise BrowserOSOutputError(f"Input file does not exist: {input_path}")

    try:
        # Read values as strings so identifiers, URLs, and dates are not changed.
        dataframe = pd.read_csv(
            input_path,
            dtype=str,
            keep_default_na=False,
            encoding="utf-8-sig",
        )
    except pd.errors.EmptyDataError as error:
        raise BrowserOSOutputError(f"Input file is empty: {input_path}") from error
    except (pd.errors.ParserError, UnicodeError, OSError) as error:
        raise BrowserOSOutputError(
            f"Could not read BrowserOS CSV {input_path}: {error}"
        ) from error

    missing_columns = [
        column for column in REQUIRED_COLUMNS if column not in dataframe.columns
    ]
    if missing_columns:
        raise BrowserOSOutputError(
            "Missing required column(s): " + ", ".join(missing_columns)
        )

    # Return only the agreed columns and in a predictable order. This prevents
    # unexpected BrowserOS fields from leaking into the import-ready output.
    return dataframe.loc[:, REQUIRED_COLUMNS].copy()
