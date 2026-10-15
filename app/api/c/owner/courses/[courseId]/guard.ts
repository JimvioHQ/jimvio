import { loadManagedCourse } from "@/lib/community/courses/manage";

export async function loadManaged(userId: string, courseId: string) {
  return loadManagedCourse(userId, courseId);
}
