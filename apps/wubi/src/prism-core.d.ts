// The core alone exports the same object as the package's main entry; @types/prismjs only types the latter.
declare module "prismjs/components/prism-core" {
  import Prism from "prismjs";
  export default Prism;
}
