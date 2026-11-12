import type * as React from "react";
import { evaluate } from "@mdx-js/mdx";
import * as runtime from "react/jsx-runtime";

const components = {
  h1: (props: React.ComponentProps<"h1">) => (
    <h1 className="text-3xl font-semibold tracking-tight" {...props} />
  ),
  h2: (props: React.ComponentProps<"h2">) => (
    <h2
      className="mt-10 scroll-mt-24 text-2xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h3: (props: React.ComponentProps<"h3">) => (
    <h3
      className="mt-8 scroll-mt-24 text-xl font-semibold tracking-tight"
      {...props}
    />
  ),
  h4: (props: React.ComponentProps<"h4">) => (
    <h4 className="mt-6 scroll-mt-24 text-base font-semibold" {...props} />
  ),
  p: (props: React.ComponentProps<"p">) => (
    <p className="mt-4 leading-relaxed text-ink/80" {...props} />
  ),
  a: (props: React.ComponentProps<"a">) => (
    <a
      className="underline decoration-line underline-offset-4 transition-colors hover:text-ink"
      {...props}
    />
  ),
  ul: (props: React.ComponentProps<"ul">) => (
    <ul
      className="mt-4 list-disc space-y-1.5 pl-5 text-ink/80 marker:text-muted"
      {...props}
    />
  ),
  ol: (props: React.ComponentProps<"ol">) => (
    <ol
      className="mt-4 list-decimal space-y-1.5 pl-5 text-ink/80 marker:text-muted"
      {...props}
    />
  ),
  li: (props: React.ComponentProps<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: (props: React.ComponentProps<"blockquote">) => (
    <blockquote
      className="mt-4 border-l-2 border-line pl-4 text-muted"
      {...props}
    />
  ),
  code: (props: React.ComponentProps<"code">) => (
    <code
      className="rounded bg-code px-1 py-0.5 font-mono text-[0.85em]"
      {...props}
    />
  ),
  pre: (props: React.ComponentProps<"pre">) => (
    <pre
      className="mt-4 overflow-x-auto rounded-xl border border-line bg-code p-4 font-mono text-xs leading-relaxed"
      {...props}
    />
  ),
  table: (props: React.ComponentProps<"table">) => (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  th: (props: React.ComponentProps<"th">) => (
    <th
      className="border-b border-line px-3 py-2 text-left font-semibold"
      {...props}
    />
  ),
  td: (props: React.ComponentProps<"td">) => (
    <td className="border-b border-line px-3 py-2 text-ink/80" {...props} />
  ),
  strong: (props: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-ink" {...props} />
  ),
};

export default async function MdxContent({ source }: { source: string }) {
  const { default: Content } = await evaluate(source, {
    ...runtime,
    useMDXComponents: () => components,
  });

  return <Content />;
}
