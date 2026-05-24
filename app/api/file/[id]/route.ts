import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
    api_key: process.env.CLOUDINARY_API_KEY!,
    api_secret: process.env.CLOUDINARY_API_SECRET!,
});

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const publicId = params.id;

        if (!publicId) {
            return NextResponse.json(
                { error: "Invalid file id" },
                { status: 400 }
            );
        }

        const { searchParams } = new URL(req.url);
        const download = searchParams.get("download");

        const url = cloudinary.url(publicId, {
            secure: true,
            resource_type: "auto",
        });

        const response = await fetch(url);

        if (!response.ok) {
            return NextResponse.json(
                { error: "File not found" },
                { status: 404 }
            );
        }

        const contentType =
            response.headers.get("content-type") ||
            "application/octet-stream";

        const headers: Record<string, string> = {
            "Content-Type": contentType,
            "Cache-Control": "private, max-age=3600",
        };

        // 🔥 FORCE DOWNLOAD
        if (download === "1") {
            headers["Content-Disposition"] =
                `attachment; filename="${publicId.split("/").pop() || "file"}"`;
        } else {
            headers["Content-Disposition"] = "inline";
        }

        return new NextResponse(response.body, {
            status: 200,
            headers,
        });
    } catch (err) {
        console.error("File proxy error:", err);

        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}