<script setup lang="ts">
import {RouterView} from 'vue-router'
import {useScratchStore} from "@/stores/scratchpad";
import {useConnectionStore} from "@/stores/connection";

const scratchStore = useScratchStore();
const connectionStore = useConnectionStore();

connectionStore.init()
scratchStore.init()
setInterval(scratchStore.check, 1000)

</script>

<template>
  <RouterView></RouterView>
</template>

<style scoped>

</style>
