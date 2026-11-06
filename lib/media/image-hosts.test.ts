import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isAllowedImageHost } from "@/lib/media/image-hosts";

describe("image optimizer host allowlist", () => {
  it("keeps every host the catalog and profiles use", () => {
    for (const host of ["cf.cjdropshipping.com", "oss-cf.cjdropshipping.com", "images.unsplash.com", "www.jimvio.com", "jimvio.com", "res.cloudinary.com", "lh3.googleusercontent.com", "cc-west-usa.oss-us-west-1.aliyuncs.com", "cbu01.alicdn.com", "vsfhwfimudpdipdkxbww.supabase.co", "yt3.ggpht.com", "p16-common-sign.tiktokcdn.com"]) {
      assert.ok(isAllowedImageHost(host), host);
    }
  });

  it("rejects arbitrary hosts and look-alikes", () => {
    for (const host of ["evil.example", "cjdropshipping.com.evil.example", "notjimvio.com", "res.cloudinary.com.evil.test"]) {
      assert.ok(!isAllowedImageHost(host), host);
    }
  });
});
