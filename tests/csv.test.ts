import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "@/lib/csv";

describe("csv", () => {
  it("quotes commas, quotes and newlines", () => {
    expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"');
    expect(csvCell("plain")).toBe("plain");
    expect(csvCell(null)).toBe("");
  });
  it("defuses spreadsheet formulas but leaves numbers alone", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvCell("@cmd")).toBe("'@cmd");
    expect(csvCell("-5.00")).toBe("-5.00");
    expect(csvCell("+44 7000")).toBe("'+44 7000");
  });
  it("starts with a BOM and uses CRLF rows", () => {
    expect(toCsv(["A", "B"], [[1, "x"]])).toBe("﻿A,B\r\n1,x\r\n");
  });
});
