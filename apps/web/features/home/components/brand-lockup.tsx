import logo from "@kometa/assets/logo.svg";
import Image from "next/image";
import Link from "next/link";

type BrandLockupProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
};

export function BrandLockup({ className, iconClassName, textClassName }: BrandLockupProps) {
  return (
    <Link href="/" className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <Image
        src={logo}
        alt=""
        width={32}
        height={32}
        className={`h-8 w-8 ${iconClassName ?? ""}`}
        priority
      />
      <span
        className={`font-heading text-xl font-bold tracking-normal text-foreground ${
          textClassName ?? ""
        }`}
      >
        Kometa
      </span>
    </Link>
  );
}
