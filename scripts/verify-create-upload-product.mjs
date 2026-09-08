#!/usr/bin/env node
/**
 * Static verification: Upload Product restored + shared Create menu wired.
 */
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function assert(cond, msg) {
  if (!cond) failures.push(msg);
}

assert(exists("app/(public)/marketplace/new/page.tsx"), "Upload Product page /marketplace/new must exist");
assert(exists("app/ugc/campaign-center/store/page.tsx"), "Seller Hub store page must exist");
assert(exists("app/ugc/campaign-center/store/[id]/edit/page.tsx"), "Seller product edit page must exist");

const uploadPage = read("app/(public)/marketplace/new/page.tsx");
assert(uploadPage.includes("ProductFormShell"), "Upload page must use ProductFormShell");
assert(uploadPage.includes("isEdit={false}"), "Upload page must be create mode");

const createMenu = read("lib/navigation/create-menu.ts");
assert(createMenu.includes('UPLOAD_PRODUCT_HREF = "/marketplace/new"'), "canonical upload href");
assert(createMenu.includes("getCreateMenuItems"), "shared getCreateMenuItems");
assert(createMenu.includes("Upload Product"), "Upload Product in menu");

const panel = read("components/feed/CreateMenuPanel.tsx");
assert(panel.includes("getCreateMenuItems"), "CreateMenuPanel uses shared config");

const dropdown = read("components/feed/CreateQuickLaunch.tsx");
assert(dropdown.includes('variant === "header"'), "header Create variant");

const appTopNav = read("components/shell/AppTopNav.tsx");
assert(appTopNav.includes("CreateMenuDropdown"), "AppTopNav must wire CreateMenuDropdown");
assert(!/<Plus[\s>]/.test(appTopNav), "AppTopNav must not use dead Plus Create button");

const navbar = read("components/layout/navbar.tsx");
assert(navbar.includes("CreateMenuDropdown"), "public Navbar must wire Create");

const commands = read("lib/command-center/commands.ts");
assert(commands.includes('href: "/marketplace/new"'), "command center upload-product");

if (failures.length) {
  console.error("FAIL create/upload verification:\n" + failures.map((f) => ` - ${f}`).join("\n"));
  process.exit(1);
}

console.log(
  "PASS create/upload verification (Upload Product restored, shared Create menu, Home/Market/Aff/UGC wiring)",
);
