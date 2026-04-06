import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUIStore = defineStore('ui', () => {
  // 右侧面板当前标签
  const activePanel = ref('service')
  
  // 切换面板
  const setActivePanel = (panel: string) => {
    activePanel.value = panel
  }
  
  return {
    activePanel,
    setActivePanel
  }
})
