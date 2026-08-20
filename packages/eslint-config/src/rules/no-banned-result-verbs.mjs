/**
 * Non-negotiable #11: result-surface copy must never contain "should",
 * "we recommend" or "best for you" (§17.9). Applied to result components and
 * disclosure copy in calculation-ui and apps/web.
 */
const BANNED = /\b(should|we recommend|best for you)\b/i;

function check(context, node, text) {
  const match = BANNED.exec(text);
  if (match) {
    context.report({
      node,
      messageId: "banned",
      data: { phrase: match[0] },
    });
  }
}

export default {
  meta: {
    type: "problem",
    docs: {
      description:
        "disallow advice-implying verbs in result-surface copy (PRD §17.9, §20.10)",
    },
    messages: {
      banned:
        'Result copy must not contain "{{phrase}}" — rephrase without implying advice (PRD §17.9).',
    },
    schema: [],
  },
  create(context) {
    return {
      Literal(node) {
        if (typeof node.value === "string") check(context, node, node.value);
      },
      TemplateElement(node) {
        check(context, node, node.value.raw);
      },
      JSXText(node) {
        check(context, node, node.value);
      },
    };
  },
};
