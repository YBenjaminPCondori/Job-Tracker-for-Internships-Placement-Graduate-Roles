"""Clean and deduplicate validated BrowserOS results."""

import pandas as pd


DUPLICATE_KEY_COLUMNS = ["job_title", "company", "application_url"]
EMPTY_TEXT_VALUES = {"", "n/a", "na", "none", "null", "nan"}


def _clean_cell(value: object) -> object:
    """Trim text, collapse repeated whitespace, and standardise empty values."""
    if pd.isna(value):
        return pd.NA

    cleaned = " ".join(str(value).split())
    if cleaned.casefold() in EMPTY_TEXT_VALUES:
        return pd.NA
    return cleaned


def clean_and_deduplicate(dataframe: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Return cleaned rows and the number of duplicates that were removed."""
    cleaned = dataframe.copy()

    for column in cleaned.columns:
        cleaned[column] = cleaned[column].map(_clean_cell)

    # Build temporary case-insensitive keys without changing the displayed data.
    duplicate_keys = cleaned[DUPLICATE_KEY_COLUMNS].apply(
        lambda column: column.astype("string").str.casefold()
    )
    duplicate_mask = duplicate_keys.duplicated(keep="first")
    duplicate_count = int(duplicate_mask.sum())

    cleaned = cleaned.loc[~duplicate_mask].reset_index(drop=True)
    return cleaned, duplicate_count
