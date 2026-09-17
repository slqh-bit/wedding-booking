import { Prisma } from '@prisma/client';
import type { PackageDTO, PackageInput } from '@hafalati/shared';
import { prisma } from '../db.js';
import { AppError } from '../http/errors.js';
import { decToNum, toOfferingDTO } from '../http/serialize.js';
import { PUBLIC_OFFERING_WHERE } from '../catalog/catalog.service.js';
import { offeringRatings } from '../reviews/reviews.service.js';

const round3 = (n: number) => Math.round(n * 1000) / 1000;

type PackageRow = Prisma.PackageGetPayload<{
  include: { items: { include: { offering: { include: { vendor: { select: { name: true } } } } } } };
}>;

const packageInclude = {
  items: { include: { offering: { include: { vendor: { select: { name: true } } } } } },
} satisfies Prisma.PackageInclude;

/** Build a PackageDTO, pricing only the currently public offerings in the bundle. */
async function toPackageDTO(pkg: PackageRow): Promise<PackageDTO> {
  const publicIds = new Set(
    (
      await prisma.serviceOffering.findMany({
        where: { id: { in: pkg.items.map((i) => i.offeringId) }, ...PUBLIC_OFFERING_WHERE },
        select: { id: true },
      })
    ).map((o) => o.id),
  );

  const visible = pkg.items.filter((i) => publicIds.has(i.offeringId));
  const ratings = await offeringRatings(visible.map((i) => i.offeringId));
  const rate = decToNum(pkg.discountRate);
  const originalTotal = round3(visible.reduce((s, i) => s + decToNum(i.offering.basePrice), 0));
  const discountedTotal = round3(originalTotal * (1 - rate));

  return {
    id: pkg.id,
    name: pkg.name as PackageDTO['name'],
    description: pkg.description as PackageDTO['description'],
    emoji: pkg.emoji,
    imageUrl: pkg.imageUrl,
    discountRate: rate,
    isActive: pkg.isActive,
    offerings: visible.map((i) => toOfferingDTO(i.offering, ratings.get(i.offeringId))),
    originalTotal,
    discountedTotal,
    savings: round3(originalTotal - discountedTotal),
  };
}

/** Public: active packages that still have at least one visible offering. */
export async function listPackages(): Promise<PackageDTO[]> {
  const rows = await prisma.package.findMany({
    where: { isActive: true },
    include: packageInclude,
    orderBy: { createdAt: 'desc' },
  });
  const dtos = await Promise.all(rows.map(toPackageDTO));
  return dtos.filter((d) => d.offerings.length > 0);
}

export async function getPackage(id: string): Promise<PackageDTO> {
  const pkg = await prisma.package.findFirst({
    where: { id, isActive: true },
    include: packageInclude,
  });
  if (!pkg) throw AppError.notFound('package_not_found', 'Package not found');
  return toPackageDTO(pkg);
}

// ── Admin CRUD ──────────────────────────────────────────
export async function listAllPackages(): Promise<PackageDTO[]> {
  const rows = await prisma.package.findMany({ include: packageInclude, orderBy: { createdAt: 'desc' } });
  return Promise.all(rows.map(toPackageDTO));
}

async function assertOfferings(ids: string[]) {
  const count = await prisma.serviceOffering.count({ where: { id: { in: ids } } });
  if (count !== ids.length) throw AppError.badRequest('invalid_offering', 'Unknown offering in package');
}

export async function createPackage(input: PackageInput): Promise<PackageDTO> {
  await assertOfferings(input.offeringIds);
  const pkg = await prisma.package.create({
    data: {
      name: input.name as Prisma.InputJsonValue,
      description: input.description as Prisma.InputJsonValue,
      emoji: input.emoji ?? '🎁',
      imageUrl: input.imageUrl,
      discountRate: new Prisma.Decimal(input.discountRate),
      isActive: input.isActive ?? true,
      items: { create: input.offeringIds.map((offeringId) => ({ offeringId })) },
    },
    include: packageInclude,
  });
  return toPackageDTO(pkg);
}

export async function updatePackage(id: string, input: Partial<PackageInput>): Promise<PackageDTO> {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('package_not_found', 'Package not found');
  if (input.offeringIds) await assertOfferings(input.offeringIds);

  const pkg = await prisma.package.update({
    where: { id },
    data: {
      ...(input.name ? { name: input.name as Prisma.InputJsonValue } : {}),
      ...(input.description ? { description: input.description as Prisma.InputJsonValue } : {}),
      ...(input.emoji ? { emoji: input.emoji } : {}),
      ...(input.imageUrl !== undefined ? { imageUrl: input.imageUrl } : {}),
      ...(input.discountRate !== undefined ? { discountRate: new Prisma.Decimal(input.discountRate) } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      // Replace the item set when a new one is given.
      ...(input.offeringIds
        ? { items: { deleteMany: {}, create: input.offeringIds.map((offeringId) => ({ offeringId })) } }
        : {}),
    },
    include: packageInclude,
  });
  return toPackageDTO(pkg);
}

export async function deletePackage(id: string) {
  const existing = await prisma.package.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('package_not_found', 'Package not found');
  // Bookings keep their history (packageId is SET NULL); PackageItems cascade.
  await prisma.package.delete({ where: { id } });
  return { deleted: true };
}

/**
 * Resolve a package's currently-public offerings + discount for booking.
 * Throws if the package is inactive or has no bookable offerings left.
 */
export async function resolvePackageForBooking(packageId: string) {
  const pkg = await prisma.package.findFirst({
    where: { id: packageId, isActive: true },
    include: { items: true },
  });
  if (!pkg) throw AppError.notFound('package_not_found', 'Package not found or inactive');

  const offerings = await prisma.serviceOffering.findMany({
    where: { id: { in: pkg.items.map((i) => i.offeringId) }, ...PUBLIC_OFFERING_WHERE },
  });
  if (offerings.length === 0) {
    throw AppError.badRequest('package_unavailable', 'This package has no available services');
  }
  return { discountRate: decToNum(pkg.discountRate), offerings };
}
