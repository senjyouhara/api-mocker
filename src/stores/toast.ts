import { ref } from 'vue';

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: 'default' | 'destructive';
  duration?: number;
}

const toasts = ref<Toast[]>([]);

export function useToast() {
  const toast = (options: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const newToast: Toast = {
      id,
      duration: 3000,
      variant: 'default',
      ...options,
    };
    toasts.value.push(newToast);

    // 自动移除
    setTimeout(() => {
      dismiss(id);
    }, newToast.duration);

    return id;
  };

  const dismiss = (id: string) => {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index > -1) {
      toasts.value.splice(index, 1);
    }
  };

  return {
    toasts,
    toast,
    dismiss,
  };
}
