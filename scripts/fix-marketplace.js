const fs = require("fs");
const file = "c:/Users/pc/Desktop/Jimvio/jimvio/components/marketplace/marketplace-client.tsx";
let c = fs.readFileSync(file, "utf8");

// 1. HeroDealBanner props
c = c.replace(
  /function HeroDealBanner\(\{ params \}: \{ params: Record<string, string \| undefined> \}\) \{/g,
  "function HeroDealBanner({ params, basePath }: { params: Record<string, string | undefined>, basePath?: string }) {"
);

// 2. TypeTabs props
c = c.replace(
  /function TypeTabs\(\{\s*params,\s*\}\:\s*\{\s*params\: Record<string, string \| undefined>;\s*\}\)\s*\{/g,
  "function TypeTabs({ params, basePath }: { params: Record<string, string | undefined>; basePath?: string; }) {"
);

// 3. MarketplaceClient props
c = c.replace(
  /export function MarketplaceClient\(\{([\s\S]*?)params,([\s\S]*?)\}: MarketplaceClientProps\) \{/g,
  "export function MarketplaceClient({$1params,$2basePath = \"/marketplace\",}: MarketplaceClientProps & { basePath?: string }) {"
);

// 4. Overwrite marketplaceHref(x, y) to marketplaceHref(x, y, basePath) globally
// (assuming we only have 2 arguments everywhere in that file)
c = c.replace(/marketplaceHref\(([^,]+),\s*([^)]+)\)/g, "marketplaceHref($1, $2, basePath)");

// 5. Provide basePath to subcomponents
c = c.replace(/<HeroDealBanner params=\{paramsRecord\}\s*\/>/g, "<HeroDealBanner params={paramsRecord} basePath={basePath} />");
c = c.replace(/<TypeTabs params=\{paramsRecord\}\s*\/>/g, "<TypeTabs params={paramsRecord} basePath={basePath} />");
c = c.replace(/<MarketplaceSearch currentParams=\{paramsRecord\}\s*className="w-full"\s*\/>/g, "<MarketplaceSearch currentParams={paramsRecord} className=\"w-full\" basePath={basePath} />");
c = c.replace(/<MarketplaceSearch currentParams=\{paramsRecord\}\s*className="flex-1"\s*\/>/g, "<MarketplaceSearch currentParams={paramsRecord} className=\"flex-1\" basePath={basePath} />");

// 6. Clear all link
c = c.replace(/<Link href="\/marketplace"/g, "<Link href={basePath}");

fs.writeFileSync(file, c);
console.log("Done");
