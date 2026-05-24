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
  utensils: "text-accent-warm",
  milk: "text-accent-warm",
  bath: "text-secondary",
  droplets: "text-secondary",
  bed: "text-trust",
  moon: "text-trust",
  armchair: "text-trust",
  bike: "text-success",
  car: "text-success",
  shirt: "text-primary",
  baby: "text-primary",
  crown: "text-primary",
  book: "text-warning",
  gamepad: "text-warning",
  "heart-handshake": "text-primary",
  heart: "text-primary",
  gift: "text-primary",
  sparkles: "text-warning",
  star: "text-warning",
  shield: "text-success",
  footprints: "text-secondary",
  thermometer: "text-danger",
  cloud: "text-secondary",
  package: "text-muted",
  briefcase: "text-muted",
  layout: "text-muted",
  circle: "text-muted",
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
