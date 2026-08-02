import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/ugc/platform/auth";
import {
  addTrustedDevice,
  getWalletSecurityStatus,
  listTrustedDevices,
  removeTrustedDevice,
  setWalletPin,
  verifyWalletPin,
} from "@/lib/wallet-os/security";

export const dynamic = "force-dynamic";

export async function GET() {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  try {
    const [status, devices] = await Promise.all([getWalletSecurityStatus(user.id), listTrustedDevices(user.id)]);
    return NextResponse.json({
      status,
      devices: devices.map((device: {
        id: string;
        device_label: string;
        device_fingerprint: string;
        last_seen_at: string;
        created_at: string;
      }) => ({
        id: device.id,
        label: device.device_label,
        fingerprint: device.device_fingerprint,
        lastSeenAt: device.last_seen_at,
        createdAt: device.created_at,
      })),
    });
  } catch (err) {
    console.error("GET /api/wallet/os/security failed", err);
    return NextResponse.json({ error: "Failed to load wallet security" }, { status: 500 });
  }
}

/** Actions: set_pin | verify_pin | add_device | remove_device. */
export async function POST(req: NextRequest) {
  const { user, error } = await requireUser();
  if (!user) return NextResponse.json({ error }, { status: 401 });

  let body: {
    action?: string;
    pin?: string;
    requireTwoFactorWithdraw?: boolean;
    label?: string;
    fingerprint?: string;
    deviceId?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const ip = req.headers.get("x-forwarded-for");
  const userAgent = req.headers.get("user-agent");

  try {
    if (action === "set_pin") {
      await setWalletPin(user.id, String(body.pin ?? ""), {
        requireTwoFactorWithdraw: body.requireTwoFactorWithdraw,
        ip,
        userAgent,
      });
      return NextResponse.json({ success: true });
    }

    if (action === "verify_pin") {
      const result = await verifyWalletPin(user.id, String(body.pin ?? ""), { ip, userAgent });
      return NextResponse.json(result, { status: result.valid ? 200 : 401 });
    }

    if (action === "add_device") {
      const device = await addTrustedDevice(user.id, {
        label: String(body.label ?? "New device"),
        fingerprint: String(body.fingerprint ?? ""),
      });
      return NextResponse.json({ device });
    }

    if (action === "remove_device") {
      await removeTrustedDevice(user.id, String(body.deviceId ?? ""));
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    console.error("POST /api/wallet/os/security failed", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed" }, { status: 400 });
  }
}
