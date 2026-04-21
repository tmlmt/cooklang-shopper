import { describe, it, expect } from "vitest";
import { parseFilename } from "~~/server/utils/shoppingIndex";

describe("parseFilename", () => {
  it("parses a default list filename", () => {
    expect(parseFilename(".shopping-list.password-editor")).toEqual({
      type: "list",
      userKey: "password-editor",
      listName: "",
    });
  });

  it("parses a named list filename", () => {
    expect(parseFilename(".shopping-list.password-editor.Weekly")).toEqual({
      type: "list",
      userKey: "password-editor",
      listName: "Weekly",
    });
  });

  it("parses a default checked filename", () => {
    expect(parseFilename(".shopping-checked.password-editor")).toEqual({
      type: "checked",
      userKey: "password-editor",
      listName: "",
    });
  });

  it("parses a named checked filename", () => {
    expect(parseFilename(".shopping-checked.password-editor.Weekly")).toEqual({
      type: "checked",
      userKey: "password-editor",
      listName: "Weekly",
    });
  });

  it("parses OIDC user filenames", () => {
    expect(parseFilename(".shopping-list.kanidm-abc123")).toEqual({
      type: "list",
      userKey: "kanidm-abc123",
      listName: "",
    });
  });

  it("parses OIDC user with named list", () => {
    expect(parseFilename(".shopping-list.kanidm-abc123.Party Dinner")).toEqual({
      type: "list",
      userKey: "kanidm-abc123",
      listName: "Party Dinner",
    });
  });

  it("returns null for unrelated filenames", () => {
    expect(parseFilename("recipe.cook")).toBeNull();
    expect(parseFilename(".gitkeep")).toBeNull();
    expect(parseFilename(".shopping-list.")).toBeNull();
  });

  it("handles viewer user key", () => {
    expect(parseFilename(".shopping-list.password-viewer")).toEqual({
      type: "list",
      userKey: "password-viewer",
      listName: "",
    });
  });

  it("handles UUID-style OIDC user IDs", () => {
    expect(
      parseFilename(
        ".shopping-checked.myoidc-550e8400-e29b-41d4-a716-446655440000",
      ),
    ).toEqual({
      type: "checked",
      userKey: "myoidc-550e8400-e29b-41d4-a716-446655440000",
      listName: "",
    });
  });
});
