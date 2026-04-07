import { useToastStore } from '@/stores/toastStore'

export function useToast() {
  const add = useToastStore((s) => s.add)

  return {
    toast: add,
    success: (message: string, description?: string) => {
      add({ type: 'success', message, description })
    },
    error: (message: string, description?: string) => {
      add({ type: 'error', message, description })
    },
    warning: (message: string, description?: string) => {
      add({ type: 'warning', message, description })
    },
    info: (message: string, description?: string) => {
      add({ type: 'info', message, description })
    },
  }
}
