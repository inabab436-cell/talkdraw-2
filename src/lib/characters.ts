import kai from "@/assets/char-kai.jpg";
import ren from "@/assets/char-ren.jpg";
import sora from "@/assets/char-sora.jpg";
import akira from "@/assets/char-akira.jpg";

export type Character = {
  id: string;
  name: string;
  title: string;
  tagline: string;
  traits: string[];
  image: string;
};

export const characters: Character[] = [
  {
    id: "kai",
    name: "Kai",
    title: "The Night Strategist",
    tagline: "Composed, sharp and always three moves ahead of the conversation.",
    traits: ["Analytical", "Loyal", "Dry humor"],
    image: kai,
  },
  {
    id: "ren",
    name: "Ren",
    title: "The Gilded Rival",
    tagline: "Confident and charming, he turns every talk into a friendly duel.",
    traits: ["Bold", "Playful", "Competitive"],
    image: ren,
  },
  {
    id: "sora",
    name: "Sora",
    title: "The Quiet Scholar",
    tagline: "Patient listener with an archive of stories waiting to be told.",
    traits: ["Calm", "Thoughtful", "Curious"],
    image: sora,
  },
  {
    id: "akira",
    name: "Akira",
    title: "The Spark",
    tagline: "Endless energy, terrible at sitting still, great at cheering you up.",
    traits: ["Energetic", "Warm", "Impulsive"],
    image: akira,
  },
];
