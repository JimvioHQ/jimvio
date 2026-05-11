"use client";

import { ProductFormShell } from "@/components/product/ProductFormShell";
import { useParams } from "next/navigation";

export default function EditProductPage() {
    const params = useParams();
    const productId = params?.id as string;
    return <ProductFormShell title="Edit product" isEdit={true} productId={productId} />;
}