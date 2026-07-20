import { CourseBuilder } from "@/components/creator-economy/CourseBuilder";
export default async function CreatorCoursePage({ params }: { params: Promise<{ courseId: string }> }) { const { courseId } = await params; return <CourseBuilder courseId={courseId} />; }
