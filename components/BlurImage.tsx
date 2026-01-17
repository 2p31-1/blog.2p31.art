interface BlurImageProps {
  src: string;
  alt: string;
}

export function BlurImage({ src, alt }: BlurImageProps) {
  return (
    <img
      src={src}
      alt={alt || ''}
      loading="lazy"
      style={{
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
}
