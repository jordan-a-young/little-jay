import { useMemo, type ReactNode } from "react";
import { Prism } from "prism-react-renderer";
import type { CodeLanguage } from "./CodeBlock.js";

type CodeToken = ReturnType<typeof Prism.tokenize>[number];

function renderToken(token: CodeToken, key: number): ReactNode {
  if (typeof token === "string") return token;
  const aliases = typeof token.alias === "string" ? [token.alias] : (token.alias ?? []);
  const content = Array.isArray(token.content)
    ? token.content.map(renderToken)
    : typeof token.content === "string"
      ? token.content
      : renderToken(token.content, 0);
  return (
    <span key={key} className={["token", token.type, ...aliases].join(" ")}>
      {content}
    </span>
  );
}

export default function HighlightedCode({
  code,
  language,
}: {
  code: string;
  language: CodeLanguage;
}) {
  const tokens = useMemo(
    () => Prism.tokenize(code, Prism.languages[language] ?? {}),
    [code, language],
  );
  return tokens.map(renderToken);
}
