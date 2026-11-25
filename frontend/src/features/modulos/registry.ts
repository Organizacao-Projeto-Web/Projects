import { Activity, Heart, Sparkles, Users } from "lucide-react";

// Uma fonte de verdade para nomes e rotas; formulários específicos vêm nas fases 2–5.
export const modules = [
  { slug: "pelvica", name: "Fisioterapia Pélvica", description: "Avaliação e cuidado uroginecológico", icon: Activity, color: "blue" },
  { slug: "gestacao_posparto", name: "Gestação e Pós-parto", description: "Cuidado em cada nova fase", icon: Heart, color: "pink" },
  { slug: "reabilitacao", name: "Reabilitação", description: "Movimento, autonomia e bem-estar", icon: Sparkles, color: "green" },
  { slug: "climaterio", name: "Climatério e Menopausa", description: "Acolhimento ao longo da vida", icon: Users, color: "purple" },
] as const;

export type ClinicalModule = (typeof modules)[number]["slug"];
export function getModule(slug: string | undefined) {
  return modules.find((module) => module.slug === slug);
}
