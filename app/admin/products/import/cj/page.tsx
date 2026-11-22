import CjPidImport from "@/components/admin/cj/cj-pid-import";

export const metadata = {
  title: "Import from CJ · Admin",
  description: "Import a selected CJ supplier product into Jimvio by its product ID.",
};

export const dynamic = "force-dynamic";

export default function ImportCJProductPage() {
  return <CjPidImport />;
}
