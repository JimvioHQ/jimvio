"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CloudinaryUploadButton } from "@/components/ui/cloudinary-upload";
import { formatCommerceMoney } from "@/lib/commerce-os/money";
import {
  STORE_PRODUCT_DESCRIPTION_MAX,
  STORE_PRODUCT_NAME_MAX,
} from "@/lib/commerce-os/product-editor";

export type StoreProductEditorInitial = {
  id: string;
  name: string;
  description: string;
  images: string[];
  price: number;
  currency: string;
  sku: string | null;
  variantCount: number;
};

type Props = {
  storeId: string;
  product: StoreProductEditorInitial;
};

export function StoreProductEditor({ storeId, product }: Props) {
  const router = useRouter();
  const backHref = `/commerce/products?storeId=${storeId}`;
  const [name, setName] = useState(product.name);
  const [description, setDescription] = useState(product.description);
  const [images, setImages] = useState(product.images);
  const [price, setPrice] = useState(String(product.price));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const variantLocked = product.variantCount > 1;
  const dirty = useMemo(() => {
    return (
      name !== product.name ||
      description !== product.description ||
      price !== String(product.price) ||
      images.join("|") !== product.images.join("|")
    );
  }, [name, description, price, images, product]);

  useEffect(() => {
    if (!dirty) return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [dirty]);

  function leave() {
    if (dirty && !window.confirm("Leave without saving changes?")) return;
    router.push(backHref);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch(`/api/commerce/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId,
          name,
          description,
          images,
          price: variantLocked ? product.price : Number(price),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof json.error === "string" ? json.error : "Could not save product.");
        return;
      }
      setMessage("Changes saved.");
      router.push(backHref);
      router.refresh();
    } catch {
      setError("Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  function moveImage(index: number, direction: -1 | 1) {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;
    const copy = images.slice();
    const [item] = copy.splice(index, 1);
    copy.splice(next, 0, item);
    setImages(copy);
  }

  return (
    <form onSubmit={save} className="mx-auto max-w-3xl space-y-6">
      <nav className="text-sm text-[#6B7280]">
        <Link href={backHref} className="hover:text-[#111827]">
          Products
        </Link>
        <span> / </span>
        <span className="text-[#111827]">{product.name}</span>
        <span> / Edit</span>
      </nav>
      <div>
        <h1 className="text-2xl font-semibold text-[#111827]">Edit Product</h1>
        <p className="mt-1 text-sm text-[#6B7280]">
          Update the name, description, photos, and selling price for this store product.
        </p>
      </div>

      <div className="grid gap-4 rounded-2xl border border-[#E5E7EB] bg-white p-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <div className="grid h-28 place-items-center overflow-hidden rounded-xl bg-[#F8FAFC]">
          {images[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <span className="text-xs text-[#9CA3AF]">No photo</span>
          )}
        </div>
        <div>
          <p className="font-semibold text-[#111827]">{name || "Untitled product"}</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-[#6B7280]">
            {description.trim() || "No description yet."}
          </p>
          <p className="mt-2 text-sm font-semibold text-[#111827]">
            {formatCommerceMoney(variantLocked ? product.price : Number(price) || 0, product.currency)}
          </p>
          {product.sku ? <p className="mt-1 text-xs text-[#6B7280]">SKU {product.sku}</p> : null}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[#111827]">Product name</span>
        <input
          required
          minLength={2}
          maxLength={STORE_PRODUCT_NAME_MAX}
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-11 w-full rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#FF5A1F]"
        />
        <span className="mt-1 block text-xs text-[#6B7280]">
          {name.trim().length}/{STORE_PRODUCT_NAME_MAX}
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[#111827]">Description</span>
        <textarea
          value={description}
          maxLength={STORE_PRODUCT_DESCRIPTION_MAX}
          onChange={(event) => setDescription(event.target.value)}
          rows={8}
          className="w-full rounded-lg border border-[#E5E7EB] px-3 py-2 text-sm leading-6 outline-none focus:border-[#FF5A1F]"
        />
      </label>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium text-[#111827]">Product photos</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, index) => (
            <div key={`${url}-${index}`} className="overflow-hidden rounded-xl border border-[#E5E7EB]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="aspect-square w-full object-cover" />
              <div className="flex justify-between gap-1 p-1">
                <button type="button" className="text-[11px] font-semibold text-[#374151]" onClick={() => moveImage(index, -1)}>
                  Up
                </button>
                <button type="button" className="text-[11px] font-semibold text-[#374151]" onClick={() => moveImage(index, 1)}>
                  Down
                </button>
                <button
                  type="button"
                  className="text-[11px] font-semibold text-red-600"
                  onClick={() => setImages(images.filter((_, imageIndex) => imageIndex !== index))}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
        <CloudinaryUploadButton
          folder="jimvio/products"
          resourceType="image"
          buttonText="Upload photo"
          onUploadSuccess={(url) => setImages((current) => [...current, url])}
          onUploadError={(uploadError) => setError(uploadError)}
        />
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-[#111827]">
          Selling price ({product.currency || "USD"})
        </span>
        <input
          inputMode="decimal"
          required={!variantLocked}
          disabled={variantLocked}
          value={variantLocked ? String(product.price) : price}
          onChange={(event) => setPrice(event.target.value)}
          className="h-11 w-full max-w-xs rounded-lg border border-[#E5E7EB] px-3 text-sm outline-none focus:border-[#FF5A1F] disabled:bg-[#F3F4F6]"
        />
        {variantLocked ? (
          <span className="mt-1 block text-xs text-[#6B7280]">
            This product has {product.variantCount} variants. Their prices stay as they are.
          </span>
        ) : (
          <span className="mt-1 block text-xs text-[#6B7280]">Use a positive amount with up to two decimal places.</span>
        )}
      </label>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-[#FF5A1F] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={leave}
          className="rounded-lg border border-[#E5E7EB] px-4 py-2 text-sm font-semibold text-[#374151]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
