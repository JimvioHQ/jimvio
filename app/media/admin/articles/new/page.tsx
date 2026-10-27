import { ArticleEditor } from "@/components/editorial/admin/editor";
import { getPlatformAdminSession } from "@/lib/auth/platform-admin-session";
import { publicAuthorName } from "@/lib/editorial/validate";

export default async function NewMediaArticlePage() {
  const session = await getPlatformAdminSession();
  const suggestedAuthor = session.ok ? publicAuthorName(session.user.full_name) : null;
  return <ArticleEditor article={null} suggestedAuthor={suggestedAuthor} audit={[]} />;
}
