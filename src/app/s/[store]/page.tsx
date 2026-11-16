import { loadFront, type FrontParams } from "@/components/store/ctx";
import { LiveSections } from "@/components/store/sections";

export default async function StoreHome({ params, searchParams }: FrontParams & { searchParams: Promise<{ apercu?: string }> }) {
  const { store, data } = await loadFront(params);
  const { apercu } = await searchParams;
  return <LiveSections sections={store.sections} data={data} live={apercu === "1"} />;
}
