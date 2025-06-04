import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Upload Merchant Data | Ireland Pay Analytics",
  description: "Upload merchant Excel files for analysis and reporting",
};

export default function UploadLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
