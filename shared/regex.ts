import { createRegex } from "human-regex";

export const pathRegex = new RegExp(
  createRegex()
    .startAnchor()
    .negativeLookahead("/")
    .startGroup()
    .anyOf("\\p{L}\\p{N}_ +%.-")
    .oneOrMore()
    .literal("/")
    .endGroup()
    .zeroOrMore()
    .anyOf("\\p{L}\\p{N}_ +%.-")
    .oneOrMore()
    .endAnchor()
    .toRegExp().source,
  "u",
);
