import { useCallback, useState } from "react"
import { AppDrawer } from "@/components/app-drawer"
import { Button } from "@/components/ui/button"

// Контекстное меню v1 (context-menu из action-sheet.js): список действий,
// нажатие отдаёт действие и закрывает меню
export function ActionMenu({ open, onOpenChange, title, options, onAction }) {
  return (
    <AppDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      hideTitle
      className="px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
    >
      <div className="flex flex-col">
        {options.map((option) => (
          <Button
            key={option.action}
            type="button"
            variant="ghost"
            onClick={() => {
              onAction(option.action)
              onOpenChange(false)
            }}
            className="h-auto w-full rounded-full p-6 text-center text-base/6 font-semibold tracking-[0.15px] whitespace-normal text-foreground transition-colors duration-200 hover:bg-secondary hover:text-foreground"
          >
            {option.label}
          </Button>
        ))}
      </div>
    </AppDrawer>
  )
}

// Меню живёт в одном Drawer: данные остаются, пока меню закрывается
export function useActionMenu() {
  const [menu, setMenu] = useState({ open: false, title: "", options: [], onAction: () => {} })
  const showMenu = useCallback((title, options, onAction) => {
    setMenu({ open: true, title, options, onAction })
  }, [])
  const onOpenChange = useCallback((open) => setMenu((prev) => ({ ...prev, open })), [])
  return { menuProps: { ...menu, onOpenChange }, showMenu }
}
