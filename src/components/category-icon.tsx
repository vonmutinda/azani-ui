import {
  Baby,
  Bath,
  Bike,
  BookOpen,
  Briefcase,
  Car,
  CircleDot,
  Cloud,
  Crown,
  Droplets,
  Fish,
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
  Sparkles,
  Star,
  Thermometer,
  UtensilsCrossed,
  Wheat,
} from "lucide-react";

const iconMap: Record<string, React.ElementType> = {
  baby: Baby,
  bath: Bath,
  bike: Bike,
  book: BookOpen,
  briefcase: Briefcase,
  backpack: Briefcase,
  car: Car,
  circle: CircleDot,
  cloud: Cloud,
  crown: Crown,
  droplets: Droplets,
  fish: Fish,
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
  armchair: LayoutGrid,
  apple: Sparkles,
  wheat: Wheat,
};

type Props = {
  icon: string;
  className?: string;
  size?: number;
};

export function CategoryIcon({ icon, className, size = 20 }: Props) {
  const Icon = iconMap[icon] ?? Baby;
  return <Icon className={className} style={{ width: size, height: size }} />;
}
