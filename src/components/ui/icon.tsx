import {
  Award,
  BadgeCheck,
  Briefcase,
  Building2,
  ChartNoAxesCombined,
  Clock,
  Cog,
  Compass,
  Eye,
  Factory,
  FolderKanban,
  Gem,
  GraduationCap,
  Handshake,
  HardHat,
  HeartPulse,
  Landmark,
  Leaf,
  Lightbulb,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Smile,
  Sparkles,
  Target,
  Truck,
  Users,
  Wrench,
  Zap,
  type LucideProps,
} from "lucide-react";

/**
 * Whitelisted icons selectable from content/admin. Keeping an explicit map
 * keeps the client bundle small and the stored values validated.
 */
const icons = {
  award: Award,
  badge: BadgeCheck,
  briefcase: Briefcase,
  building: Building2,
  chart: ChartNoAxesCombined,
  clock: Clock,
  cog: Cog,
  compass: Compass,
  eye: Eye,
  factory: Factory,
  folder: FolderKanban,
  gem: Gem,
  education: GraduationCap,
  handshake: Handshake,
  hardhat: HardHat,
  health: HeartPulse,
  government: Landmark,
  leaf: Leaf,
  idea: Lightbulb,
  mail: Mail,
  pin: MapPin,
  phone: Phone,
  shield: ShieldCheck,
  retail: ShoppingBag,
  smile: Smile,
  sparkles: Sparkles,
  target: Target,
  truck: Truck,
  users: Users,
  wrench: Wrench,
  energy: Zap,
} as const;

export type IconName = keyof typeof icons;
export const iconNames = Object.keys(icons) as IconName[];

export function Icon({ name, ...props }: { name: IconName } & LucideProps) {
  const Cmp = icons[name] ?? Sparkles;
  return <Cmp aria-hidden="true" {...props} />;
}
