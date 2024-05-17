<script setup lang="ts">

import {editor} from "monaco-editor";
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'
import {onBeforeUnmount, onMounted, ref, watch} from "vue";
import {useScratchStore} from "@/stores/scratchpad";
import MainContainer from "@/components/MainContainer.vue";

const editorRef = ref<HTMLElement>();
const skip = ref<boolean>(false);
const scratchStore = useScratchStore();
let editorObj: editor.IStandaloneCodeEditor;

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === 'json') {
      return new jsonWorker()
    } else {
      return new editorWorker()
    }
  }
}

watch(
    () => scratchStore.editor.text,
    (newText) => {
      // update editor text field if state changed externally
      if (scratchStore.editor.source === "remote") {
        skip.value = true;
        editorObj.getModel()?.setValue(newText);
      }
    }
)

onMounted(() => {
  editorObj = editor.create(editorRef.value as HTMLElement, {
    value: scratchStore.editor.text,
    language: 'markdown',
  });
  editorObj.onDidChangeModelContent((a) => {
    // ignore changes from state watch above
    if (skip.value === false) {
      const text = editorObj.getModel()?.createSnapshot().read() as string;
      scratchStore.localTextChange(text);
    }
    skip.value = false;
  });
});

onBeforeUnmount(() => {
  editorObj.dispose();
})

</script>

<template>
  <MainContainer>
    <div class="m-3 editor" ref="editorRef"></div>
  </MainContainer>
</template>

<style scoped>
.editor {
  height: 90vh;
  border: 1px solid grey;
}
</style>
