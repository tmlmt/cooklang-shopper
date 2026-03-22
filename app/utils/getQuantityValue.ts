import { formatQuantity, type FixedValue, type Range } from "@tmlmt/cooklang-parser";

export default function (val: FixedValue | Range): string {
  return formatQuantity(val);
}
