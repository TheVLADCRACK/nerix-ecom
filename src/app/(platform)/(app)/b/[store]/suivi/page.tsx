import { redirect } from "next/navigation";

/** Ancienne adresse « Pixels et suivi » : regroupée dans Campagnes et pixels. */
export default async function OldPixels({ params }: { params: Promise<{ store: string }> }) {
  redirect(`/b/${(await params).store}/campagnes`);
}
