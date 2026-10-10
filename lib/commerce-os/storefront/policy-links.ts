/** Footer policy destinations that must stay on the merchant store. */

export function withRequiredPolicyLinks(
  items: Array<{ label: string; href: string }>,
  required: Array<{ label: string; href: string }>,
): Array<{ label: string; href: string }> {
  const next = [...items];
  for (const link of required) {
    const key = link.href.replace(/\/$/, "");
    const present = next.some((item) => {
      const href = item.href.replace(/\/$/, "");
      return href === key || href.endsWith(key);
    });
    if (!present) next.push(link);
  }
  return next;
}
