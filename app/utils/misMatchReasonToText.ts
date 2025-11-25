import type { NoProductMatchErrorCode } from "@tmlmt/cooklang-parser";

export default function (val: NoProductMatchErrorCode): string {
  switch (val) {
    case "incompatibleUnits":
      return "Incompatible units between ingredient and available products";
    case "noProduct":
      return "No product in the catalog matches the ingredient";
    case "noQuantity":
      return "Ingredient without quantity: skipped";
    case "textValue":
      return "Ingredient with text value: skipped";
    default:
      return "Unknown error";
      break;
  }
}
