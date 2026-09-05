import { getTr } from "@/lib/i18n/server";
import { getFundSummary, getFundEntries } from "@/lib/actions/fund";
import FundClient from "./FundClient";

export const dynamic  = "force-dynamic";
export async function generateMetadata() {
  const tr = await getTr();
  return { title: tr("กองทุน | งานภัทร"),};
}

export default async function FundPage() {
  const [summary, entries] = await Promise.all([getFundSummary(), getFundEntries()]);
  return <FundClient summary={summary} entries={entries} />;
}
