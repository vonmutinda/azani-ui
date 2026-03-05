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

type Props = {
  icon: string;
  className?: string;
  size?: number;
};

export function CategoryIcon({ icon, className, size = 20 }: Props) {
  const Icon = iconMap[icon] ?? Baby;
  return <Icon className={className} style={{ width: size, height: size }} />;
}
