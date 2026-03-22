import type { StepItem, Recipe } from "@tmlmt/cooklang-parser";
import {
  formatQuantity,
  formatQuantityWithUnit,
} from "@tmlmt/cooklang-parser";

export default function (item: StepItem, recipe: Recipe): string {
  if (item.type === "ingredient") {
    const alt = item.alternatives[0]!;
    let itemString = alt.displayName;
    if (alt.quantity) {
      itemString += ` (${formatQuantityWithUnit(alt.quantity, alt.unit)})`;
    }
    return itemString;
  } else if (item.type === "cookware") {
    let itemString = recipe.cookware[item.index]!.name;
    if (item.quantity) {
      itemString += ` (${formatQuantity(item.quantity)})`;
    }
    return itemString;
  } else if (item.type === "timer") {
    const timer = recipe.timers[item.index]!;
    return `${formatQuantity(timer.duration)} ${timer.unit}`;
  } else if (item.type === "text") {
    return item.value;
  }
  return "";
}
