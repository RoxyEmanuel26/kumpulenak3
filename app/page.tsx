import { prisma } from "@/lib/db/prisma";
import { HomeWrapper } from "@/components/layout/HomeWrapper";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; category?: string }>;
}) {
  const resolvedSearchParams = await searchParams;
  const query = resolvedSearchParams.q || "";
  const categoryParam = resolvedSearchParams.category || "all";
  const page = parseInt(resolvedSearchParams.page || "1");
  const limit = 24;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    status: "ACTIVE",
    ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
    ...(categoryParam !== "all"
      ? {
          categories: {
            some: {
              category: {
                name: {
                  equals: categoryParam,
                  mode: "insensitive",
                },
              },
            },
          },
        }
      : {}),
  };

  const [videos, totalVideos, dbCategories] = await Promise.all([
    prisma.video.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: (page - 1) * limit,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    }),
    prisma.video.count({ where }),
    prisma.category.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const categories = dbCategories.map((c) => c.name);

  // Map database video to client component type strictly if needed
  const mappedVideos = videos.map((v) => ({
    id: v.id,
    title: v.title,
    duration: v.duration,
    rating: v.rating,
    views: v.views,
    thumbnail: v.thumbnail,
    tags: v.tags.map((vt) => ({
      tag: {
        id: vt.tag.id,
        name: vt.tag.name,
      },
    })),
  }));

  return (
    <HomeWrapper
      initialVideos={mappedVideos}
      categories={categories}
      activeCategory={categoryParam}
      totalVideos={totalVideos}
      query={query}
      page={page}
      limit={limit}
    />
  );
}
