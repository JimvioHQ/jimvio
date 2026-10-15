import { CourseLearn } from "@/components/community/courses/CourseLearn";

export default async function CommunityCourseLearnPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { slug, courseId } = await params;
  return <CourseLearn courseId={courseId} communitySlug={slug} />;
}
