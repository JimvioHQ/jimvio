import { CourseDetail } from "@/components/community/courses/CourseDetail";

export default async function CommunityCourseDetailPage({
  params,
}: {
  params: Promise<{ slug: string; courseId: string }>;
}) {
  const { courseId } = await params;
  return <CourseDetail courseId={courseId} />;
}
