<script setup lang="ts">
import { useServiceStore } from '@/stores/service'

const serviceStore = useServiceStore()
</script>

<template>
  <footer class="app-footer">
    <div class="footer-left">
      <div class="footer-item">
        <span class="status-dot" :class="serviceStore.status"></span>
        <span class="status-label">{{ serviceStore.statusText }}</span>
      </div>
      
      <template v-if="serviceStore.status === 'running'">
        <div class="footer-divider"></div>
        
        <div class="footer-item">
          <span class="footer-icon">🔌</span>
          <span class="footer-value">:{{ serviceStore.port }}</span>
        </div>
        
        <div class="footer-divider"></div>
        
        <div class="footer-item">
          <span class="footer-icon">⏱️</span>
          <span class="footer-value">{{ Math.floor(serviceStore.uptime / 60) }}分钟</span>
        </div>
      </template>
    </div>
    
    <div class="footer-right">
      <span class="footer-text">ClawDesk v0.1.0</span>
    </div>
  </footer>
</template>

<style scoped lang="scss">
.app-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 32px;
  padding: 0 16px;
  background: var(--bg-primary);
  border-top: 1px solid var(--border-primary);
  font-size: 12px;
  color: var(--text-secondary);
}

.footer-left, .footer-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.footer-item {
  display: flex;
  align-items: center;
  gap: 6px;
  
  .status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    transition: all var(--transition-fast);
    
    &.running {
      background: var(--success);
      box-shadow: 0 0 8px var(--success);
      animation: pulse 2s infinite;
    }
    
    &.starting {
      background: var(--warning);
      animation: pulse 1s infinite;
    }
    
    &.stopped {
      background: var(--text-tertiary);
    }
    
    &.error {
      background: var(--error);
    }
  }
  
  .status-label {
    font-weight: 500;
  }
  
  .footer-icon {
    font-size: 12px;
    opacity: 0.7;
  }
  
  .footer-value {
    font-family: 'SF Mono', Monaco, monospace;
    color: var(--text-primary);
  }
}

.footer-divider {
  width: 1px;
  height: 12px;
  background: var(--border-primary);
}

.footer-text {
  font-size: 11px;
  color: var(--text-tertiary);
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}
</style>
