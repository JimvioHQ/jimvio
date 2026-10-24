import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { inspectZip, isPrivateCloudinaryUrl, safeStorageName, validateDeclaredFile } from "./files";
import {
  assessLicense,
  assessSubmission,
  auditMetadata,
  canTransition,
  decideTransition,
  evaluatePublication,
  contentDigest,
  fileDigest,
  mayGrantNewDelivery,
  mayNewlyActivateDigital,
  mayPurchaseDigitalListing,
  mayServeExistingDownload,
  mayServeLegacyStoredDownload,
  scanAuthorizesCurrentFile,
  publicTrustView,
  registerCustomerIssue,
  sanitizePublicText,
  TRANSITIONS,
} from "./policy";
import { CLOUDMERSIVE_ADVANCED_SCAN_URL, sha1Digest } from "./cloudmersive";
import { readBoundedHttpsBytes } from "./private-bytes";
import { runSecurityScan } from "./scanner";
import type { LicenseRights, PublicationInput } from "./types";

const privateFile = "https://res.cloudinary.com/demo/raw/private/v1/jimvio/digital-files/guide.pdf";
const rights: LicenseRights = {
  commercialSale: true,
  marketplaceDistribution: true,
  digitalDelivery: true,
  territories: ["worldwide"],
  expiresAt: null,
  allowsModification: false,
  allowsBundling: false,
  allowsSublicense: false,
};

function publication(overrides: Partial<PublicationInput> = {}): PublicationInput {
  return {
    verificationState: "approved",
    humanApproved: true,
    reviewerIsSubmitter: false,
    vendorSuspended: false,
    licenseStatus: "accepted",
    licenseExpired: false,
    licenseRevoked: false,
    commercialSale: true,
    marketplaceDistribution: true,
    digitalDelivery: true,
    fulfillment: "download",
    acquisitionModel: "original_vendor_product",
    affiliateUrl: null,
    fileUrl: privateFile,
    fileDigest: "bound-digest",
    scanDigest: "bound-digest",
    scanBytesInspected: true,
    scanStatus: "passed",
    qualityBlockers: [],
    enforcementBlocksPublication: false,
    openTakedown: false,
    ...overrides,
  };
}

