import { useModal } from '@/hooks/use-modal.js';
import { cn } from '@/lib/utils';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';

// Общая оболочка для всех диалогов и контекстных меню.
// Скролл страницы блокирует scrollLock из useModal, поэтому у vaul
// отключены свои стили body (noBodyStyles).
export function AppDrawer({
    open,
    onOpenChange,
    title,
    description,
    hideTitle = false,
    className,
    children,
}) {
    useModal(open, onOpenChange);

    return (
        <Drawer open={open} onOpenChange={onOpenChange} noBodyStyles>
            {/* Без описания Radix ждёт явный aria-describedby={undefined} */}
            <DrawerContent {...(!description && { 'aria-describedby': undefined })}>
                <DrawerHeader className={cn(hideTitle && 'sr-only')}>
                    <DrawerTitle>{title}</DrawerTitle>
                    {description && <DrawerDescription>{description}</DrawerDescription>}
                </DrawerHeader>
                {/* Скролл внутри DrawerContent: vaul не начинает свайп, пока он не в начале */}
                <div
                    className={cn(
                        'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[calc(1rem+env(safe-area-inset-bottom))]',
                        hideTitle && 'pt-4',
                        className
                    )}
                >
                    {children}
                </div>
            </DrawerContent>
        </Drawer>
    );
}
