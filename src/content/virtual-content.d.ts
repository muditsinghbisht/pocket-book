declare module "virtual:content" {
  const domains: import("./schema.ts").TopicNode[];
  export default domains;
  /** Lazy compiled MDX modules for lessons and case studies, keyed by path under content/. */
  export const modules: Record<
    string,
    () => Promise<{
      default: import("react").ComponentType<{ components?: object }>;
    }>
  >;
}
