import { useEffect, useState, type ReactNode } from "react";
import { getSignedUrl } from "@/lib/storage";
import { toast } from "sonner";

/** Renders an <img> that resolves to a short-lived signed URL. */
export function SignedImage({
  bucket,
  pathOrUrl,
  className,
  alt = "",
  expiresIn = 3600,
}: {
  bucket: string;
  pathOrUrl: string | null | undefined;
  className?: string;
  alt?: string;
  expiresIn?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    getSignedUrl(bucket, pathOrUrl, expiresIn).then((u) => active && setSrc(u));
    return () => {
      active = false;
    };
  }, [bucket, pathOrUrl, expiresIn]);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}

/**
 * Renders a button-like element that, when clicked, mints a signed URL
 * and opens it in a new tab. Useful for private bucket downloads.
 */
export function SignedLinkButton({
  bucket,
  pathOrUrl,
  children,
  className,
  expiresIn = 3600,
  download,
}: {
  bucket: string;
  pathOrUrl: string | null | undefined;
  children: ReactNode;
  className?: string;
  expiresIn?: number;
  download?: string;
}) {
  const open = async () => {
    const url = await getSignedUrl(bucket, pathOrUrl, expiresIn);
    if (!url) {
      toast.error("Não foi possível gerar o link do arquivo");
      return;
    }
    if (download) {
      const a = document.createElement("a");
      a.href = url;
      a.download = download;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };
  return (
    <button type="button" onClick={open} className={className}>
      {children}
    </button>
  );
}
