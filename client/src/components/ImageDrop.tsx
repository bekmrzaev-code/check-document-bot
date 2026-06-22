import { useRef, useState } from 'react';
import { toast } from '../lib/toast';
import { Icon } from '../lib/ui';

export interface PickedImage { dataUrl: string; name: string; }

// Drag-and-drop / click-to-attach image picker supporting MULTIPLE images.
// Reads each file as a base64 data URL which the caller sends to the backend
// (sent to Telegram as a photo, or as an album when more than one).
export function ImageDrop({ images, onChange }: {
  images: PickedImage[];
  onChange: (imgs: PickedImage[]) => void;
}) {
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files?: FileList | null) {
    if (!files || !files.length) return;
    const picks: Promise<PickedImage | null>[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) { toast(`${file.name}: not an image`); continue; }
      if (file.size > 8 * 1024 * 1024) { toast(`${file.name}: too large (max 8MB)`); continue; }
      picks.push(new Promise((res) => {
        const r = new FileReader();
        r.onload = () => res({ dataUrl: String(r.result), name: file.name });
        r.onerror = () => res(null);
        r.readAsDataURL(file);
      }));
    }
    Promise.all(picks).then((list) => {
      const valid = list.filter(Boolean) as PickedImage[];
      if (valid.length) onChange([...images, ...valid].slice(0, 10));
      if (images.length + valid.length > 10) toast('Up to 10 images per message');
    });
  }

  function remove(i: number) { onChange(images.filter((_, idx) => idx !== i)); }

  return (
    <div className="img-attach">
      {images.length > 0 && (
        <div className="img-grid">
          {images.map((img, i) => (
            <div className="img-thumb" key={i}>
              <img src={img.dataUrl} alt="" />
              <button type="button" className="img-thumb-remove" onClick={() => remove(i)} aria-label="Remove image">
                <Icon name="x" className="" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div
        className={`img-drop ${drag ? 'drag' : ''} ${images.length ? 'compact' : ''}`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
      >
        <Icon name="image" className="img-drop-ico" />
        <span>{images.length ? 'Add more images' : 'Drop images here or click to attach'}</span>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
      </div>
    </div>
  );
}
