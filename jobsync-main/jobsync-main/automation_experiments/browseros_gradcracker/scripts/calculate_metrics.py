"""Calculate quality metrics for cleaned BrowserOS results."""

import pandas as pd


# The completeness score intentionally focuses on the fields highlighted by the
# experiment. It is the percentage of these cells that contain a value.
COMPLETENESS_FIELDS = [
    "deadline",
    "degree_required",
    "key_skills",
    "location",
    "application_url",
]

METRIC_COLUMNS = [
    "total_roles_found",
    "unique_roles_found",
    "duplicate_count",
    "missing_deadlines",
    "missing_degree_requirements",
    "missing_skill_fields",
    "missing_locations",
    "missing_application_urls",
    "completeness_score_percent",
]


def _missing_count(dataframe: pd.DataFrame, column: str) -> int:
    """Count missing values in one cleaned column."""
    return int(dataframe[column].isna().sum())


def calculate_metrics(
    cleaned_dataframe: pd.DataFrame,
    total_roles_found: int,
    duplicate_count: int,
) -> pd.DataFrame:
    """Create a one-row metrics table for CSV output."""
    unique_roles_found = len(cleaned_dataframe)
    possible_completeness_cells = unique_roles_found * len(COMPLETENESS_FIELDS)

    if possible_completeness_cells == 0:
        completeness_score = 0.0
    else:
        missing_completeness_cells = int(
            cleaned_dataframe[COMPLETENESS_FIELDS].isna().sum().sum()
        )
        populated_cells = possible_completeness_cells - missing_completeness_cells
        completeness_score = round(
            populated_cells / possible_completeness_cells * 100,
            2,
        )

    metrics = {
        "total_roles_found": total_roles_found,
        "unique_roles_found": unique_roles_found,
        "duplicate_count": duplicate_count,
        "missing_deadlines": _missing_count(cleaned_dataframe, "deadline"),
        "missing_degree_requirements": _missing_count(
            cleaned_dataframe, "degree_required"
        ),
        "missing_skill_fields": _missing_count(cleaned_dataframe, "key_skills"),
        "missing_locations": _missing_count(cleaned_dataframe, "location"),
        "missing_application_urls": _missing_count(
            cleaned_dataframe, "application_url"
        ),
        "completeness_score_percent": completeness_score,
    }
    return pd.DataFrame([metrics], columns=METRIC_COLUMNS)
