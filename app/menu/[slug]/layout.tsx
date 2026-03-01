import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sonic Sommelier — Your Tasting Menu",
  description:
    "A personalized dining experience where music meets cuisine. Discover your unique 5-course tasting menu with wine and sake pairings.",
  openGraph: {
    title: "Sonic Sommelier — Your Tasting Menu",
    description:
      "A personalized dining experience where music meets cuisine.",
    type: "website",
  },
};

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
