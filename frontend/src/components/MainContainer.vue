<script setup lang="ts">

import {RouterLink} from "vue-router";
import {useScratchStore} from "@/stores/scratchpad";
import {useConnectionStore} from "@/stores/connection";
import {ref, watchEffect} from "vue";

const scratchStore = useScratchStore();
const connectionStore = useConnectionStore();

const spinner = ref<boolean>(false);

watchEffect(() => {
  if (scratchStore.editor.source === "local") {
    spinner.value = scratchStore.editor.dirty;
  } else if (scratchStore.editor.source === "remote") {
    if (!scratchStore.notified) {
      scratchStore.notified = true;
      spinner.value = true;
      setTimeout(() => {spinner.value = false}, 1000)
    }
  }
})

</script>

<template>
  <header>
    <nav class="navbar nav-underline bg-dark navbar-expand-sm" data-bs-theme="dark">
      <div class="container-fluid ms-3 me-3">
        <i class="bi bi-feather text-light bi-brand-fix me-2"></i>
        <a class="navbar-brand d-none d-sm-block" href="#">
          <span class="me-2">Scratchpad</span>
        </a>
        <ul class="navbar-nav navbar-expand flex-row me-auto">
          <li class="nav-item ps-3 ps-sm-0">
            <RouterLink class="nav-link" activeClass="active" to="/">Editor</RouterLink>
          </li>
          <li class="nav-item ps-3 ps-sm-0">
            <RouterLink class="nav-link" activeClass="active" to="/files">Files</RouterLink>
          </li>
          <li class="nav-item ps-3 ps-sm-0">
            <RouterLink class="nav-link" activeClass="active" to="/settings">Settings</RouterLink>
          </li>
        </ul>
          <div v-if="spinner" class="spinner-border me-3 text-warning" role="status">
            <span class="visually-hidden">Loading...</span>
          </div>
          <div v-else class="me-3 text-muted d-none d-sm-block">
            {{ new Date(scratchStore.editor.lastChange).toLocaleString("en-GB") }}
          </div>
          <i v-if="!connectionStore.connected" class="bi bi-cloud-slash bi-status text-light"></i>
          <i v-else-if="!spinner" class="bi bi-cloud-check bi-status text-light"></i>
          <i v-else-if="scratchStore.editor.source === 'remote'"
             class="bi bi-cloud-download bi-status bi-status-fix text-warning"></i>
          <i v-else-if="scratchStore.editor.source === 'local'"
             class="bi bi-cloud-upload bi-status bi-status-fix text-warning"></i>
        </div>
    </nav>
  </header>
  <main>
    <div class="container-fluid">
      <slot></slot>
    </div>
  </main>
</template>

<style scoped>

.bi-brand-fix {
  font-size: 2.2rem;
  margin-top: -1rem;
  margin-bottom: -1rem;
}

.bi-status-fix {
  position: relative;
  bottom: -4px;
}

.bi-status {
  font-size: xx-large;
  margin-top: -1rem;
  margin-bottom: -1rem;
}

</style>