import "./prism";
// The core only: the package's main entry bundles plugins that touch Element at load, which the static render (linkedom: a document, no Element) does not have.
import Prism from "prismjs/components/prism-core";

/**
 * The one place the Prism core is imported. The grammar files are scripts that extend the global `Prism` as soon as they run, while the core is CommonJS, which the bundler wraps to initialise wherever it is first imported. markdown.ts and code.tsx share some grammars, so the bundler moves those into a chunk of their own; when each of them imported the core itself, that chunk ran before either had initialised it and the grammars threw on an undefined `Prism.languages`, taking the page down. Importing this module ahead of any grammar puts the initialisation in the same shared chunk, before the grammars.
 */
export default Prism;
