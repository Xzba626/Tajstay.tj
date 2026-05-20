import Image from "next/image";

type BaseProps = {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  sizes?: string;
};

type FillProps = BaseProps & {
  fill: true;
  width?: never;
  height?: never;
};

type SizedProps = BaseProps & {
  fill?: false;
  width: number;
  height: number;
};

export type AppImageProps = FillProps | SizedProps;

/** Local uploads and Vercel Blob skip the optimizer (hostname varies per deploy). */
export function shouldUnoptimizeImage(src: string): boolean {
  if (!src) return true;
  if (src.startsWith("/") || src.startsWith("data:")) return true;
  if (src.includes("blob.vercel-storage.com")) return true;
  return false;
}

export function AppImage(props: AppImageProps) {
  const { src, alt, className, priority, sizes } = props;
  const unoptimized = shouldUnoptimizeImage(src);

  if (props.fill) {
    return (
      <Image
        src={src}
        alt={alt}
        fill
        className={className}
        priority={priority}
        sizes={sizes ?? "100vw"}
        unoptimized={unoptimized}
      />
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={props.width}
      height={props.height}
      className={className}
      priority={priority}
      sizes={sizes}
      unoptimized={unoptimized}
    />
  );
}
