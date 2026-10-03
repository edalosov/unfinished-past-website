import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getGalleryConfig } from "@/lib/config";
import { AdminForm } from "@/components/AdminForm";
import { InspectTokenTool } from "@/components/InspectTokenTool";
import { FadeIn } from "@/components/FadeIn";

export default async function AdminPage() {
  const session = await getSession();
  if (!session.isAdmin) {
    redirect("/admin/login");
  }

  const config = await getGalleryConfig();

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 sm:px-10 sm:py-32">
      <FadeIn>
        <h1 className="font-display text-3xl italic text-foreground">Gallery settings</h1>
        <AdminForm initialContractAddress={config.nftContractAddress ?? ""} initialChainId={config.chainId} />

        <div className="mt-14 border-t pt-14" style={{ borderColor: "var(--border-soft)" }}>
          <InspectTokenTool />
        </div>

        <div className="mt-14 flex gap-6 border-t pt-14" style={{ borderColor: "var(--border-soft)" }}>
          <Link href="/admin/questions" className="gallery-connect-btn">
            Questions schedule
          </Link>
          <Link href="/admin/answers" className="gallery-connect-btn">
            View answers
          </Link>
        </div>
      </FadeIn>
    </div>
  );
}
