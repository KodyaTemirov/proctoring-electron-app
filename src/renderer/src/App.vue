<script setup lang="ts">
import { reactive } from "vue";

const versions = reactive({ ...window.electron.process.versions });
</script>

<template>
  <div class="creator">Powered by Realsoft</div>
  <div class="text">
    RealSoft
    <span class="vue">Proctoring</span>
  </div>
  <p class="tip">Iltimos, oynani pastga olib qo'ying.</p>
  <div class="actions">
    <div class="action">
      <a href="https://realsoft.uz/" target="_blank" rel="noreferrer"
        >RealSoft.uz</a
      >
    </div>
    <div class="action">
      <a target="_blank" href="http://proctoring.uz/">Proctoring</a>
    </div>
  </div>
</template>
