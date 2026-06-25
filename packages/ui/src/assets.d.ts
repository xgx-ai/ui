declare module "*.css" {
  const css: string;
  export default css;
}

interface ImportMeta {
  hot?: {
    accept: () => void;
    data: unknown;
  };
}
