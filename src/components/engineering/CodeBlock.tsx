import { Fragment } from 'react';

import { cn } from '@/lib/cn';

/**
 * Syntax highlighting for the two languages this page shows.
 *
 * Hand-rolled rather than pulled in: Shiki and Prism are both large, and this
 * page shows four short snippets. The whole highlighter is one ordered regex.
 *
 * The order is the entire trick. Comments and strings are matched *first*, so
 * once a run of characters has been claimed as a string it cannot also be
 * matched as a keyword — which is the bug every naive `String.replace` based
 * highlighter has, colouring the `SELECT` inside `'a SELECT statement'` and,
 * worse, mangling any HTML it has already inserted.
 */
type Language = 'sql' | 'ts';

const PATTERNS: Record<Language, RegExp> = {
  // Order: comment, string, keyword, number, punctuation.
  sql: /(--[^\n]*)|('(?:[^'\\]|\\.)*')|\b(SELECT|INSERT|UPDATE|DELETE|SET|FROM|WHERE|AND|OR|NOT|NULL|INTO|VALUES|RETURNING|BEGIN|COMMIT|ROLLBACK|CONSTRAINT|CHECK|ALTER|TABLE|ADD|ON|AS|IN|LIMIT|ORDER|BY|FOR|UPDATE)\b|\b(\d+)\b/gi,
  ts: /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|(`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|\b(await|async|const|let|var|function|return|if|else|for|of|in|throw|new|type|export|import|from|class|extends|interface|true|false|null|undefined)\b|\b(\d+)\b/g,
};

const CLASSES = {
  comment: 'text-dark-500 italic',
  string: 'text-secondary-300',
  keyword: 'text-primary-300',
  number: 'text-warning-400',
} as const;

function highlight(code: string, language: Language) {
  const pattern = new RegExp(PATTERNS[language].source, PATTERNS[language].flags);
  const nodes = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(code)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(
        <Fragment key={key++}>{code.slice(lastIndex, match.index)}</Fragment>
      );
    }

    // Which capture group fired tells us what kind of token it is; they are
    // declared in the same order as CLASSES.
    const [, comment, string, keyword, number] = match;
    const className = comment
      ? CLASSES.comment
      : string
        ? CLASSES.string
        : keyword
          ? CLASSES.keyword
          : number
            ? CLASSES.number
            : undefined;

    nodes.push(
      <span key={key++} className={className}>
        {match[0]}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < code.length) {
    nodes.push(<Fragment key={key++}>{code.slice(lastIndex)}</Fragment>);
  }

  return nodes;
}

export type CodeBlockProps = {
  code: string;
  language?: Language;
  /** Filename or description shown in the strip above the code. */
  caption?: string;
  /** Tints the frame — used to mark the broken version red. */
  tone?: 'neutral' | 'danger' | 'success';
  className?: string;
};

export function CodeBlock({
  code,
  language = 'ts',
  caption,
  tone = 'neutral',
  className,
}: CodeBlockProps) {
  return (
    <figure
      className={cn(
        // `not-prose` because these blocks sit inside a `prose` container, and
        // the typography plugin's inline-code styling applies to every `code`
        // element — including the one inside this `pre`. Without it each line
        // of a snippet gets the little grey pill meant for `like this` in a
        // sentence, and the block reads as a stack of boxes.
        'not-prose overflow-hidden rounded-xl border bg-dark-950/80',
        tone === 'danger' && 'border-danger-500/25',
        tone === 'success' && 'border-success-500/25',
        tone === 'neutral' && 'border-white/[0.08]',
        className
      )}
    >
      {caption ? (
        <figcaption
          className={cn(
            'border-b px-4 py-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em]',
            tone === 'danger' && 'border-danger-500/20 text-danger-400',
            tone === 'success' && 'border-success-500/20 text-success-400',
            tone === 'neutral' && 'border-white/[0.06] text-dark-500'
          )}
        >
          {caption}
        </figcaption>
      ) : null}
      {/* The scroller is the <pre> itself and it is focusable, because a
          region that scrolls has to be reachable by keyboard — otherwise the
          right-hand end of a long line is unreadable without a mouse. */}
      <pre
        tabIndex={0}
        className="overflow-x-auto px-4 py-3.5 text-[0.8125rem] leading-relaxed"
      >
        <code className="font-mono text-dark-200">
          {highlight(code.trim(), language)}
        </code>
      </pre>
    </figure>
  );
}
