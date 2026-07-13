import type { NoProductMatchErrorCode } from "@tmlmt/cooklang-parser";

/**
 * Maps a mismatch reason code to its i18n key (under the cart page locale,
 * `reasons.*`). The caller is responsible for translating the returned key.
 */
export default function (val: NoProductMatchErrorCode): string {
  switch (val) {
    case "incompatibleUnits":
      return "reasons.incompatibleUnits";
    case "noProduct":
      return "reasons.noProduct";
    case "noQuantity":
      return "reasons.noQuantity";
    case "textValue":
      return "reasons.textValue";
    case "textValue_incompatibleUnits":
      return "reasons.textValue_incompatibleUnits";
    default:
      return "reasons.unknown";
  }
}
