export * from "./common.js";
export * from "./units.js";
export * from "./applicability.js";
export * from "./properties.js";
export * from "./profiles/electronics.js";
export * from "./profiles/electrical.js";
export * from "./profiles/wiring.js";
export * from "./part.js";
export * from "./process.js";
export * from "./issues.js";
export * from "./document.js";
export * from "./changes.js";
export * from "./views.js";
export * from "./modules/subcontract.js";

/** A native bomkit document, discriminated by `kind`. */
export type BomkitDocument =
  | import("./document.js").BomDocument
  | import("./changes.js").ChangeSet
  | import("./views.js").BuyingBom;
