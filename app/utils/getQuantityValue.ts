import type { FixedValue, Range } from "@tmlmt/cooklang-parser";

export default function (val: FixedValue | Range): string {
  let resultString = "";
  if (val.type === "fixed") {
    if (val.value.type === "decimal") {
      resultString += String(val.value.value);
    } else if (val.value.type === "fraction") {
      resultString += String(val.value.num) + "/" + String(val.value.den);
    } else if (val.value.type === "text") {
      resultString += val.value;
    }
  } else {
    // It's a Range
    if (val.min.type === "decimal") {
      resultString += String(val.min.value);
    } else {
      resultString += String(val.min.num) + "/" + String(val.min.den);
    }
    resultString += "-";
    if (val.max.type === "decimal") {
      resultString += String(val.max.value);
    } else {
      resultString += String(val.max.num) + "/" + String(val.max.den);
    }
  }
  return resultString;
}
