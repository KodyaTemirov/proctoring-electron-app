<script setup>
import { reactive } from 'vue'

const versions = reactive({ ...window.electron.process.versions })
</script>

<template>
  <ul class="versions">
    <li class="electron-version">Proctoring v{{ versions.electron }}</li>
  </ul>
</template>
