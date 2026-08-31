import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Plus,
  Search,
  Pencil,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  MoreHorizontal,
  GripVertical,
  Package,
  ExternalLink,
} from 'lucide-react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge, Button, Card, EmptyState, Input, Select, Skeleton } from '@/components/ui/primitives';
import { DropdownMenu } from '@/components/ui/DropdownMenu';
import { ConfirmDialog } from '@/components/ui/Modal';
import { toast } from '@/components/ui/toast';
import {
  useCategories,
  useDeleteService,
  useDuplicateService,
  useReorderServices,
  useServices,
  useSetServicePublished,
  type ServiceWithRelations,
} from '@/lib/queries';
import type { ServiceSort } from '@/lib/api';
import { errorMessage } from '@/lib/supabase';
import { pickText } from '@/lib/i18n';
import { formatPrice, formatRelative } from '@/lib/format';
import { PUBLIC_SITE_URL } from '@/config';
import { cn } from '@/lib/cn';

type Status = 'all' | 'published' | 'hidden';

function Row({
  service,
  draggable,
  onEdit,
  onTogglePublish,
  onDuplicate,
  onDelete,
  busyPublish,
}: {
  service: ServiceWithRelations;
  draggable: boolean;
  onEdit: () => void;
  onTogglePublish: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  busyPublish: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: service.id,
    disabled: !draggable,
  });

  return (
    <tr
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('border-b border-border last:border-0', isDragging && 'bg-surface-2 shadow-pop')}
    >
      <td className="w-8 pl-2">
        {draggable && (
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab p-1 text-faint hover:text-muted"
            aria-label="Переместить"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>
      <td className="py-2.5 pr-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-surface-2">
            {service.main_image_url && (
              <img src={service.main_image_url} alt="" className="h-full w-full object-cover" />
            )}
          </div>
          <div className="min-w-0">
            <button
              onClick={onEdit}
              className="block max-w-[220px] truncate text-left text-sm font-medium hover:text-brand"
            >
              {pickText(service.title) || <span className="text-faint">без названия</span>}
            </button>
            <span className="text-xs text-faint">/{service.slug}</span>
          </div>
        </div>
      </td>
      <td className="px-3 text-sm text-muted">{pickText(service.category?.name) || '—'}</td>
      <td className="px-3 text-sm tabular-nums">{formatPrice(service) || '—'}</td>
      <td className="px-3">
        <Badge tone={service.is_published ? 'ok' : 'warn'}>
          {service.is_published ? 'Опубликовано' : 'Скрыто'}
        </Badge>
      </td>
      <td className="hidden px-3 text-xs text-faint lg:table-cell">
        {formatRelative(service.updated_at)}
      </td>
      <td className="px-2 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="ghost"
            title={service.is_published ? 'Скрыть' : 'Опубликовать'}
            loading={busyPublish}
            onClick={onTogglePublish}
            className="h-8 w-8 p-0"
          >
            {service.is_published ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={onEdit} className="h-8 w-8 p-0" title="Редактировать">
            <Pencil className="h-4 w-4" />
          </Button>
          <DropdownMenu
            trigger={
              <span className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-surface-2">
                <MoreHorizontal className="h-4 w-4" />
              </span>
            }
            items={[
              {
                label: 'Открыть на сайте',
                icon: <ExternalLink className="h-4 w-4" />,
                disabled: !service.is_published,
                onClick: () =>
                  window.open(`${PUBLIC_SITE_URL}/#service-${service.slug}`, '_blank', 'noreferrer'),
              },
              { label: 'Дублировать', icon: <Copy className="h-4 w-4" />, onClick: onDuplicate },
              'separator',
              { label: 'Удалить', icon: <Trash2 className="h-4 w-4" />, danger: true, onClick: onDelete },
            ]}
          />
        </div>
      </td>
    </tr>
  );
}

export function ServicesListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Status>('all');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [sort, setSort] = useState<ServiceSort>('order');
  const [toDelete, setToDelete] = useState<ServiceWithRelations | null>(null);
  const [orderedIds, setOrderedIds] = useState<string[] | null>(null);

  const categories = useCategories();
  const services = useServices({ search, status, categoryId, sort });
  const publish = useSetServicePublished();
  const remove = useDeleteService();
  const duplicate = useDuplicateService();
  const reorder = useReorderServices();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const canReorder = sort === 'order' && !search && status === 'all' && categoryId === 'all';

  const list = useMemo(() => {
    const data = services.data ?? [];
    if (canReorder && orderedIds) {
      const map = new Map(data.map((s) => [s.id, s]));
      return orderedIds.map((id) => map.get(id)).filter(Boolean) as ServiceWithRelations[];
    }
    return data;
  }, [services.data, orderedIds, canReorder]);

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const ids = list.map((s) => s.id);
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const next = arrayMove(ids, from, to);
    setOrderedIds(next);
    reorder.mutate(next, {
      onSuccess: () => {
        toast.success('Порядок сохранён');
        setOrderedIds(null);
      },
      onError: (err) => {
        toast.error(errorMessage(err));
        setOrderedIds(null);
      },
    });
  };

  const handleDelete = () => {
    if (!toDelete) return;
    const svc = toDelete;
    remove.mutate(svc.id, {
      onSuccess: () => {
        toast.success(`Услуга «${pickText(svc.title)}» удалена`);
        setToDelete(null);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  const handleDuplicate = (svc: ServiceWithRelations) => {
    duplicate.mutate(svc.id, {
      onSuccess: (clone) => {
        toast.success('Создана копия');
        navigate(`/services/${clone.id}/edit`);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  const empty = !services.isLoading && list.length === 0;
  const noServicesAtAll = empty && !search && status === 'all' && categoryId === 'all';

  return (
    <AdminLayout
      title="Услуги"
      crumbs={[{ label: 'Dashboard', to: '/' }]}
      actions={
        <Button size="sm" icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/services/new')}>
          Добавить услугу
        </Button>
      }
    >
      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по названию или slug"
              className="pl-9"
            />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value as Status)} className="w-auto">
            <option value="all">Все статусы</option>
            <option value="published">Опубликованные</option>
            <option value="hidden">Скрытые</option>
          </Select>
          <Select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-auto"
          >
            <option value="all">Все категории</option>
            {categories.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {pickText(c.name)}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as ServiceSort)}
            className="w-auto"
          >
            <option value="order">Порядок на сайте</option>
            <option value="updated_desc">Сначала изменённые</option>
            <option value="created_desc">Сначала новые</option>
            <option value="title_asc">По названию (А–Я)</option>
            <option value="price_asc">Цена ↑</option>
            <option value="price_desc">Цена ↓</option>
          </Select>
        </div>
      </Card>

      <Card className="overflow-hidden">
        {services.isLoading ? (
          <div className="divide-y divide-border">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="h-11 w-11 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-48" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-5 w-24" />
              </div>
            ))}
          </div>
        ) : empty ? (
          <EmptyState
            icon={<Package className="h-8 w-8" />}
            title={noServicesAtAll ? 'Ещё нет услуг' : 'Ничего не найдено'}
            description={
              noServicesAtAll
                ? 'Создайте первую услугу — она сразу появится на сайте, если опубликована.'
                : 'Попробуйте изменить поиск или фильтры.'
            }
            action={
              noServicesAtAll ? (
                <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/services/new')}>
                  Добавить услугу
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-faint">
                  <th className="w-8" />
                  <th className="py-2.5 pr-3 font-medium">Услуга</th>
                  <th className="px-3 font-medium">Категория</th>
                  <th className="px-3 font-medium">Цена</th>
                  <th className="px-3 font-medium">Статус</th>
                  <th className="hidden px-3 font-medium lg:table-cell">Изменено</th>
                  <th className="px-2" />
                </tr>
              </thead>
              <tbody>
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
                  <SortableContext
                    items={list.map((s) => s.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {list.map((s) => (
                      <Row
                        key={s.id}
                        service={s}
                        draggable={canReorder}
                        busyPublish={publish.isPending && publish.variables?.id === s.id}
                        onEdit={() => navigate(`/services/${s.id}/edit`)}
                        onTogglePublish={() =>
                          publish.mutate(
                            { id: s.id, isPublished: !s.is_published },
                            {
                              onSuccess: () =>
                                toast.success(s.is_published ? 'Услуга скрыта' : 'Услуга опубликована'),
                              onError: (err) => toast.error(errorMessage(err)),
                            },
                          )
                        }
                        onDuplicate={() => handleDuplicate(s)}
                        onDelete={() => setToDelete(s)}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {canReorder && list.length > 1 && (
        <p className="mt-2 text-xs text-faint">
          Перетаскивайте строки за <GripVertical className="inline h-3 w-3" />, чтобы задать порядок услуг на сайте.
        </p>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        loading={remove.isPending}
        onClose={() => setToDelete(null)}
        onConfirm={handleDelete}
        title="Удалить услугу?"
        message={
          <>
            Вы уверены, что хотите удалить услугу{' '}
            <strong>«{toDelete ? pickText(toDelete.title) : ''}»</strong>? Это действие нельзя отменить —
            вместе с ней удалятся изображения галереи.
          </>
        }
        confirmLabel="Удалить"
      />
    </AdminLayout>
  );
}
