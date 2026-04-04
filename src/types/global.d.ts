// 全局类型声明
declare global {
  interface Window {
    __clawdesk_theme__?: {
      value: 'dark' | 'light'
    }
  }
}

export {}
