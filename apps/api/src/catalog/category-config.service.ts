import { CATEGORY_META, CATEGORY_ORDER, type CategoryConfigDTO, type ServiceCategory } from '@hafalati/shared';
import { prisma } from '../db.js';

/** The set of categories the admin has marked as date-limited. */
export async function dateLimitedSet(): Promise<Set<ServiceCategory>> {
  const rows = await prisma.categoryConfig.findMany({ where: { dateLimited: true }, select: { category: true } });
  return new Set(rows.map((r) => r.category as ServiceCategory));
}

/** Full per-category config (all 11), decorated with label + emoji for the UI. */
export async function listCategoryConfig(): Promise<CategoryConfigDTO[]> {
  const rows = await prisma.categoryConfig.findMany();
  const limited = new Map(rows.map((r) => [r.category, r.dateLimited]));
  return CATEGORY_ORDER.map((category) => {
    const meta = CATEGORY_META[category];
    return { category, dateLimited: limited.get(category) ?? false, emoji: meta.emoji, label: meta.label };
  });
}

export async function setCategoryLimited(
  category: ServiceCategory,
  dateLimited: boolean,
): Promise<CategoryConfigDTO> {
  await prisma.categoryConfig.upsert({
    where: { category },
    update: { dateLimited },
    create: { category, dateLimited },
  });
  const meta = CATEGORY_META[category];
  return { category, dateLimited, emoji: meta.emoji, label: meta.label };
}
