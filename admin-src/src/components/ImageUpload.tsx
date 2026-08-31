import { useCallback, useRef, useState } from 'react';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ImagePlus, Loader2, Trash2, UploadCloud, GripVertical, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ACCEPTED_TYPES, uploadImage, validateImageFile } from '@/lib/image';
import { Button } from './ui/primitives';
import { toast } from './ui/toast';

interface GalleryItem {
  id?: string;
  image_url: string;
  sort_order: number;
}

/* -------------------------------------------------------------------------- */
/* shared dropzone                                                            */
/* -------------------------------------------------------------------------- */
function useUpload(folder: string, onBusyChange?: (busy: boolean) => void) {
  const [busy, setBusy] = useState(false);
  const busyCbRef = useRef(onBusyChange);
  busyCbRef.current = onBusyChange;

  const run = useCallback(
    async (files: File[], onEach: (url: string) => void) => {
      setBusy(true);
      busyCbRef.current?.(true); // synchronous — the parent's "uploading" guard updates immediately
      try {
        for (const file of files) {
          const err = validateImageFile(file);
          if (err) {
            toast.error(`${file.name}: ${err}`);
            continue;
          }
          try {
            const { url } = await uploadImage(file, folder);
            onEach(url);
          } catch (e) {
            toast.error(`${file.name}: не удалось загрузить`);
            // eslint-disable-next-line no-console
            console.error(e);
          }
        }
      } finally {
        setBusy(false);
        busyCbRef.current?.(false);
      }
    },
    [folder],
  );
  return { busy, run };
}

/* -------------------------------------------------------------------------- */
/* main image                                                                 */
/* -------------------------------------------------------------------------- */
export function MainImageInput({
  value,
  onChange,
  folder,
  onBusyChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [broken, setBroken] = useState(false);
  const { busy, run } = useUpload(folder, onBusyChange);

  const pick = (files: FileList | null) => {
    if (!files?.length) return;
    run([files[0]], (url) => {
      setBroken(false);
      onChange(url);
    });
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="group relative overflow-hidden rounded-xl border border-border bg-surface-2">
          <div className="aspect-[16/10] w-full">
            {broken ? (
              <div className="flex h-full flex-col items-center justify-center gap-1 text-faint">
                <AlertCircle className="h-5 w-5" />
                <span className="text-xs">изображение недоступно</span>
              </div>
            ) : (
              <img
                src={value}
                alt=""
                className="h-full w-full object-cover"
                onError={() => setBroken(true)}
              />
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-end gap-2 bg-gradient-to-t from-ink/70 to-transparent p-2.5 opacity-0 transition group-hover:opacity-100">
            <Button size="sm" variant="secondary" loading={busy} onClick={() => inputRef.current?.click()}>
              Заменить
            </Button>
            <Button size="sm" variant="danger" icon={<Trash2 className="h-3.5 w-3.5" />} onClick={() => onChange(null)}>
              Удалить
            </Button>
          </div>
          {busy && (
            <div className="absolute inset-0 grid place-items-center bg-surface/60">
              <Loader2 className="h-5 w-5 animate-spin text-brand" />
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            pick(e.dataTransfer.files);
          }}
          className={cn(
            'flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition',
            dragOver ? 'border-brand bg-brand-soft' : 'border-border bg-surface-2 hover:border-brand/50',
          )}
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-brand" />
          ) : (
            <UploadCloud className="h-6 w-6 text-faint" />
          )}
          <span className="text-sm font-medium text-muted">Перетащите или выберите изображение</span>
          <span className="text-xs text-faint">JPG, PNG, WebP — до 5 МБ</span>
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* gallery                                                                    */
/* -------------------------------------------------------------------------- */
function SortableThumb({
  item,
  onRemove,
}: {
  item: GalleryItem;
  onRemove: () => void;
}) {
  const key = item.id ?? item.image_url;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: key,
  });
  const [broken, setBroken] = useState(false);

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'group relative overflow-hidden rounded-lg border border-border bg-surface-2',
        isDragging && 'z-10 opacity-80 shadow-pop',
      )}
    >
      <div className="aspect-square">
        {broken ? (
          <div className="flex h-full items-center justify-center text-faint">
            <AlertCircle className="h-4 w-4" />
          </div>
        ) : (
          <img
            src={item.image_url}
            alt=""
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        )}
      </div>
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute left-1 top-1 grid h-6 w-6 cursor-grab place-items-center rounded bg-ink/50 text-white opacity-0 transition group-hover:opacity-100"
        aria-label="Переместить"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded bg-danger/90 text-white opacity-0 transition group-hover:opacity-100"
        aria-label="Удалить"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function GalleryInput({
  value,
  onChange,
  folder,
  onBusyChange,
}: {
  value: GalleryItem[];
  onChange: (next: GalleryItem[]) => void;
  folder: string;
  onBusyChange?: (busy: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { busy, run } = useUpload(folder, onBusyChange);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const add = (files: FileList | null) => {
    if (!files?.length) return;
    run(Array.from(files), (url) => {
      onChange([
        ...valueRef.current,
        { image_url: url, sort_order: valueRef.current.length },
      ]);
    });
  };

  // keep a live ref so sequential uploads append correctly
  const valueRef = useRef(value);
  valueRef.current = value;

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const keyOf = (it: GalleryItem) => it.id ?? it.image_url;
    const from = value.findIndex((it) => keyOf(it) === active.id);
    const to = value.findIndex((it) => keyOf(it) === over.id);
    if (from === -1 || to === -1) return;
    onChange(arrayMove(value, from, to).map((it, i) => ({ ...it, sort_order: i })));
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          add(e.target.files);
          e.target.value = '';
        }}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext
            items={value.map((it) => it.id ?? it.image_url)}
            strategy={rectSortingStrategy}
          >
            {value.map((item, i) => (
              <SortableThumb
                key={item.id ?? item.image_url}
                item={item}
                onRemove={() => onChange(value.filter((_, idx) => idx !== i).map((it, idx) => ({ ...it, sort_order: idx })))}
              />
            ))}
          </SortableContext>
        </DndContext>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-border text-faint transition hover:border-brand/50 hover:text-brand"
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-[11px]">добавить</span>
        </button>
      </div>
      {value.length > 0 && (
        <p className="field-hint">Перетаскивайте миниатюры, чтобы изменить порядок.</p>
      )}
    </div>
  );
}

export type { GalleryItem };