describe("digital product trust", () => {
  it("accepts a complete original-vendor submission shape", () => {
    const result = assessSubmission({
      intent: "submit",
      name: "Field notes workbook",
      description: "A 40-page workbook with exercises, checklists, and printable templates for independent study.",
      categoryId: "cat",
      acquisitionModel: "original_vendor_product",
      fulfillmentMode: "download",
      affiliateDestinationUrl: null,
      rightsholderName: "Ada Seller",
      buyerLicenseSummary: "Personal use",
      declarationsAccepted: true,
      fileName: "guide.pdf",
      fileMime: "application/pdf",
      fileSizeBytes: 1200,
      fileUrl: privateFile,
      evidenceUrl: null,
      evidenceFileName: null,
      duplicateDigest: false,
    }, 50_000_000);
    assert.equal(result.ok, true);
    assert.equal(result.fulfillment, "download");
  });

  it("blocks publication when license evidence is missing or not accepted", () => {
    const license = assessLicense({
      acquisitionModel: "licensed_resale_product",
      reviewerRights: null,
      reviewerAccepted: false,
      evidenceCount: 0,
      declarationsAccepted: true,
      revoked: false,
      documentTextSample: "This pack includes resell rights and PLR.",
    });
    assert.notEqual(license.status, "accepted");
    assert.ok(license.blockers.some((line) => /not proof/i.test(line)));
    const decision = evaluatePublication(publication({ licenseStatus: license.status }));
    assert.equal(decision.publishable, false);
  });

  it("keeps affiliate products out of download fulfillment", () => {
    const submission = assessSubmission({
      intent: "submit",
      name: "Partner course",
      description: "Promote the publisher course. Customers complete purchase on the publisher site.",
      categoryId: "cat",
      acquisitionModel: "affiliate_only_product",
      fulfillmentMode: "download",
      affiliateDestinationUrl: "https://publisher.example/course",
      rightsholderName: "Publisher",
      buyerLicenseSummary: null,
      declarationsAccepted: true,
      fileName: null,
      fileMime: null,
      fileSizeBytes: null,
      fileUrl: privateFile,
      evidenceUrl: "https://res.cloudinary.com/demo/raw/private/v1/terms.pdf",
      evidenceFileName: "terms.pdf",
      duplicateDigest: false,
    }, 50_000_000);
    assert.equal(submission.ok, false);
    assert.equal(submission.fulfillment, "affiliate_redirect");
    const grant = mayGrantNewDelivery({
      paymentConfirmed: true,
      verificationState: "published",
      fulfillment: "affiliate_redirect",
      acquisitionModel: "affiliate_only_product",
      fileUrl: null,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: "not_applicable",
    });
    assert.equal(grant.allowed, false);
  });

  it("blocks expired and revoked licenses from new publication and delivery", () => {
    const expired = assessLicense({
      acquisitionModel: "licensed_resale_product",
      reviewerRights: { ...rights, expiresAt: "2020-01-01T00:00:00.000Z" },
      reviewerAccepted: true,
      evidenceCount: 1,
      declarationsAccepted: true,
      revoked: false,
    });
    assert.equal(expired.status, "expired");
    const revoked = assessLicense({
      acquisitionModel: "distribution_partner_product",
      reviewerRights: rights,
      reviewerAccepted: true,
      evidenceCount: 1,
      declarationsAccepted: true,
      revoked: true,
    });
    assert.equal(revoked.status, "revoked");
    assert.equal(evaluatePublication(publication({ licenseExpired: true })).publishable, false);
    assert.equal(mayGrantNewDelivery({
      paymentConfirmed: true,
      verificationState: "published",
      fulfillment: "download",
      acquisitionModel: "licensed_resale_product",
      fileUrl: privateFile,
      licenseExpired: true,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: "passed",
    }).allowed, false);
  });

  it("rejects unsafe, empty, oversized, and malformed files", () => {
    assert.equal(validateDeclaredFile({
      fileName: "../payload.exe",
      mime: "application/octet-stream",
      sizeBytes: 10,
      maxBytes: 1000,
    }).ok, false);
    assert.equal(validateDeclaredFile({
      fileName: "empty.pdf",
      mime: "application/pdf",
      sizeBytes: 0,
      maxBytes: 1000,
    }).ok, false);
    assert.equal(validateDeclaredFile({
      fileName: "big.pdf",
      mime: "application/pdf",
      sizeBytes: 5000,
      maxBytes: 1000,
    }).ok, false);
    const zip = new Uint8Array(30 + "../secret.exe".length);
    zip[0] = 0x50; zip[1] = 0x4b; zip[2] = 0x03; zip[3] = 0x04;
    const name = new TextEncoder().encode("../secret.exe");
    zip[26] = name.length;
    zip.set(name, 30);
    const inspected = inspectZip(zip);
    assert.equal(inspected.ok, false);
    assert.equal(safeStorageName("../../notes.pdf", "abc"), "abc.pdf");
    assert.equal(isPrivateCloudinaryUrl("https://res.cloudinary.com/demo/raw/upload/v1/file.pdf"), false);
  });

  it("does not mark a file clean when no scanner is configured", async () => {
    const result = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: "abc",
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
    }, { mode: "unconfigured" });
    assert.equal(result.status, "unavailable");
    assert.notEqual(result.status, "passed");
    const published = evaluatePublication(publication({ scanStatus: result.status }));
    assert.equal(published.publishable, false);
  });

  it("quarantines an infected scanner verdict and blocks delivery", async () => {
    const result = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: "abc",
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
    }, { mode: "http", url: "https://scanner.example/scan" }, async () => new Response(JSON.stringify({
      verdict: "infected",
      digest: "abc",
      bytesInspected: true,
      engine: "clamav",
      engineVersion: "1.0",
    }), { status: 200 }));
    assert.equal(result.status, "quarantined");
    assert.equal(mayGrantNewDelivery({
      paymentConfirmed: true,
      verificationState: "published",
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      fileUrl: privateFile,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: "quarantined",
    }).allowed, false);
    assert.equal(evaluatePublication(publication({ scanStatus: "quarantined" })).publishable, false);
  });

  it("does not treat a metadata-only or mismatched scanner response as clean", async () => {
    const request = {
      fulfillment: "download" as const,
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: "abc",
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: 10,
    };
    const metadataOnly = await runSecurityScan(request, { mode: "http", url: "https://scanner.example/scan" }, async () => new Response(JSON.stringify({
      verdict: "clean",
      digest: "abc",
      bytesInspected: false,
      engine: "fixture",
    }), { status: 200 }));
    assert.notEqual(metadataOnly.status, "passed");
    assert.equal(metadataOnly.bytesInspected, false);
    const mismatched = await runSecurityScan(request, { mode: "http", url: "https://scanner.example/scan" }, async () => new Response(JSON.stringify({
      verdict: "clean",
      digest: "other-file",
      bytesInspected: true,
    }), { status: 200 }));
    assert.equal(mismatched.status, "unavailable");
    const cleartext = await runSecurityScan(request, { mode: "http", url: "http://scanner.example/scan" });
    assert.equal(cleartext.status, "unavailable");
    assert.equal(scanAuthorizesCurrentFile({
      scanStatus: "passed",
      fileDigest: "abc",
      scanDigest: "other",
      scanBytesInspected: true,
    }), false);
    assert.equal(evaluatePublication(publication({
      scanStatus: "passed",
      fileDigest: "abc",
      scanDigest: "abc",
      scanBytesInspected: false,
    })).publishable, false);
  });

  it("does not sell or newly grant an unverified legacy digital product", () => {
    assert.equal(mayPurchaseDigitalListing({
      isDigital: true,
      schemaReady: true,
      verificationState: null,
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      scanStatus: null,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
    }).allowed, false);
    assert.equal(mayPurchaseDigitalListing({
      isDigital: false,
      schemaReady: false,
      verificationState: null,
      fulfillment: null,
      acquisitionModel: null,
      scanStatus: null,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
    }).allowed, true);
    assert.equal(mayGrantNewDelivery({
      paymentConfirmed: true,
      verificationState: null,
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      fileUrl: privateFile,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: null,
    }).allowed, false);
    assert.equal(mayServeExistingDownload({
      hasEntitlement: true,
      verificationState: null,
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      enforcementBlocksDelivery: false,
      scanStatus: null,
    }).allowed, true);
  });

  it("binds a Cloudmersive result to the uploaded bytes and fails closed otherwise", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4 clean");
    const digest = contentDigest(bytes);
    const sameName = fileDigest(privateFile, bytes.byteLength, "guide.pdf");
    const replaced = contentDigest(new TextEncoder().encode("%PDF-1.4 replaced"));
    assert.notEqual(digest, replaced);
    assert.notEqual(digest, sameName);
    const cleanBody = {
      CleanResult: true,
      FoundViruses: [],
      ContentInformation: { Hash_SHA1: sha1Digest(bytes) },
    };
    let postedTo = "";
    let sawBearer = false;
    const clean = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: digest,
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: bytes.byteLength,
      bytes,
    }, { mode: "cloudmersive", token: "test-key", url: "https://evil.example/scan", providerMaxBytes: 3_500_000 }, async (url, init) => {
      postedTo = url;
      sawBearer = String((init?.headers as Record<string, string> | undefined)?.authorization || "").includes("Bearer");
      return new Response(JSON.stringify(cleanBody), { status: 200 });
    });
    assert.equal(postedTo, CLOUDMERSIVE_ADVANCED_SCAN_URL);
    assert.equal(sawBearer, false);
    assert.equal(clean.status, "passed");
    assert.equal(clean.bytesInspected, true);
    assert.equal(clean.engine, "cloudmersive");
    assert.equal(clean.engineVersion, null);
    const infected = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: digest,
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: bytes.byteLength,
      bytes,
    }, { mode: "cloudmersive", token: "test-key", providerMaxBytes: 3_500_000 }, async () => new Response(JSON.stringify({
      CleanResult: false,
      FoundViruses: [{ FileName: "guide.pdf", VirusName: "EICAR" }],
      ContentInformation: { Hash_SHA1: sha1Digest(bytes) },
    }), { status: 200 }));
    assert.equal(infected.status, "quarantined");
    const unbound = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: digest,
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: bytes.byteLength,
      bytes,
    }, { mode: "cloudmersive", token: "test-key", providerMaxBytes: 3_500_000 }, async () => new Response(JSON.stringify({
      CleanResult: true,
      FoundViruses: [],
      ContentInformation: { Hash_SHA1: "deadbeef" },
    }), { status: 200 }));
    assert.notEqual(unbound.status, "passed");
    const missing = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: digest,
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: bytes.byteLength,
      bytes,
    }, { mode: "cloudmersive", token: "", providerMaxBytes: 3_500_000 });
    assert.equal(missing.status, "unavailable");
    const oversized = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: null,
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: 20,
      bytes: new Uint8Array(20),
    }, { mode: "cloudmersive", token: "test-key", providerMaxBytes: 8 }, async () => {
      throw new Error("scanner must not be called");
    });
    assert.equal(oversized.status, "unavailable");
    const timedOut = await runSecurityScan({
      fulfillment: "download",
      hasDeliverable: true,
      structuralFailure: false,
      encryptedArchive: false,
      suspiciousExecutable: false,
      fileDigest: digest,
      fileName: "guide.pdf",
      mime: "application/pdf",
      sizeBytes: bytes.byteLength,
      bytes,
    }, { mode: "cloudmersive", token: "test-key", providerMaxBytes: 3_500_000 }, async () => {
      throw new Error("timeout");
    });
    assert.equal(timedOut.status, "unavailable");
    const redirected = await readBoundedHttpsBytes(
      "https://res.cloudinary.com/demo/raw/private/v1/file.pdf",
      100,
      async () => new Response(null, { status: 302, headers: { location: "https://evil.example/file" } }),
    );
    assert.equal(redirected.ok, false);
    const publicHost = await readBoundedHttpsBytes(
      "https://evil.example/file.pdf",
      100,
      async () => new Response("nope"),
    );
    assert.equal(publicHost.ok, false);
  });

  it("refuses a new digital activation when verification is missing", () => {
    assert.equal(mayNewlyActivateDigital({
      isDigital: true,
      verificationState: null,
      previousStatus: "pending_review",
      nextStatus: "active",
      fileChanged: false,
    }).allowed, false);
    assert.equal(mayNewlyActivateDigital({
      isDigital: true,
      verificationState: null,
      previousStatus: "active",
      nextStatus: "active",
      fileChanged: false,
    }).allowed, true);
    assert.equal(mayNewlyActivateDigital({
      isDigital: true,
      verificationState: null,
      previousStatus: "active",
      nextStatus: "active",
      fileChanged: true,
    }).allowed, false);
    assert.equal(mayNewlyActivateDigital({
      isDigital: false,
      verificationState: null,
      previousStatus: "draft",
      nextStatus: "active",
      fileChanged: false,
    }).allowed, true);
    assert.equal(mayGrantNewDelivery({
      paymentConfirmed: true,
      verificationState: "published",
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      fileUrl: privateFile,
      fileDigest: "abc",
      scanDigest: "abc",
      scanBytesInspected: false,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: "passed",
    }).allowed, false);
  });

  it("requires human approval even when automated checks would otherwise pass", () => {
    const decision = evaluatePublication(publication({
      verificationState: "under_review",
      humanApproved: false,
    }));
    assert.equal(decision.publishable, false);
    assert.ok(decision.reasons.some((line) => /reviewer|human/i.test(line)));
  });

  it("rejects self-approval and invalid or conflicting transitions", () => {
    assert.equal(evaluatePublication(publication({ reviewerIsSubmitter: true })).publishable, false);
    assert.equal(canTransition("published", "approved"), false);
    const conflict = decideTransition({ current: "under_review", expected: "submitted", to: "approved" });
    assert.equal(conflict.ok, false);
    if (!conflict.ok) assert.equal(conflict.code, "conflict");
    const invalid = decideTransition({ current: "published", expected: "published", to: "approved" });
    assert.equal(invalid.ok, false);
  });

  it("does not let a replaced file keep an approval", () => {
    const before = fileDigest(privateFile, 10, "guide.pdf");
    const after = fileDigest(privateFile.replace("guide", "guide-2"), 10, "guide-2.pdf");
    assert.notEqual(before, after);
    assert.equal(canTransition("published", "submitted"), true);
    assert.equal(evaluatePublication(publication({ verificationState: "submitted", humanApproved: false })).publishable, false);
  });

  it("does not serve a stored legacy URL without payment or a loaded gate", () => {
    const base = {
      gateLoaded: true,
      verificationState: null as null,
      fulfillment: "download" as const,
      acquisitionModel: "original_vendor_product" as const,
      paymentComplete: true,
      storedUrlIsHttps: true,
      previouslyGranted: true,
    };
    assert.equal(mayServeLegacyStoredDownload(base).allowed, true);
    assert.equal(mayServeLegacyStoredDownload({ ...base, previouslyGranted: false }).allowed, false);
    assert.equal(mayServeLegacyStoredDownload({ ...base, paymentComplete: false }).allowed, false);
    assert.equal(mayServeLegacyStoredDownload({ ...base, gateLoaded: false }).allowed, false);
    assert.equal(mayServeLegacyStoredDownload({ ...base, verificationState: "published" }).allowed, false);
    assert.equal(mayServeLegacyStoredDownload({ ...base, acquisitionModel: "affiliate_only_product" }).allowed, false);
    assert.equal(mayServeLegacyStoredDownload({ ...base, storedUrlIsHttps: false }).allowed, false);
  });

  it("serves an existing entitlement only when delivery is still allowed", () => {
    assert.equal(mayServeExistingDownload({
      hasEntitlement: false,
      verificationState: "published",
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      enforcementBlocksDelivery: false,
      scanStatus: "passed",
    }).allowed, false);
    assert.equal(mayServeExistingDownload({
      hasEntitlement: true,
      verificationState: "removed",
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      enforcementBlocksDelivery: false,
      scanStatus: "passed",
    }).allowed, false);
    assert.equal(mayServeExistingDownload({
      hasEntitlement: true,
      verificationState: "suspended",
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      enforcementBlocksDelivery: false,
      scanStatus: "passed",
    }).allowed, true);
    assert.equal(mayGrantNewDelivery({
      paymentConfirmed: true,
      verificationState: "suspended",
      fulfillment: "download",
      acquisitionModel: "original_vendor_product",
      fileUrl: privateFile,
      licenseExpired: false,
      licenseRevoked: false,
      enforcementBlocksDelivery: false,
      scanStatus: "passed",
    }).allowed, false);
  });

  it("records takedown transitions without erasing the path back to review", () => {
    assert.equal(canTransition("published", "takedown_pending"), true);
    assert.equal(canTransition("takedown_pending", "removed"), true);
    assert.equal(canTransition("removed", "under_review"), true);
    assert.equal(canTransition("suspended", "under_review"), true);
  });

  it("does not create a second financial action for a duplicate issue or a refund flag", () => {
    const first = registerCustomerIssue(null, {});
    assert.equal(first.duplicate, false);
    assert.equal(first.financialActionCount, 0);
    const again = registerCustomerIssue({ id: "issue-1", status: "open", financialActionCount: 0 }, {});
    assert.equal(again.duplicate, true);
    assert.equal(again.financialActionCount, 0);
    assert.equal(again.issue.id, "issue-1");
    const refund = registerCustomerIssue(again.issue, { refund: true });
    assert.ok(refund.error);
    assert.equal(refund.financialActionCount, 0);
  });

  it("does not collapse separate trust claims into a safety guarantee", () => {
    const view = publicTrustView({
      vendorVerificationStatus: "verified",
      licenseStatus: "accepted",
      licenseExpired: false,
      licenseRevoked: false,
      scanStatus: "unavailable",
      verificationState: "published",
      humanApproved: true,
      fulfillment: "download",
      buyerLicenseSummary: "Personal use",
      refundPolicyNote: null,
    });
    assert.equal(view.vendorIdentityVerified, true);
    assert.equal(view.licenseEvidenceReviewed, true);
    assert.equal(view.securityChecksCompleted, false);
    assert.equal(view.guaranteesSafety, false);
    assert.equal(sanitizePublicText("<script>alert(1)</script><b>Hello</b>"), "Hello");
    const meta = auditMetadata({ fileUrl: "https://secret.example/file", token: "abc", scanStatus: "unavailable" });
    assert.equal("fileUrl" in meta, false);
    assert.equal("token" in meta, false);
  });

  it("keeps the database transition map aligned with the application map", () => {
    const sql = readFileSync(
      join(process.cwd(), "database/migrations/168_digital_product_verification.sql"),
      "utf8",
    );
    for (const [from, targets] of Object.entries(TRANSITIONS)) {
      for (const target of targets) {
        assert.match(sql, new RegExp(`WHEN '${from}' THEN p_to IN \\([^\\)]*'${target}'`));
      }
    }
    assert.match(sql, /scan_not_passed/);
    assert.match(sql, /verification audit history is append-only/);
    assert.match(sql, /NEW\.digital_file_url := NULL/);
    assert.match(sql, /digital_verification_required/);
    assert.match(sql, /scan_digest IS DISTINCT FROM prod\.file_digest/);
    assert.match(sql, /OLD\.status::text IS DISTINCT FROM 'active'/);
  });
});
