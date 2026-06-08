import { useEffect } from 'react';

export function Lightbox({
  images, index, onClose, onIndex,
}: {
  images: string[]; index: number; onClose: () => void; onIndex: (i: number) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndex((index - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') onIndex((index + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndex]);

  if (!images.length) return null;
  return (
    <div className="lightbox-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <img className="lightbox-image" src={images[index]} alt="" />
      <button className="lb-btn lb-close" onClick={onClose}>✕</button>
      {images.length > 1 && (
        <>
          <button className="lb-btn lb-prev" onClick={() => onIndex((index - 1 + images.length) % images.length)}>‹</button>
          <button className="lb-btn lb-next" onClick={() => onIndex((index + 1) % images.length)}>›</button>
        </>
      )}
    </div>
  );
}
