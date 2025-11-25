import type {
  Item,
  Recipe,
  FixedValue,
  Range,
  QuantityPart,
} from "@tmlmt/cooklang-parser";
import getQuantityValue from "./getQuantityValue";

export default function (item: Item, recipe: Recipe): string {
  if (item.type === "ingredient") {
    let itemString = item.displayName;
    if (item.quantityPartIndex !== undefined) {
      const itemQuantity = recipe.ingredients[item.index]!.quantityParts![
        item.quantityPartIndex
      ] as QuantityPart;
      itemString += ` (${getQuantityValue(itemQuantity.value)}`;
      if (recipe.ingredients[item.index]!.unit) {
        itemString += " " + recipe.ingredients[item.index]!.unit;
      }
      itemString += ")";
    }
    return itemString;
  } else if (item.type === "cookware") {
    let itemString = recipe.cookware[item.index]!.name;
    if (item.quantityPartIndex !== undefined) {
      const itemQuantity = recipe.cookware[item.index]!.quantityParts![
        item.quantityPartIndex
      ] as FixedValue | Range;
      itemString += ` (${getQuantityValue(itemQuantity)})`;
    }
    return itemString;
  } else if (item.type === "timer") {
    return `${getQuantityValue(recipe.timers[item.index]!.duration)} ${recipe.timers[item.index]!.unit}`;
  } else {
    return item.value;
  }
}
