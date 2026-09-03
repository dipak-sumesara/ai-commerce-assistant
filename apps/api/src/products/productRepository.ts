import { readFile } from "node:fs/promises";
import { z } from "zod";
import { productSchema, type Product } from "@ai-commerce/shared";

const productListSchema = z.array(productSchema);

export async function loadProducts(filePath: string): Promise<Product[]> {
  const content = await readFile(filePath, "utf8");
  return productListSchema.parse(JSON.parse(content));
}
