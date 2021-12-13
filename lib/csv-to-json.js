import csvToJson from "convert-csv-to-json";

csvToJson.fieldDelimiter("|").generateJsonFileFromCsv(process.env.INPUT, process.env.OUTPUT);