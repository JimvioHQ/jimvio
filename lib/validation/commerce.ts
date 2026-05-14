
import { z } from "zod";

export const uuid = z.string().uuid("Invalid ID");
export const positiveInt = z.number().int().positive();
export const quantitySchema = z.number().int().min(1).max(999);
export const ratingSchema = z.number().int().min(1).max(5);

export const addToCartSchema = z.object({
    productId: uuid,
    vendorId: uuid,
    quantity: quantitySchema.default(1),
});

export const reviewSchema = z
    .object({
        productId: uuid.optional(),
        vendorId: uuid.optional(),
        rating: ratingSchema,
        title: z.string().max(200).optional(),
        body: z.string().max(5000).optional(),
    })
    .refine((d) => d.productId || d.vendorId, {
        message: "Either productId or vendorId is required",
    });

export const orderStatusSchema = z.enum([
    "pending", "confirmed", "processing", "shipped",
    "delivered", "cancelled", "refunded", "completed", "checkout_direct",
]);