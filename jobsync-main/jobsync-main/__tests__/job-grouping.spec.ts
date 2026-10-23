import {
  groupJobs,
  paginateJobGroups,
  type GroupableJob,
} from "@/lib/job-grouping";

type TestJob = GroupableJob & { id: string };

const job = (
  id: string,
  companyId?: string,
  companyLabel?: string,
  locationLabel?: string,
  titleLabel?: string,
): TestJob => ({
  id,
  Company: companyId ? { id: companyId, label: companyLabel } : null,
  Location: locationLabel ? { label: locationLabel } : null,
  JobTitle: titleLabel ? { label: titleLabel } : null,
});

describe("job grouping", () => {
  it("groups companies by ID rather than display label", () => {
    const groups = groupJobs(
      [job("1", "a", "Acme"), job("2", "b", "Acme")],
      "company",
    );

    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.key)).toEqual([
      "company:a",
      "company:b",
    ]);
  });

  it("normalizes title casing and whitespace while preserving a readable label", () => {
    const groups = groupJobs(
      [
        job("1", "a", "Acme", "London", " Software Engineer "),
        job("2", "b", "Beta", "London", "software engineer"),
      ],
      "title",
    );

    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Software Engineer");
    expect(groups[0].jobs).toHaveLength(2);
  });

  it("places missing values in Unspecified", () => {
    const groups = groupJobs([job("1")], "location");

    expect(groups[0]).toMatchObject({
      key: "location:unspecified",
      label: "Unspecified",
    });
  });

  it("paginates complete groups without splitting them", () => {
    const pages = paginateJobGroups(
      [
        job("1", "a", "Acme"),
        job("2", "a", "Acme"),
        job("3", "a", "Acme"),
        job("4", "b", "Beta"),
        job("5", "b", "Beta"),
      ],
      "company",
      4,
    );

    expect(pages).toEqual([["1", "2", "3"], ["4", "5"]]);
  });
});
