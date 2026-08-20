import { Fragment } from "react";

export function RichText({
  text,
  onGlossary,
}: {
  text: string;
  onGlossary: (id: string) => void;
}) {
  const pattern = /\[\[([\w-]+)\|([^\]]+)\]\]/g;
  const nodes = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index;
    nodes.push(text.slice(last, index));
    nodes.push(
      <button
        type="button"
        className="glossary-link"
        key={`${match[1]}-${index}`}
        onClick={() => onGlossary(match[1]!)}
      >
        {match[2]}
      </button>,
    );
    last = index + match[0].length;
  }
  nodes.push(text.slice(last));
  return <Fragment>{nodes}</Fragment>;
}
