<script setup lang="ts">
import ChatPanel from '@/components/panels/ChatPanel.vue'
</script>

<template>
  <div class="home-view">
    <ChatPanel />
  </div>
</template>

<style scoped lang="scss">
.home-view {
  display: flex;
  flex-direction: column;
  height: 100%;
  background-color: var(--bg-secondary);
}
</style>
