// Usage of `bomkit import`, kept apart from the command so that the other
// commands of bomkit can print it without loading the importer.

export const IMPORT_USAGE =
  "import <config.json> <source>... [-o <out.bom.json>] [--revision <R>] [--previous <old.bom.json>] [--enrich [<id>=]<file.json>]...";
