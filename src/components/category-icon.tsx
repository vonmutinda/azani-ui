import {
  Baby,
  Bath,
  Bed,
  Bike,
  BookOpen,
  Briefcase,
  Car,
  CircleDot,
  Cloud,
  Crown,
  Droplets,
  Footprints,
  Gamepad2,
  Gift,
  Heart,
  HeartHandshake,
  LayoutGrid,
  Milk,
  Moon,
  Package,
  Shield,
  Shirt,
  Sofa,
  Sparkles,
  Star,
  Thermometer,
  UtensilsCrossed,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  baby: Baby,
  bath: Bath,
  bed: Bed,
  bike: Bike,
  book: BookOpen,
  briefcase: Briefcase,
  car: Car,
  circle: CircleDot,
  cloud: Cloud,
  crown: Crown,
  droplets: Droplets,
  footprints: Footprints,
  gamepad: Gamepad2,
  gift: Gift,
  heart: Heart,
  "heart-handshake": HeartHandshake,
  layout: LayoutGrid,
  milk: Milk,
  moon: Moon,
  package: Package,
  shield: Shield,
  shirt: Shirt,
  sparkles: Sparkles,
  star: Star,
  thermometer: Thermometer,
  utensils: UtensilsCrossed,
  armchair: Sofa,
  apple: Sparkles,
};

const ICON_COLORS: Record<string, string> = {
  utensils: "text-orange-500",
  milk: "text-orange-500",
  bath: "text-sky-500",
  droplets: "text-sky-500",
  bed: "text-violet-500",
  moon: "text-violet-500",
  armchair: "text-violet-500",
  bike: "text-emerald-500",
  car: "text-emerald-500",
  shirt: "text-pink-500",
  baby: "text-pink-500",
  crown: "text-pink-500",
  book: "text-amber-500",
  gamepad: "text-amber-500",
  "heart-handshake": "text-rose-400",
  heart: "text-rose-400",
  gift: "text-rose-400",
  sparkles: "text-amber-400",
  star: "text-amber-400",
  shield: "text-emerald-500",
  footprints: "text-sky-400",
  thermometer: "text-red-400",
  cloud: "text-sky-400",
  package: "text-slate-500",
  briefcase: "text-slate-500",
  layout: "text-slate-500",
  circle: "text-slate-500",
};

type Props = {
  icon: string;
  className?: string;
  size?: number;
  colored?: boolean;
};

export function CategoryIcon({ icon, className, size = 20, colored }: Props) {
  const Icon = iconMap[icon] ?? Baby;
  const colorClass = colored ? (ICON_COLORS[icon] ?? "") : "";
  return (
    <Icon className={`${colorClass} ${className ?? ""}`} style={{ width: size, height: size }} />
  );
}
