import type {
  FixedValue,
  Range,
  DecimalValue,
  FractionValue,
  TextValue,
} from "@tmlmt/cooklang-parser";
import { rangeRegex, numberLikeRegex } from "../regex";

const parseFixedValue = (
  input_str: string,
): TextValue | DecimalValue | FractionValue => {
  if (!numberLikeRegex.test(input_str)) {
    return { type: "text", text: input_str };
  }

  // After this we know that s is either a fraction or a decimal value
  const s = input_str.trim().replace(",", ".");

  // fraction
  if (s.includes("/")) {
    const parts = s.split("/");

    const num = Number(parts[0]);
    const den = Number(parts[1]);

    return { type: "fraction", num, den };
  }

  // decimal
  return { type: "decimal", decimal: Number(s) };
};

export function parseQuantityValue(input_str: string): FixedValue | Range {
  const clean_str = String(input_str).trim();

  if (rangeRegex.test(clean_str)) {
    const range_parts = clean_str.split("-");
    // As we've tested for it, we know that we have Number-like Quantities to parse
    const min = parseFixedValue(range_parts[0]!.trim()) as
      | DecimalValue
      | FractionValue;
    const max = parseFixedValue(range_parts[1]!.trim()) as
      | DecimalValue
      | FractionValue;
    return { type: "range", min, max };
  }

  return { type: "fixed", value: parseFixedValue(clean_str) };
}
