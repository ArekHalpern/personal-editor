interface Window {
  __TAURI__: {
    shell: {
      open: (path: string, options?: { showInFolder?: boolean }) => Promise<void>;
    };
  };
} 